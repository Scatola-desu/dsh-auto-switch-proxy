# dsh-auto-switch-proxy

A rule-based **Auto Switch** proxy for [DeepSeek Harness](https://github.com/deepseek-ai) (DSH). It hot-switches the Host process's outbound route per request instead of sending everything through one fixed proxy.

No restart. No extra runtime dependencies.

## Auto Switch, not a fixed proxy

Most DSH proxy plugins apply a single fixed upstream to all Host traffic. This plugin starts a loopback router and evaluates rules for each request, so the model endpoint, package registries, and internal services can use different routes at the same time. A fixed server is still one click away, but it is no longer the only option.

## Features

- **System / Direct / Auto Switch** modes. The server list is separate from the route list.
- **Auto Switch**: a loopback router evaluates manual rules and subscriptions per request, then tunnels directly or through the selected server.
- **Rule subscriptions** in two formats:
  - SwitchyOmega `.sorl` condition lists
  - AutoProxy / GFW lists (`||domain`, `@@||domain`, `|prefix`, `/regex/`)
- **Periodic updates** with a local cache, plus manual **Update** / **Update all**.
- **Sidebar control**: the globe action opens the route menu; **Proxy settings** opens the manager.
- **Safe teardown**: disabling or removing the bundle installs a direct dispatcher before it stops the Auto router, so DSH keeps networking without a restart.
- English and Simplified Chinese UI.

## Requirements

- DSH 0.2.x with the Web UI.
- Node 24.5+ in the Host process (`http.setGlobalProxyFromEnv`). Electron 44 / Node 24.18 is known to work.
- HTTP and HTTPS proxies only. SOCKS and PAC are not supported.

## Install

```bash
git clone https://github.com/Scatola-desu/dsh-auto-switch-proxy.git
```

1. In DSH, open **Plugins → Install bundle**.
2. Give it the absolute path of the cloned directory, or the spec `github:Scatola-desu/dsh-auto-switch-proxy`.
3. Enable the bundle if it is not enabled automatically.

The package is a normal DSH bundle: `package.json` declares `dsh.bundle.patch`, and the patch mounts `dsh-auto-switch-proxy`.

## Use

The composer toolbar intentionally has no proxy control.

- **Sidebar foot → globe action** opens the route menu:
  - System proxy — use the proxy environment DSH was launched with
  - Direct — no proxy
  - Auto Switch — evaluate the rules
  - Proxy settings — open the manager
- The manager contains the route selector, server list, manual rules, subscriptions, update controls, and a connection test.

### Servers

Servers are a separate list. A server address may be a full URL, `host:port`, or just a port:

```text
7890                  → http://127.0.0.1:7890
127.0.0.1:7890        → http://127.0.0.1:7890
http://proxy:8080     → unchanged
http://user:pass@host:port
```

No server is preconfigured. Add one in **Proxy settings** and select it in Auto mode.

### Auto Switch

Auto mode starts a router on `127.0.0.1:<ephemeral>` and points `HTTP_PROXY` / `HTTPS_PROXY` at it. For each request it evaluates, in order:

1. manual rules, in the order added
2. enabled subscriptions, in list order
3. the default (`proxy` or `direct`)

If the decision is proxy, the router chains a CONNECT through the selected Auto server; otherwise it connects directly. Loopback traffic bypasses the router.

A subscription has a format, a behavior, and an update interval (15–10080 minutes, default 720). The last downloaded list is cached under `$DSH_HOME/proxy-switchy/rules/<id>.txt`. For `raw.githubusercontent.com`, a failed primary fetch falls back to `https://ghproxy.net/<url>`.

On first activation the plugin seeds the public [SwitchyOmega-Whitelist](https://github.com/entr0pia/SwitchyOmega-Whitelist) `.sorl` list with behavior **direct**. It is a normal subscription: edit or delete it in the manager.

## Security and limits

- HTTPS requests expose only the destination host to the router. Path and regex rules can match the host but not the URL path. HTTP requests carry the full URL.
- The Auto router binds to `127.0.0.1` only, but it is an unauthenticated local HTTP proxy while Auto mode is active. Other local processes can use it during that time.
- Proxy URLs may contain credentials. They are stored in plain text in `$DSH_HOME/proxy-switchy/state.json`; protect that file.
- Rules are evaluated process-wide; there is no per-session routing.
- A rule update while in Direct/System mode uses that route. If the subscription host is unreachable, switch to Auto or update through a reachable network.
- Disabling the bundle restores the launch route when one exists; when the launch environment names no proxy, it installs a direct dispatcher.

## Files

| Path | Role |
|---|---|
| `index.js` | Host plugin: state, routes, subscription updates, mode application |
| `lib/switch.js` | State schema, validation, environment application |
| `lib/rules.js` | SwitchyOmega / AutoProxy parsing and matching |
| `lib/router.js` | Loopback direct/proxy router for Auto mode |
| `client.js` | Sidebar route menu, manager modal, dictionaries, styles |
| `cordis.patch.yml` | Bundle row |
| `locale/*.json` | Plugin Manager display metadata |

Runtime data lives under `$DSH_HOME/proxy-switchy/`:

```text
state.json
rules/<subscription-id>.txt
```

## License

MIT. See [LICENSE](LICENSE).
