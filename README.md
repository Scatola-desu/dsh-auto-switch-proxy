# dsh-auto-switch-proxy

A rule-based **Auto Switch** proxy for [DeepSeek Harness](https://github.com/deepseek-ai) (DSH). It hot-switches the Host process's outbound route per request instead of sending everything through one fixed proxy.

一个用于 [DeepSeek Harness](https://github.com/deepseek-ai)（DSH）的**自动切换**代理插件：按请求规则切换 Host 进程的出站线路，而不是把所有流量固定交给一个代理。

No restart. No extra runtime dependencies.
无需重启，无额外运行时依赖。

![Sidebar route menu](docs/sidebar-menu.png)

| | English | 中文 |
|---|---|---|
| **Auto Switch** | Rule-based routing per request | 按规则逐请求路由 |
| **Subscriptions** | SwitchyOmega `.sorl` · AutoProxy / GFW | SwitchyOmega `.sorl` · AutoProxy / GFW |
| **Server list** | Separate from the route list | 与线路列表分离 |
| **Entry** | Sidebar foot → globe action | 侧栏底部 → 地球按钮 |
| **Teardown** | Direct dispatcher installed first | 先安装直连 dispatcher |
| **UI** | English / Simplified Chinese | 中英文界面 |

## Auto Switch, not a fixed proxy / 和固定代理插件的区别

Most DSH proxy plugins apply a single fixed upstream to all Host traffic. This plugin starts a loopback router and evaluates rules for each request, so the model endpoint, package registries, and internal services can use different routes at the same time. A fixed server is still one click away, but it is no longer the only option.

多数 DSH 代理插件把 Host 的所有流量固定到同一个上游。本插件会在本机启动一个回环路由，对每个请求执行规则，因此模型接口、包仓库和内网服务可以同时走不同线路。需要固定线路时仍然可以一键选择，但它不再是唯一选择。

## Features / 功能

| English | 中文 |
|---|---|
| **System / Direct / Auto Switch** modes; the server list is separate from the route list. | **系统代理 / 直连 / 自动切换** 三种线路；服务器列表与线路列表分离。 |
| **Auto Switch**: a loopback router evaluates manual rules and subscriptions per request, then tunnels directly or through the selected server. | **自动切换**：本机回环路由按规则逐请求判断，直连或经指定服务器转发。 |
| **Rule subscriptions** in two formats: SwitchyOmega `.sorl` condition lists, and AutoProxy / GFW lists (`\|\|domain`, `@@\|\|domain`, `\|prefix`, `/regex/`). | **两种规则订阅格式**：SwitchyOmega `.sorl` 条件列表，以及 AutoProxy / GFW 列表（`\|\|domain`、`@@\|\|domain`、`\|prefix`、`/regex/`）。 |
| **Periodic updates** with a local cache, plus manual **Update** / **Update all**. | **定时更新**，本地缓存；也可手动「更新 / 更新全部」。 |
| **Sidebar control**: the globe action opens the route menu; **Proxy settings** opens the manager. | **侧栏入口**：地球按钮打开线路菜单，「代理设置」打开管理器。 |
| **Safe teardown**: disabling or removing the bundle installs a direct dispatcher before it stops the Auto router, so DSH keeps networking without a restart. | **安全退出**：禁用/卸载时先安装直连 dispatcher，再停止 Auto 路由，不需要重启 DSH。 |
| English and Simplified Chinese UI. | 中英文界面。 |

## Requirements / 要求

| English | 中文 |
|---|---|
| DSH 0.2.x with the Web UI. | DSH 0.2.x，带 Web UI。 |
| Node 24.5+ in the Host process (`http.setGlobalProxyFromEnv`). Electron 44 / Node 24.18 is known to work. | Host 进程使用 Node 24.5+（`http.setGlobalProxyFromEnv`）。Electron 44 / Node 24.18 已验证可用。 |
| HTTP and HTTPS proxies only. SOCKS and PAC are not supported. | 仅支持 HTTP / HTTPS 代理，不支持 SOCKS 与 PAC。 |

## Install / 安装

```bash
git clone https://github.com/Scatola-desu/dsh-auto-switch-proxy.git
```

| English | 中文 |
|---|---|
| 1. In DSH, open **Plugins → Install bundle**. | 1. 在 DSH 中打开 **插件 → 安装插件**。 |
| 2. Give it the absolute path of the cloned directory, or the spec `github:Scatola-desu/dsh-auto-switch-proxy`. | 2. 填入克隆目录的绝对路径，或使用 `github:Scatola-desu/dsh-auto-switch-proxy`。 |
| 3. Enable the bundle if it is not enabled automatically. | 3. 如果未自动启用，启用该插件。 |

The package is a normal DSH bundle: `package.json` declares `dsh.bundle.patch`, and the patch mounts `dsh-auto-switch-proxy`.

本包是标准的 DSH 插件（bundle）：`package.json` 声明 `dsh.bundle.patch`，该 patch 挂载 `dsh-auto-switch-proxy`。

## Use / 使用

The composer toolbar intentionally has no proxy control.

输入框工具条中没有代理按钮，入口只在左侧栏底部。

| English | 中文 |
|---|---|
| **Sidebar foot → globe action** opens the route menu: | **侧栏底部 → 地球按钮**打开线路菜单： |
| · System proxy — use the proxy environment DSH was launched with | · 系统代理：使用 DSH 启动时的代理环境 |
| · Direct — no proxy | · 直连：不使用代理 |
| · Auto Switch — evaluate the rules | · 自动切换：按规则判断 |
| · Proxy settings — open the manager | · 代理设置：打开管理器 |
| The manager contains the route selector, server list, manual rules, subscriptions, update controls, and a connection test. | 管理器中包含线路选择、服务器列表、手动规则、订阅、更新和连接测试。 |

### Servers / 服务器

Servers are a separate list. A server address may be a full URL, `host:port`, or just a port.

服务器地址支持完整 URL、`host:port` 或只填端口。

```text
7890                  → http://127.0.0.1:7890
127.0.0.1:7890        → http://127.0.0.1:7890
http://proxy:8080     → unchanged / 原样
http://user:pass@host:port
```

| English | 中文 |
|---|---|
| No server is preconfigured. Add one in **Proxy settings** and select it in Auto mode. | 默认不预置服务器。请先在「代理设置」中添加，并在自动模式中选择。 |

### Auto Switch / 自动切换

Auto mode starts a router on `127.0.0.1:<ephemeral>` and points `HTTP_PROXY` / `HTTPS_PROXY` at it. For each request it evaluates, in order:

自动模式在 `127.0.0.1:<临时端口>` 启动路由，并把 `HTTP_PROXY` / `HTTPS_PROXY` 指向它。每个请求按以下顺序判断：

| # | English | 中文 |
|---|---|---|
| 1 | manual rules, in the order added | 手动规则（按添加顺序） |
| 2 | enabled subscriptions, in list order | 已启用订阅（按列表顺序） |
| 3 | the default (`proxy` or `direct`) | 默认行为（代理 / 直连） |

If the decision is proxy, the router chains a CONNECT through the selected Auto server; otherwise it connects directly. Loopback traffic bypasses the router.

判定为代理时，路由通过所选服务器建立 CONNECT 隧道；否则直连。回环流量不经过路由。

| English | 中文 |
|---|---|
| A subscription has a format, a behavior, and an update interval (15–10080 minutes, default 720). | 订阅有格式、行为和更新间隔（15–10080 分钟，默认 720）。 |
| The last downloaded list is cached under `$DSH_HOME/proxy-switchy/rules/<id>.txt`. | 最近一次下载内容缓存在 `$DSH_HOME/proxy-switchy/rules/<id>.txt`。 |
| For `raw.githubusercontent.com`, a failed primary fetch falls back to `https://ghproxy.net/<url>`. | `raw.githubusercontent.com` 拉取失败时会尝试 `https://ghproxy.net/<url>`。 |
| On first activation the plugin seeds the public [SwitchyOmega-Whitelist](https://github.com/entr0pia/SwitchyOmega-Whitelist) `.sorl` list with behavior **direct**. | 首次启用会预置公开的 [SwitchyOmega-Whitelist](https://github.com/entr0pia/SwitchyOmega-Whitelist) `.sorl` 白名单，行为为**直连**。 |
| It is a normal subscription: edit or delete it in the manager. | 它只是普通订阅，可在管理器中修改或删除。 |

## Security and limits / 安全与限制

| English | 中文 |
|---|---|
| HTTPS requests expose only the destination host to the router. Path and regex rules can match the host but not the URL path. HTTP requests carry the full URL. | HTTPS 请求经过 CONNECT 时只能看到目标域名，路径/正则规则只能匹配域名；HTTP 请求可匹配完整 URL。 |
| The Auto router binds to `127.0.0.1` only, but it is an unauthenticated local HTTP proxy while Auto mode is active. Other local processes can use it during that time. | Auto 路由只监听 `127.0.0.1`，但启用自动模式期间它是一个无认证的本地 HTTP 代理，其他本机进程也可以使用。 |
| Proxy URLs may contain credentials. They are stored in plain text in `$DSH_HOME/proxy-switchy/state.json`; protect that file. | 代理 URL 可能包含账号密码，会明文保存在 `$DSH_HOME/proxy-switchy/state.json`，请像保护凭据文件一样保护它。 |
| Rules are evaluated process-wide; there is no per-session routing. | 规则对整个进程生效，没有按会话路由。 |
| A rule update while in Direct/System mode uses that route. If the subscription host is unreachable, switch to Auto or update through a reachable network. | 直连/系统模式下更新订阅会走当前线路；如果订阅地址不可达，请切到自动模式或换可用网络。 |
| Disabling the bundle restores the launch route when one exists; when the launch environment names no proxy, it installs a direct dispatcher. | 禁用插件时会尽量恢复启动时的代理环境；启动环境没有代理时安装直连 dispatcher。 |

## Files / 文件

| Path | Role / 作用 |
|---|---|
| `index.js` | Host plugin: state, routes, subscription updates, mode application / Host 插件：状态、路由、订阅更新、线路应用 |
| `lib/switch.js` | State schema, validation, environment application / 状态结构、校验、环境应用 |
| `lib/rules.js` | SwitchyOmega / AutoProxy parsing and matching / 解析与匹配 |
| `lib/router.js` | Loopback direct/proxy router for Auto mode / 自动模式的本机直连/代理路由 |
| `client.js` | Sidebar route menu, manager modal, dictionaries, styles / 侧栏菜单、管理器、词典、样式 |
| `cordis.patch.yml` | Bundle row / Bundle 行 |
| `locale/*.json` | Plugin Manager display metadata / 插件管理器显示元数据 |

Runtime data / 运行数据：

```text
$DSH_HOME/proxy-switchy/state.json
$DSH_HOME/proxy-switchy/rules/<subscription-id>.txt
```

## License / 许可证

MIT. See [LICENSE](LICENSE).

MIT，见 [LICENSE](LICENSE)。
