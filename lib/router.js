/**
 * Loopback HTTP proxy used by Auto mode.
 *
 * undici (and therefore global `fetch`) tunnels every destination through
 * CONNECT, so this router only needs two paths: direct tunneling to the
 * target, or chaining CONNECT through the selected upstream proxy. Plain
 * absolute-form HTTP is forwarded too, for clients that use it.
 *
 * The router never consults the process proxy environment for its own
 * connections: it uses `node:net`/`node:http` directly, which keeps the
 * decision loop closed.
 */

import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'

const CONNECT_TIMEOUT_MS = 20000
const MAX_HEADER_BYTES = 64 * 1024

function parseUpstream(server) {
  if (!server || typeof server.url !== 'string') return null
  let url
  try {
    url = new URL(server.url)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80))
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null
  let auth = null
  if (url.username || url.password) {
    const username = decodeURIComponent(url.username)
    const password = decodeURIComponent(url.password)
    auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
  }
  return {
    protocol: url.protocol,
    hostname: stripBrackets(url.hostname),
    port,
    auth,
  }
}

function stripBrackets(host) {
  const value = String(host ?? '')
  return value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value
}

function authorityOf(target) {
  const host = stripBrackets(target.hostname)
  const port = Number(target.port || (target.protocol === 'https:' ? 443 : 80))
  return { host, port }
}

function parseAuthority(value) {
  const text = String(value ?? '').trim()
  if (text.startsWith('[')) {
    const end = text.indexOf(']')
    if (end === -1) return null
    const host = text.slice(1, end)
    const port = Number(text.slice(end + 1).replace(/^:/, '') || 443)
    return { host, port }
  }
  const colon = text.lastIndexOf(':')
  if (colon === -1) return { host: text, port: 443 }
  const host = text.slice(0, colon)
  const port = Number(text.slice(colon + 1) || 443)
  return { host, port }
}

function writeBadGateway(client, message) {
  if (client.destroyed) return
  client.end(`HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(message)}\r\nConnection: close\r\n\r\n${message}`)
}

function upstreamRequestOptions(upstream, targetUrl) {
  return {
    protocol: upstream.protocol,
    hostname: upstream.hostname,
    port: upstream.port,
    method: 'GET',
    headers: {
      host: targetUrl.host,
      ...(upstream.auth ? { 'proxy-authorization': upstream.auth } : {}),
    },
  }
}

/** Open a CONNECT tunnel through an HTTP(S) upstream proxy. */
function tunnelViaProxy(upstream, host, port, client, head, onFailure) {
  const socket = upstream.protocol === 'https:'
    ? tls.connect({ host: upstream.hostname, port: upstream.port, servername: upstream.hostname })
    : net.connect(upstream.port, upstream.hostname)

  let buffered = Buffer.alloc(0)
  let established = false
  const timer = setTimeout(() => {
    if (!established) {
      socket.destroy()
      onFailure('upstream CONNECT timeout')
    }
  }, CONNECT_TIMEOUT_MS)
  timer.unref?.()

  const cleanup = () => {
    clearTimeout(timer)
  }

  const sendConnect = () => {
    const lines = [
      `CONNECT ${host}:${port} HTTP/1.1`,
      `Host: ${host}:${port}`,
      ...(upstream.auth ? [`Proxy-Authorization: ${upstream.auth}`] : []),
      '',
      '',
    ]
    socket.write(lines.join('\r\n'))
  }

  if (upstream.protocol === 'https:') {
    socket.once('secureConnect', sendConnect)
  } else {
    socket.once('connect', sendConnect)
  }

  const onData = (chunk) => {
    buffered = Buffer.concat([buffered, chunk])
    const end = buffered.indexOf('\r\n\r\n')
    if (end === -1) {
      if (buffered.length > MAX_HEADER_BYTES) {
        cleanup()
        socket.destroy()
        onFailure('upstream CONNECT response too large')
      }
      return
    }

    cleanup()
    const header = buffered.subarray(0, end).toString('latin1')
    const remainder = buffered.subarray(end + 4)
    const status = Number(header.split(/\s+/, 3)[1])
    if (status !== 200) {
      socket.destroy()
      onFailure(`upstream CONNECT returned ${Number.isFinite(status) ? status : 'an invalid status'}`)
      return
    }

    established = true
    socket.off('data', onData)
    client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
    if (head.length) socket.write(head)
    if (remainder.length) client.write(remainder)
    socket.pipe(client)
    client.pipe(socket)
  }

  socket.on('data', onData)
  socket.on('error', (error) => {
    cleanup()
    if (!established) onFailure(error?.message ?? String(error))
  })
  socket.on('close', cleanup)
  return socket
}

/**
 * Start the loopback router.
 * @param options.decide - `({host, port, url}) => 'direct' | 'proxy'`
 * @param options.getUpstream - returns the active server object, or null
 */
export async function createAutoRouter({ decide, getUpstream }) {
  const sockets = new Set()
  const forcedProxyHosts = new Set()
  const stats = { requests: 0, connect: 0, direct: 0, proxy: 0 }

  const track = (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    socket.on('error', () => socket.destroy())
    return socket
  }

  const route = (host, port, url) => {
    stats.requests += 1
    if (forcedProxyHosts.has(host)) {
      stats.proxy += 1
      return 'proxy'
    }
    const decision = decide({ host, port, url }) === 'direct' ? 'direct' : 'proxy'
    if (decision === 'direct') stats.direct += 1
    else stats.proxy += 1
    return decision
  }

  const server = http.createServer((req, res) => {
    const raw = String(req.url ?? '')
    let target
    try {
      target = /^https?:\/\//i.test(raw)
        ? new URL(raw)
        : new URL(`http://${req.headers.host ?? 'localhost'}${raw}`)
    } catch {
      res.statusCode = 400
      res.end('invalid proxy target')
      return
    }

    const { host, port } = authorityOf(target)
    const upstream = parseUpstream(getUpstream())
    const decision = route(host, port, target.href)
    const useProxy = decision === 'proxy' && upstream !== null

    const headers = { ...req.headers, host: target.host }
    delete headers['proxy-connection']
    if (useProxy && upstream.auth) headers['proxy-authorization'] = upstream.auth
    else delete headers['proxy-authorization']

    const options = useProxy
      ? {
          protocol: upstream.protocol,
          hostname: upstream.hostname,
          port: upstream.port,
          method: req.method,
          path: target.href,
          headers,
        }
      : {
          protocol: target.protocol,
          hostname: host,
          port,
          method: req.method,
          path: `${target.pathname}${target.search}`,
          headers,
        }

    const transport = options.protocol === 'https:' ? https : http
    const upstreamRequest = transport.request(options, (upstreamResponse) => {
      res.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers)
      upstreamResponse.pipe(res)
    })
    upstreamRequest.on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 502
        res.end('proxy request failed')
      } else {
        res.destroy()
      }
    })
    req.pipe(upstreamRequest)
  })

  server.on('connect', (req, clientSocket, head) => {
    stats.connect += 1
    const authority = parseAuthority(req.url)
    if (!authority) {
      writeBadGateway(clientSocket, 'invalid CONNECT target')
      return
    }
    const { host, port } = authority
    const upstream = parseUpstream(getUpstream())
    const decision = route(host, port, `https://${host}:${port}/`)

    if (decision === 'proxy' && upstream !== null) {
      const socket = tunnelViaProxy(upstream, host, port, clientSocket, head, (message) => {
        writeBadGateway(clientSocket, message)
      })
      if (socket) track(socket)
      return
    }

    let connected = false
    const targetSocket = track(net.connect(port, host, () => {
      connected = true
      clearTimeout(connectTimer)
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      if (head.length) targetSocket.write(head)
      targetSocket.pipe(clientSocket)
      clientSocket.pipe(targetSocket)
    }))
    const connectTimer = setTimeout(() => {
      if (connected) return
      targetSocket.destroy()
      writeBadGateway(clientSocket, 'direct connection timeout')
    }, CONNECT_TIMEOUT_MS)
    connectTimer.unref?.()
    targetSocket.on('error', (error) => {
      clearTimeout(connectTimer)
      writeBadGateway(clientSocket, error?.message ?? 'direct connection failed')
    })
  })

  server.on('connection', (socket) => {
    track(socket)
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    stats,
    forceProxy(host, enabled = true) {
      const normalized = String(host ?? '').toLowerCase()
      if (enabled) forcedProxyHosts.add(normalized)
      else forcedProxyHosts.delete(normalized)
    },
    async close() {
      for (const socket of sockets) socket.destroy()
      sockets.clear()
      await new Promise((resolve) => server.close(resolve))
    },
  }
}
