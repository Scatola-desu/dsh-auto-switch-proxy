/**
 * Environment-level proxy switching and the durable state schema.
 *
 * Modes are separate from servers:
 * - system: whatever proxy the launcher exported
 * - direct: no proxy
 * - direct: no proxy
 * - auto: a loopback rule router chooses direct or one server per request
 *
 * Auto mode's router and rule engine live in `router.js` / `rules.js`; this
 * module owns validation, persistence shape, and the process environment.
 */

import http from 'node:http'
import { randomUUID } from 'node:crypto'

import { AUTOPROXY, SWITCHY } from './rules.js'

export const STATE_VERSION = 2

export const MODES = ['system', 'direct', 'auto']
export const RESERVED_IDS = ['system', 'direct', 'auto']
export const RULE_FORMATS = [SWITCHY, AUTOPROXY]
export const RULE_BEHAVIORS = ['proxy', 'direct']

export const MANAGED_ENV_KEYS = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'NO_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
  'no_proxy',
]

export const TEST_URL = 'https://www.gstatic.com/generate_204'

const PROXY_KEYS = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']
const MAX_SERVERS = 50
const MAX_SUBSCRIPTIONS = 30
const MAX_MANUAL_RULES = 500
const MAX_NAME_LENGTH = 60
const MAX_NO_PROXY_LENGTH = 500
const MAX_PATTERN_LENGTH = 2048
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

export const DEFAULT_SUBSCRIPTION = {
  id: 'sub-switchy-whitelist',
  name: 'SwitchyOmega 白名单',
  url: 'https://raw.githubusercontent.com/entr0pia/SwitchyOmega-Whitelist/master/white-list.sorl',
  format: SWITCHY,
  behavior: 'direct',
  intervalMinutes: 720,
  enabled: true,
  lastUpdatedAt: null,
  lastError: null,
  ruleCount: 0,
}

export function supportsRuntimeProxy() {
  return typeof http.setGlobalProxyFromEnv === 'function'
}

export function runtimeInfo() {
  return {
    supported: supportsRuntimeProxy(),
    node: process.versions.node ?? null,
    electron: process.versions.electron ?? null,
    platform: process.platform,
    method: supportsRuntimeProxy() ? 'setGlobalProxyFromEnv' : null,
  }
}

export function captureEnvironment(env = process.env) {
  const captured = {}
  for (const key of MANAGED_ENV_KEYS) {
    if (typeof env[key] === 'string') captured[key] = env[key]
  }

  // A previous instance could leave our direct-mode sentinel (`NO_PROXY=*`)
  // behind even though it named no proxy. Carrying that into the next launch
  // would make Auto mode bypass its own router, so drop the sentinel when no
  // proxy is configured.
  const hasProxy = PROXY_KEYS.some((key) => typeof captured[key] === 'string' && captured[key].trim() !== '')
  if (!hasProxy) {
    for (const key of ['NO_PROXY', 'no_proxy']) {
      if (typeof captured[key] !== 'string') continue
      const entries = captured[key]
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== '' && entry !== '*')
      if (entries.length === 0) delete captured[key]
      else captured[key] = entries.join(',')
    }
  }

  return captured
}

export function restoreEnvironment(captured, env = process.env) {
  for (const key of MANAGED_ENV_KEYS) delete env[key]
  for (const [key, value] of Object.entries(captured ?? {})) {
    if (typeof value === 'string') env[key] = value
  }
}

export function refreshGlobalProxy() {
  if (!supportsRuntimeProxy()) return false
  http.setGlobalProxyFromEnv()
  return true
}

export function systemProxySummary(captured) {
  const raw =
    captured?.HTTPS_PROXY ??
    captured?.https_proxy ??
    captured?.HTTP_PROXY ??
    captured?.http_proxy ??
    captured?.ALL_PROXY ??
    captured?.all_proxy
  if (typeof raw !== 'string' || raw.trim() === '') return null
  try {
    const url = new URL(raw.trim())
    return {
      host: url.host,
      protocol: url.protocol.replace(':', ''),
      hasCredentials: Boolean(url.username || url.password),
    }
  } catch {
    return { host: raw.trim(), protocol: '', hasCredentials: false }
  }
}

export function displayProxyUrl(raw) {
  try {
    const url = new URL(raw)
    if (url.username || url.password) {
      url.username = url.username ? '***' : ''
      url.password = url.password ? '***' : ''
    }
    return url.href.replace(/\/$/, '')
  } catch {
    return String(raw)
  }
}

function appendLoopback(value) {
  const entries = String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  return [...new Set(['localhost', '127.0.0.1', '::1', ...entries])].join(',')
}

/** Validate one server draft; a bare port means http://127.0.0.1:<port>. */
export function normalizeServerDraft(draft) {
  const name = typeof draft?.name === 'string' ? draft.name.trim() : ''
  const rawUrl = typeof draft?.url === 'string' ? draft.url.trim() : ''
  const noProxy = typeof draft?.noProxy === 'string' ? draft.noProxy.trim() : ''

  if (name === '') return { error: 'nameRequired' }
  if (name.length > MAX_NAME_LENGTH) return { error: 'nameTooLong' }
  if (/[\u0000-\u001f\u007f]/.test(name)) return { error: 'nameInvalid' }
  if (noProxy.length > MAX_NO_PROXY_LENGTH) return { error: 'noProxyTooLong' }

  let candidate = rawUrl
  if (/^\d{1,5}$/.test(candidate)) {
    candidate = `http://127.0.0.1:${candidate}`
  } else if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate) && candidate !== '') {
    candidate = `http://${candidate}`
  }

  let url
  try {
    url = new URL(candidate)
  } catch {
    return { error: 'urlInvalid' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { error: 'urlScheme' }
  if (!url.hostname) return { error: 'urlInvalid' }
  if ((url.pathname && url.pathname !== '/') || url.search || url.hash) return { error: 'urlPath' }

  return {
    value: {
      name,
      url: url.href.replace(/\/$/, ''),
      noProxy,
    },
  }
}

export function validateServers(input) {
  if (!Array.isArray(input)) return { error: 'serversInvalid' }
  if (input.length > MAX_SERVERS) return { error: 'serverLimit' }

  const servers = []
  const names = new Set()
  const ids = new Set()

  for (let index = 0; index < input.length; index += 1) {
    const entry = input[index]
    const normalized = normalizeServerDraft(entry)
    if (normalized.error) return { error: normalized.error, index }

    const nameKey = normalized.value.name.toLocaleLowerCase()
    if (names.has(nameKey)) return { error: 'nameDuplicate', name: normalized.value.name, index }
    names.add(nameKey)

    let id = typeof entry?.id === 'string' && ID_PATTERN.test(entry.id) && !RESERVED_IDS.includes(entry.id)
      ? entry.id
      : `p-${randomUUID().slice(0, 8)}`
    while (ids.has(id) || RESERVED_IDS.includes(id)) {
      id = `p-${randomUUID().slice(0, 8)}`
    }
    ids.add(id)
    servers.push({ id, ...normalized.value })
  }

  return { servers }
}

export function normalizeManualRuleDraft(draft) {
  const pattern = typeof draft?.pattern === 'string' ? draft.pattern.trim() : ''
  const behavior = draft?.behavior === 'direct' ? 'direct' : 'proxy'
  if (pattern === '') return { error: 'ruleRequired' }
  if (pattern.length > MAX_PATTERN_LENGTH) return { error: 'ruleTooLong' }
  return { value: { pattern, behavior } }
}

export function validateManualRules(input) {
  if (!Array.isArray(input)) return { error: 'rulesInvalid' }
  if (input.length > MAX_MANUAL_RULES) return { error: 'ruleLimit' }
  const rules = []
  const seen = new Set()
  for (let index = 0; index < input.length; index += 1) {
    const normalized = normalizeManualRuleDraft(input[index])
    if (normalized.error) return { error: normalized.error, index }
    const key = `${normalized.value.behavior}\u0000${normalized.value.pattern}`
    if (seen.has(key)) continue
    seen.add(key)
    let id = typeof input[index]?.id === 'string' && ID_PATTERN.test(input[index].id) && !RESERVED_IDS.includes(input[index].id)
      ? input[index].id
      : `rule-${randomUUID().slice(0, 8)}`
    rules.push({ id, ...normalized.value })
  }
  return { rules }
}

export function normalizeSubscriptionDraft(draft) {
  const name = typeof draft?.name === 'string' ? draft.name.trim() : ''
  const rawUrl = typeof draft?.url === 'string' ? draft.url.trim() : ''
  const format = RULE_FORMATS.includes(draft?.format) ? draft.format : SWITCHY
  const behavior = draft?.behavior === 'direct' ? 'direct' : 'proxy'
  const interval = Number(draft?.intervalMinutes)

  if (name === '') return { error: 'nameRequired' }
  if (name.length > MAX_NAME_LENGTH) return { error: 'nameTooLong' }
  if (/[\u0000-\u001f\u007f]/.test(name)) return { error: 'nameInvalid' }

  let url
  try {
    url = new URL(rawUrl)
  } catch {
    return { error: 'urlInvalid' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { error: 'urlScheme' }

  return {
    value: {
      name,
      url: url.href,
      format,
      behavior,
      intervalMinutes: Number.isFinite(interval)
        ? Math.min(10080, Math.max(15, Math.round(interval)))
        : 720,
      enabled: draft?.enabled !== false,
    },
  }
}

export function validateSubscriptions(input) {
  if (!Array.isArray(input)) return { error: 'subscriptionsInvalid' }
  if (input.length > MAX_SUBSCRIPTIONS) return { error: 'subscriptionLimit' }
  const subscriptions = []
  const ids = new Set()
  for (let index = 0; index < input.length; index += 1) {
    const entry = input[index]
    const normalized = normalizeSubscriptionDraft(entry)
    if (normalized.error) return { error: normalized.error, index }
    let id = typeof entry?.id === 'string' && ID_PATTERN.test(entry.id) && !RESERVED_IDS.includes(entry.id)
      ? entry.id
      : `sub-${randomUUID().slice(0, 8)}`
    while (ids.has(id)) id = `sub-${randomUUID().slice(0, 8)}`
    ids.add(id)
    subscriptions.push({
      id,
      ...normalized.value,
      lastUpdatedAt: typeof entry?.lastUpdatedAt === 'number' ? entry.lastUpdatedAt : null,
      lastError: typeof entry?.lastError === 'string' ? entry.lastError : null,
      ruleCount: Number.isInteger(entry?.ruleCount) ? entry.ruleCount : 0,
    })
  }
  return { subscriptions }
}

function emptyState() {
  return {
    version: STATE_VERSION,
    servers: [],
    activeMode: 'system',
    autoServerId: null,
    autoDefault: 'proxy',
    manualRules: [],
    subscriptions: [],
    seeded: false,
    revision: 0,
    lastAppliedAt: null,
  }
}

function migrateV1(raw) {
  const validated = validateServers(Array.isArray(raw?.profiles) ? raw.profiles : [])
  const servers = validated.servers ?? []
  const requested = typeof raw?.activeId === 'string' ? raw.activeId : 'system'
  const server = servers.find((entry) => entry.id === requested)
  const activeMode = requested === 'direct' ? 'direct' : requested === 'system' ? 'system' : server ? 'auto' : 'system'
  return {
    ...emptyState(),
    servers,
    activeMode,
    autoServerId: server?.id ?? null,
    revision: Number.isInteger(raw?.revision) ? raw.revision : 0,
    lastAppliedAt: typeof raw?.lastAppliedAt === 'number' ? raw.lastAppliedAt : null,
  }
}

/** Coerce persisted data into the current schema and apply the default seed once. */
export function normalizeState(raw) {
  const base = raw?.version === 1 || Array.isArray(raw?.profiles) ? migrateV1(raw) : emptyState()
  const validatedServers = validateServers(Array.isArray(raw?.servers) ? raw.servers : base.servers)
  const servers = validatedServers.servers ?? base.servers ?? []

  const autoServerId = servers.some((server) => server.id === raw?.autoServerId)
    ? raw.autoServerId
    : base.autoServerId && servers.some((server) => server.id === base.autoServerId)
      ? base.autoServerId
      : servers[0]?.id ?? null

  const requestedMode = typeof raw?.activeMode === 'string' ? raw.activeMode : base.activeMode
  let activeMode = requestedMode === 'fixed'
    ? 'auto'
    : MODES.includes(requestedMode)
      ? requestedMode
      : 'system'
  if (activeMode === 'auto' && autoServerId === null) activeMode = 'system'

  const manual = validateManualRules(Array.isArray(raw?.manualRules) ? raw.manualRules : base.manualRules)
  const subscriptions = validateSubscriptions(
    Array.isArray(raw?.subscriptions) ? raw.subscriptions : base.subscriptions,
  )

  const state = {
    version: STATE_VERSION,
    servers,
    activeMode,
    autoServerId,
    autoDefault: raw?.autoDefault === 'direct' ? 'direct' : 'proxy',
    manualRules: manual.rules ?? [],
    subscriptions: subscriptions.subscriptions ?? [],
    seeded: raw?.seeded === true,
    revision: Number.isInteger(raw?.revision) && raw.revision >= 0 ? raw.revision : base.revision,
    lastAppliedAt:
      typeof raw?.lastAppliedAt === 'number' ? raw.lastAppliedAt : base.lastAppliedAt,
  }

  if (!state.seeded) {
    if (state.subscriptions.length === 0) {
      state.subscriptions.push({ ...DEFAULT_SUBSCRIPTION })
    }
    state.seeded = true
  }

  return state
}

export function activeServer(state) {
  return state.servers.find((server) => server.id === state.autoServerId)
}

/** Whether the environment currently names any usable proxy. */
export function hasProxyEnvironment(env = process.env) {
  return PROXY_KEYS.some((key) => typeof env[key] === 'string' && env[key].trim() !== '')
}

/**
 * Force a direct dispatcher. Clearing the proxy variables and calling
 * `setGlobalProxyFromEnv()` can retain the previous agent when the new
 * environment names no proxy, so `NO_PROXY=*` is what makes this reliable.
 */
export function forceDirectEnvironment(env = process.env) {
  for (const key of PROXY_KEYS) delete env[key]
  env.NO_PROXY = '*'
  env.no_proxy = '*'
  if (!supportsRuntimeProxy()) return

  // With no proxy variable present, setGlobalProxyFromEnv() can leave the
  // previous dispatcher in place. A throwaway proxy makes Node build a new
  // agent; NO_PROXY=* makes every request bypass it, so the result is direct.
  env.HTTP_PROXY = 'http://127.0.0.1:9'
  env.http_proxy = env.HTTP_PROXY
  env.HTTPS_PROXY = env.HTTP_PROXY
  env.https_proxy = env.HTTP_PROXY
  http.setGlobalProxyFromEnv()
  for (const key of PROXY_KEYS) delete env[key]
  // Leave a clean environment behind: the newly installed agent is already
  // direct, and the next activation must not inherit our bypass sentinel.
  delete env.NO_PROXY
  delete env.no_proxy
}

/** Restore the launch environment, but never leave a stale proxy agent behind. */
export function restoreEnvironmentToDirect(baseline, env = process.env) {
  restoreEnvironment(baseline, env)
  if (hasProxyEnvironment(env)) {
    if (supportsRuntimeProxy()) http.setGlobalProxyFromEnv()
  } else {
    forceDirectEnvironment(env)
  }
}

/**
 * Mutate `env` for one mode and rebuild the global dispatcher.
 * @param state durable state
 * @param baseline launch environment snapshot
 * @param routerUrl Auto router URL, or null when Auto is not active
 */
export function applyProxyEnvironment(state, baseline, routerUrl, env = process.env) {
  if (!supportsRuntimeProxy()) {
    const error = new Error('http.setGlobalProxyFromEnv is not available in this runtime')
    error.code = 'unsupportedRuntime'
    throw error
  }

  restoreEnvironment(baseline, env)

  if (state.activeMode === 'direct') {
    forceDirectEnvironment(env)
    return { activeMode: state.activeMode }
  }

  if (state.activeMode === 'system' && !hasProxyEnvironment(env)) {
    forceDirectEnvironment(env)
    return { activeMode: state.activeMode }
  }

  if (state.activeMode === 'auto') {
    if (!routerUrl) {
      const error = new Error('Auto mode router is not running')
      error.code = 'autoUnavailable'
      throw error
    }
    env.HTTP_PROXY = routerUrl
    env.http_proxy = routerUrl
    env.HTTPS_PROXY = routerUrl
    env.https_proxy = routerUrl
    env.NO_PROXY = appendLoopback(baseline.NO_PROXY ?? baseline.no_proxy ?? '')
    env.no_proxy = env.NO_PROXY
  }

  http.setGlobalProxyFromEnv()
  return { activeMode: state.activeMode }
}

export function publicState(state, baseline, extra = {}) {
  return {
    ...runtimeInfo(),
    version: state.version,
    activeMode: state.activeMode,
    servers: state.servers,
    autoServerId: state.autoServerId,
    autoDefault: state.autoDefault,
    manualRules: state.manualRules,
    subscriptions: state.subscriptions,
    revision: state.revision,
    lastAppliedAt: state.lastAppliedAt,
    system: systemProxySummary(baseline),
    testUrl: TEST_URL,
    ...extra,
  }
}
