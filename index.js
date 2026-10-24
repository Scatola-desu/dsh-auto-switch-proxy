/**
 * Proxy Switchy — host half.
 *
 * Modes are separate from servers. `auto` starts a loopback router that
 * evaluates the manual rules and subscription lists per request, sending the
 * request either directly or through the selected server.
 */

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import { createAutoRules, compileList } from './lib/rules.js'
import { createAutoRouter } from './lib/router.js'
import {
  applyProxyEnvironment,
  activeServer,
  captureEnvironment,
  MODES,
  normalizeState,
  publicState,
  restoreEnvironmentToDirect,
  supportsRuntimeProxy,
  TEST_URL,
  validateManualRules,
  validateServers,
  validateSubscriptions,
} from './lib/switch.js'

const ROUTE_PREFIX = '/proxy-switchy'
const MAX_BODY_BYTES = 64 * 1024
const TEST_TIMEOUT_MS = 8000
const SUBSCRIPTION_TIMEOUT_MS = 90000
const MAX_SUBSCRIPTION_BYTES = 5 * 1024 * 1024
const UPDATE_TICK_MS = 60_000

export const inject = ['webServer', 'connection']

function harnessHome() {
  if (process.env.DSH_HOME) return process.env.DSH_HOME
  const profileDir = process.env.DSH_PROFILE_DIR
  if (profileDir) return dirname(dirname(profileDir))
  return join(homedir(), '.dsh')
}

function statePath() {
  return join(harnessHome(), 'proxy-switchy', 'state.json')
}

function legacyStatePath() {
  return join(homedir(), 'proxy-switchy', 'state.json')
}

function rulesDirectory() {
  return join(harnessHome(), 'proxy-switchy', 'rules')
}

function ruleCachePath(id) {
  return join(rulesDirectory(), `${id}.txt`)
}

function failure(code, message, status) {
  const error = new Error(message)
  error.code = code
  error.status = status
  return error
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function errorPayload(error) {
  return {
    code: typeof error?.code === 'string' ? error.code : 'applyFailed',
    message: error instanceof Error ? error.message : String(error),
  }
}

async function readJsonBody(req) {
  const mediaType = String(req.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase()
  if (mediaType !== 'application/json') {
    throw failure('badRequest', 'content-type must be application/json', 415)
  }

  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) {
      req.resume()
      throw failure('badRequest', 'request body is too large', 413)
    }
    chunks.push(chunk)
  }

  let parsed
  try {
    parsed = JSON.parse(Buffer.concat(chunks, size).toString('utf8'))
  } catch {
    throw failure('badRequest', 'request body must be valid JSON', 400)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw failure('badRequest', 'request body must be a JSON object', 400)
  }
  return parsed
}

function isDue(subscription, now = Date.now()) {
  if (subscription.lastUpdatedAt === null) return true
  const interval = (subscription.intervalMinutes ?? 720) * 60_000
  return now - subscription.lastUpdatedAt >= interval
}

function subscriptionFetchUrls(rawUrl) {
  const urls = [rawUrl]
  try {
    const url = new URL(rawUrl)
    if (url.hostname === 'raw.githubusercontent.com') {
      urls.push(`https://ghproxy.net/${rawUrl}`)
    }
  } catch {
    // Validation already rejected this; keep the raw URL as the only attempt.
  }
  return [...new Set(urls)]
}

export function apply(ctx) {
  const baseline = captureEnvironment()
  const file = statePath()

  let state = normalizeState(undefined)
  let cache = new Map()
  let autoRules = createAutoRules({ subscriptions: [], manualRules: [], defaultBehavior: 'proxy' })
  let router = null
  let routerStarting = null
  let lastError = null
  let envDirty = false
  let updating = false
  let queue = Promise.resolve()
  let updateTimer = null

  const persist = async () => {
    await mkdir(dirname(file), { recursive: true })
    const temporary = `${file}.tmp`
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    await rename(temporary, file)
  }

  const rebuildRules = () => {
    const subscriptions = state.subscriptions.map((subscription) => ({
      ...subscription,
      content: cache.get(subscription.id) ?? '',
    }))
    autoRules = createAutoRules({
      subscriptions,
      manualRules: state.manualRules,
      defaultBehavior: state.autoDefault,
    })
  }

  const loadCache = async () => {
    await mkdir(rulesDirectory(), { recursive: true })
    for (const subscription of state.subscriptions) {
      try {
        const text = await readFile(ruleCachePath(subscription.id), 'utf8')
        cache.set(subscription.id, text)
        const compiled = compileList(subscription.format, subscription.behavior, text)
        subscription.ruleCount = compiled.count
        if (subscription.lastUpdatedAt === null) subscription.lastUpdatedAt = Date.now()
      } catch (error) {
        if (error?.code !== 'ENOENT') {
          console.warn('[proxy-switchy] could not read rule cache:', error?.message ?? error)
        }
      }
    }
  }

  const ensureRouter = async () => {
    if (router) return router
    if (routerStarting) return routerStarting
    routerStarting = (async () => {
      const started = await createAutoRouter({
        decide: (request) => autoRules.decide(request),
        getUpstream: () => activeServer(state),
      })
      router = started
      return started
    })()
    try {
      return await routerStarting
    } finally {
      routerStarting = null
    }
  }

  const stopRouter = async () => {
    if (!router) return
    const current = router
    router = null
    await current.close()
  }

  const applyState = async (next, { persist: shouldPersist = true } = {}) => {
    let target = next
    let autoRouter = null
    let fallbackError = null

    if (target.activeMode === 'auto') {
      try {
        autoRouter = await ensureRouter()
      } catch (error) {
        fallbackError = error
        target = { ...target, activeMode: 'system' }
      }
    }

    state = { ...target, lastAppliedAt: Date.now() }
    if (target.activeMode === 'auto') {
      applyProxyEnvironment(state, baseline, autoRouter.url)
    } else {
      // Put the process on the safe route before closing the old router, so a
      // slow shutdown can never leave requests pointed at a dead listener.
      applyProxyEnvironment(state, baseline, null)
      await stopRouter()
    }
    envDirty = true
    lastError = fallbackError ? errorPayload(fallbackError) : null
    if (shouldPersist) await persist()
  }

  const restore = () => {
    if (!envDirty) return
    envDirty = false
    try {
      restoreEnvironmentToDirect(baseline)
    } catch (error) {
      console.warn('[proxy-switchy] could not restore the global proxy dispatcher:', error?.message ?? error)
    }
  }

  const fetchSubscription = async (subscription, { force = false } = {}) => {
    const urls = subscriptionFetchUrls(subscription.url)
    const forced = []
    if (router) {
      for (const raw of urls) {
        try {
          const host = new URL(raw).hostname
          router.forceProxy(host, true)
          forced.push(host)
        } catch {
          // Ignore an unparseable mirror; the primary URL remains.
        }
      }
    }

    let text = null
    let lastFailure = null
    try {
      for (const url of urls) {
        try {
          const response = await fetch(url, {
            cache: 'no-store',
            redirect: 'follow',
            signal: AbortSignal.timeout(SUBSCRIPTION_TIMEOUT_MS),
            headers: { accept: 'text/plain, text/*, */*;q=0.8' },
          })
          if (!response.ok) {
            lastFailure = new Error(`HTTP ${response.status} from ${new URL(url).host}`)
            continue
          }
          const body = await response.text()
          if (body.length > MAX_SUBSCRIPTION_BYTES) {
            lastFailure = new Error('rule list is larger than 5 MiB')
            continue
          }
          text = body
          break
        } catch (error) {
          lastFailure = error
        }
      }

      if (text === null) {
        throw lastFailure ?? new Error('rule list fetch failed')
      }

      const compiled = compileList(subscription.format, subscription.behavior, text)
      if (compiled.count === 0) {
        throw new Error('rule list has no usable rules')
      }

      await mkdir(rulesDirectory(), { recursive: true })
      const temporary = `${ruleCachePath(subscription.id)}.tmp`
      await writeFile(temporary, text, 'utf8')
      await rename(temporary, ruleCachePath(subscription.id))
      cache.set(subscription.id, text)
      subscription.lastUpdatedAt = Date.now()
      subscription.lastError = null
      subscription.ruleCount = compiled.count
      rebuildRules()
      return { ok: true, count: compiled.count }
    } catch (error) {
      subscription.lastError = error instanceof Error ? error.message : String(error)
      return { ok: false, error: subscription.lastError }
    } finally {
      for (const host of forced) router?.forceProxy(host, false)
    }
  }

  const refreshAll = async ({ force = false, id = null } = {}) => {
    if (updating) return
    updating = true
    try {
      const targets = state.subscriptions.filter((subscription) => {
        if (!subscription.enabled) return false
        if (id !== null && subscription.id !== id) return false
        return force || id !== null || isDue(subscription)
      })
      for (const subscription of targets) {
        await fetchSubscription(subscription, { force })
      }
      if (targets.length > 0) {
        state = { ...state, revision: state.revision + 1 }
        await persist()
      }
    } finally {
      updating = false
    }
  }

  const scheduleRefresh = () => {
    updateTimer = setInterval(() => {
      if (!state.subscriptions.some((subscription) => subscription.enabled && isDue(subscription))) return
      void refreshAll({ force: false }).catch((error) => {
        console.warn('[proxy-switchy] scheduled rule refresh failed:', error?.message ?? error)
      })
    }, UPDATE_TICK_MS)
    updateTimer.unref?.()
  }

  const ready = (async () => {
    let loaded = false
    try {
      const text = await readFile(file, 'utf8')
      state = normalizeState(JSON.parse(text))
      loaded = true
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        console.warn('[proxy-switchy] could not read saved state:', error?.message ?? error)
        return
      }
    }

    if (!loaded) {
      try {
        const text = await readFile(legacyStatePath(), 'utf8')
        state = normalizeState(JSON.parse(text))
        loaded = true
      } catch (legacyError) {
        if (legacyError?.code !== 'ENOENT') {
          console.warn('[proxy-switchy] could not read legacy state:', legacyError?.message ?? legacyError)
          return
        }
        state = normalizeState(undefined)
        loaded = true
      }
    }

    if (!loaded) return
    await loadCache()
    rebuildRules()

    try {
      // Apply even System at startup: this clears any dispatcher a previous
      // instance left behind and makes the launch route explicit.
      await applyState(state, { persist: true })
    } catch (error) {
      lastError = errorPayload(error)
      console.warn('[proxy-switchy] saved mode could not be applied:', lastError.message)
    }

    scheduleRefresh()
    if (state.subscriptions.some((subscription) => subscription.enabled && isDue(subscription))) {
      void refreshAll({ force: false }).catch((error) => {
        console.warn('[proxy-switchy] initial rule refresh failed:', error?.message ?? error)
      })
    }
  })()

  const serialize = (operation) => {
    const next = queue.then(operation, operation)
    queue = next.catch(() => {})
    return next
  }

  const snapshot = () =>
    publicState(state, baseline, {
      lastError,
      auto: {
        ruleCount: autoRules.count,
        defaultBehavior: state.autoDefault,
        routerActive: router !== null,
        routerPort: router?.port ?? null,
        updating,
        cacheBytes: [...cache.values()].reduce((total, value) => total + value.length, 0),
      },
    })

  const updateServerReferences = (next) => {
    const ids = new Set(next.servers.map((server) => server.id))
    const autoServerId = ids.has(next.autoServerId) ? next.autoServerId : next.servers[0]?.id ?? null
    return { ...next, autoServerId }
  }

  const route = async (req, res) => {
    const rejection = Reflect.get(ctx, 'connection')?.requestRejection?.(req)
    if (rejection !== undefined) {
      res.statusCode = rejection
      res.end()
      return
    }

    const pathname = new URL(String(req.url ?? '/'), 'http://localhost').pathname
    const action = pathname === ROUTE_PREFIX
      ? ''
      : pathname.startsWith(`${ROUTE_PREFIX}/`)
        ? pathname.slice(ROUTE_PREFIX.length + 1)
        : ''

    try {
      await ready

      if (action === 'state') {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('allow', 'GET')
          res.end()
          return
        }
        sendJson(res, 200, { state: snapshot() })
        return
      }

      if (action === 'test') {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('allow', 'POST')
          res.end()
          return
        }
        const started = Date.now()
        try {
          const response = await fetch(TEST_URL, {
            redirect: 'manual',
            cache: 'no-store',
            signal: AbortSignal.timeout(TEST_TIMEOUT_MS),
          })
          sendJson(res, 200, {
            state: snapshot(),
            result: {
              ok: response.status >= 200 && response.status < 400,
              status: response.status,
              latencyMs: Date.now() - started,
            },
          })
        } catch (error) {
          sendJson(res, 200, {
            state: snapshot(),
            result: {
              ok: false,
              status: null,
              latencyMs: Date.now() - started,
              message: error?.name === 'TimeoutError' ? 'timeout' : error?.message ?? String(error),
            },
          })
        }
        return
      }

      if (action === 'mode') {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('allow', 'POST')
          res.end()
          return
        }
        const body = await readJsonBody(req)
        const mode = typeof body.mode === 'string' ? body.mode : ''
        if (!MODES.includes(mode)) throw failure('badRequest', 'unknown mode', 400)
        const serverId = typeof body.serverId === 'string' ? body.serverId : null

        await serialize(async () => {
          const next = { ...state, activeMode: mode }
          if (mode === 'auto') {
            const id = serverId ?? state.autoServerId
            if (!state.servers.some((server) => server.id === id)) {
              throw failure('serverRequired', 'auto mode needs a server', 400)
            }
            next.autoServerId = id
          }
          next.revision = state.revision + 1
          await applyState(next)
        })
        sendJson(res, 200, { state: snapshot() })
        return
      }

      if (action === 'servers') {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('allow', 'POST')
          res.end()
          return
        }
        const body = await readJsonBody(req)
        const validated = validateServers(body.servers)
        if (validated.error) {
          const error = failure(validated.error, `invalid servers: ${validated.error}`, 400)
          error.details = validated
          throw error
        }
        await serialize(async () => {
          let next = updateServerReferences({ ...state, servers: validated.servers })
          if (next.activeMode === 'auto' && next.autoServerId === null) next.activeMode = 'system'
          next.revision = state.revision + 1
          await applyState(next)
        })
        sendJson(res, 200, { state: snapshot() })
        return
      }

      if (action === 'subscriptions') {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('allow', 'POST')
          res.end()
          return
        }
        const body = await readJsonBody(req)
        const validated = validateSubscriptions(body.subscriptions)
        if (validated.error) {
          const error = failure(validated.error, `invalid subscriptions: ${validated.error}`, 400)
          error.details = validated
          throw error
        }
        await serialize(async () => {
          const nextSubscriptions = validated.subscriptions
          const nextIds = new Set(nextSubscriptions.map((subscription) => subscription.id))
          for (const subscription of state.subscriptions) {
            if (!nextIds.has(subscription.id)) {
              cache.delete(subscription.id)
              await rm(ruleCachePath(subscription.id), { force: true }).catch(() => {})
            }
          }
          state = {
            ...state,
            subscriptions: nextSubscriptions,
            revision: state.revision + 1,
          }
          rebuildRules()
          await persist()
        })
        void refreshAll({ force: false }).catch(() => {})
        sendJson(res, 200, { state: snapshot() })
        return
      }

      if (action === 'manual-rules') {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('allow', 'POST')
          res.end()
          return
        }
        const body = await readJsonBody(req)
        const validated = validateManualRules(body.rules)
        if (validated.error) {
          const error = failure(validated.error, `invalid manual rules: ${validated.error}`, 400)
          error.details = validated
          throw error
        }
        await serialize(async () => {
          state = {
            ...state,
            manualRules: validated.rules,
            revision: state.revision + 1,
          }
          rebuildRules()
          await persist()
        })
        sendJson(res, 200, { state: snapshot() })
        return
      }

      if (action === 'auto') {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('allow', 'POST')
          res.end()
          return
        }
        const body = await readJsonBody(req)
        const defaultBehavior = body.defaultBehavior === 'direct' ? 'direct' : 'proxy'
        await serialize(async () => {
          state = {
            ...state,
            autoDefault: defaultBehavior,
            revision: state.revision + 1,
          }
          rebuildRules()
          await persist()
        })
        sendJson(res, 200, { state: snapshot() })
        return
      }

      if (action === 'refresh') {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('allow', 'POST')
          res.end()
          return
        }
        const body = await readJsonBody(req)
        const id = typeof body.id === 'string' ? body.id : null
        if (id !== null && !state.subscriptions.some((subscription) => subscription.id === id)) {
          throw failure('unknownSubscription', 'unknown subscription', 404)
        }
        await refreshAll({ force: true, id })
        sendJson(res, 200, { state: snapshot() })
        return
      }

      sendJson(res, 404, { error: { code: 'notFound', message: `unknown route: ${pathname}` } })
    } catch (error) {
      if (res.headersSent) {
        res.end()
        return
      }
      const status = typeof error?.status === 'number' ? error.status : 500
      const payload = errorPayload(error)
      if (error?.details) payload.details = error.details
      sendJson(res, status, {
        error: payload,
        state: snapshot(),
      })
    }
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE_PREFIX,
    handler: route,
  }), `proxy-switchy: ${ROUTE_PREFIX}/*`)

  ctx.effect(() => () => {
    if (updateTimer) clearInterval(updateTimer)
    restore()
    void stopRouter()
  }, 'proxy-switchy: restore environment and stop the auto router')
}
