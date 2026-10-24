/**
 * Auto-switch rule parsing and matching.
 *
 * Two list formats are accepted:
 * - `switchy`: SwitchyOmega `.sorl` condition lists. Every pattern has the
 *   subscription's own behavior; the shipped whitelist assigns `direct`.
 * - `autoproxy`: AutoProxy / GFW lists. `||domain` means proxy,
 *   `@@||domain` means direct, `|prefix` and `/regex/` are supported.
 *
 * Matching is host-first because an HTTPS CONNECT carries no path. URL
 * prefixes and regexes still see a synthetic URL for HTTP requests; for
 * HTTPS they can only match the host.
 */

import { domainToASCII } from 'node:url'

export const SWITCHY = 'switchy'
export const AUTOPROXY = 'autoproxy'

const MAX_PATTERN_LENGTH = 2048

/** Lowercase, strip brackets/port, and convert an IDN host to ASCII. */
export function normalizeHost(value) {
  let host = String(value ?? '').trim().toLowerCase()
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1)
  const colon = host.lastIndexOf(':')
  if (colon > 0 && !host.includes('::') && /^\d+$/.test(host.slice(colon + 1))) {
    host = host.slice(0, colon)
  }
  host = host.replace(/\.$/, '')
  try {
    return domainToASCII(host) || host
  } catch {
    return host
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function globSource(glob) {
  return glob
    .split('')
    .map((char) => {
      if (char === '*') return '.*'
      if (char === '?') return '.'
      return escapeRegExp(char)
    })
    .join('')
}

function suffixMatch(host, suffix) {
  if (host === suffix) return true
  return host.endsWith(`.${suffix}`)
}

function matchSuffixSet(host, set) {
  if (set.size === 0) return false
  if (set.has(host)) return true
  let index = host.indexOf('.')
  while (index !== -1) {
    if (set.has(host.slice(index + 1))) return true
    index = host.indexOf('.', index + 1)
  }
  return false
}

class RuleMatcher {
  constructor() {
    this.directSuffixes = new Set()
    this.proxySuffixes = new Set()
    this.directPrefixes = []
    this.proxyPrefixes = []
    this.directGlobs = []
    this.proxyGlobs = []
    this.directRegexes = []
    this.proxyRegexes = []
    this.count = 0
  }

  add(pattern, behavior) {
    const direct = behavior === 'direct'
    if (this.#addNormalized(pattern, direct)) this.count += 1
  }

  #addNormalized(pattern, direct) {
    let value = String(pattern ?? '').trim()
    if (value === '' || value.length > MAX_PATTERN_LENGTH) return false
    if (/^[;!#[]/.test(value)) return false

    if (value.startsWith('@@')) {
      direct = true
      value = value.slice(2).trim()
      if (value === '') return false
    }

    if (value.startsWith('||')) {
      value = value.slice(2)
    } else if (value.startsWith('|')) {
      value = value.slice(1)
      return this.#addPrefix(value, direct)
    }

    value = value.replace(/\^$/, '').replace(/\|$/, '')
    if (value === '') return false

    if (value.startsWith('/') && value.endsWith('/') && value.length > 2) {
      try {
        const regex = new RegExp(value.slice(1, -1), 'i')
        ;(direct ? this.directRegexes : this.proxyRegexes).push(regex)
        return true
      } catch {
        return false
      }
    }

    if (value.includes('://')) {
      if (value.includes('*')) {
        try {
          const regex = new RegExp(`^${globSource(value)}$`, 'i')
          ;(direct ? this.directGlobs : this.proxyGlobs).push(regex)
          return true
        } catch {
          return false
        }
      }
      return this.#addPrefix(value, direct)
    }

    if (value.startsWith('*.')) {
      const suffix = normalizeHost(value.slice(2).split('/')[0])
      if (suffix === '' || suffix.includes('*')) return false
      ;(direct ? this.directSuffixes : this.proxySuffixes).add(suffix)
      return true
    }

    if (value.includes('*') || value.includes('?')) {
      try {
        const regex = new RegExp(`^${globSource(value)}$`, 'i')
        ;(direct ? this.directGlobs : this.proxyGlobs).push(regex)
        return true
      } catch {
        return false
      }
    }

    const suffix = normalizeHost(value.split('/')[0])
    if (suffix === '') return false
    ;(direct ? this.directSuffixes : this.proxySuffixes).add(suffix)
    return true
  }

  #addPrefix(value, direct) {
    let prefix = value
    if (prefix.includes('*')) {
      try {
        const regex = new RegExp(`^${globSource(prefix)}`, 'i')
        ;(direct ? this.directGlobs : this.proxyGlobs).push(regex)
        return true
      } catch {
        return false
      }
    }
    ;(direct ? this.directPrefixes : this.proxyPrefixes).push(prefix.toLowerCase())
    return true
  }

  #matchesBucket(host, url, kind) {
    if (kind === 'direct') {
      if (matchSuffixSet(host, this.directSuffixes)) return true
      if (this.directPrefixes.some((prefix) => url.startsWith(prefix))) return true
      if (this.directGlobs.some((regex) => regex.test(host) || regex.test(url))) return true
      if (this.directRegexes.some((regex) => regex.test(url) || regex.test(host))) return true
      return false
    }
    if (matchSuffixSet(host, this.proxySuffixes)) return true
    if (this.proxyPrefixes.some((prefix) => url.startsWith(prefix))) return true
    if (this.proxyGlobs.some((regex) => regex.test(host) || regex.test(url))) return true
    if (this.proxyRegexes.some((regex) => regex.test(url) || regex.test(host))) return true
    return false
  }

  /** Direct exceptions win inside one list, then proxy rules. */
  match(host, url) {
    if (this.#matchesBucket(host, url, 'direct')) return 'direct'
    if (this.#matchesBucket(host, url, 'proxy')) return 'proxy'
    return null
  }
}

/**
 * Compile one rule list.
 * @returns `{ matcher, count }`; malformed lines are skipped.
 */
export function compileList(format, behavior, text, options = {}) {
  const matcher = new RuleMatcher()
  const source = typeof text === 'string' ? text : ''
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') continue
    if (line.startsWith('[')) continue
    if (line.startsWith(';') || line.startsWith('!') || line.startsWith('#')) continue

    let lineBehavior = behavior
    if (format === AUTOPROXY) {
      if (line.startsWith('@@')) {
        lineBehavior = 'direct'
      } else if (
        options.explicitBehavior !== true &&
        (line.startsWith('||') || line.startsWith('|') || line.startsWith('/'))
      ) {
        lineBehavior = 'proxy'
      }
    }
    matcher.add(line, lineBehavior)
  }
  return { matcher, count: matcher.count }
}

/**
 * Build the evaluator Auto mode uses.
 * Manual rules are checked in order first, then each enabled subscription in
 * order, then the configured default.
 */
export function createAutoRules({ subscriptions, manualRules, defaultBehavior }) {
  const sources = []
  let count = 0

  for (const rule of Array.isArray(manualRules) ? manualRules : []) {
    const pattern = typeof rule?.pattern === 'string' ? rule.pattern : ''
    if (pattern.trim() === '') continue
    const behavior = rule?.behavior === 'direct' ? 'direct' : 'proxy'
    const compiled = compileList(AUTOPROXY, behavior, pattern, { explicitBehavior: true })
    if (compiled.count > 0) {
      sources.push({ kind: 'manual', matcher: compiled.matcher, behavior })
      count += compiled.count
    }
  }

  for (const subscription of Array.isArray(subscriptions) ? subscriptions : []) {
    if (subscription?.enabled === false) continue
    const compiled = compileList(
      subscription?.format,
      subscription?.behavior === 'direct' ? 'direct' : 'proxy',
      subscription?.content ?? '',
    )
    if (compiled.count > 0) {
      sources.push({ kind: 'subscription', matcher: compiled.matcher, behavior: null })
      count += compiled.count
    }
  }

  const fallback = defaultBehavior === 'direct' ? 'direct' : 'proxy'

  return {
    count,
    sourceCount: sources.length,
    defaultBehavior: fallback,
    decide({ host: rawHost, url: rawUrl }) {
      const host = normalizeHost(rawHost)
      const url = String(rawUrl ?? '')
      for (const source of sources) {
        const found = source.matcher.match(host, url)
        if (found !== null) return found
      }
      return fallback
    },
  }
}
