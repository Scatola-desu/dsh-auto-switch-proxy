# dsh-auto-switch-proxy

一个用于 [DeepSeek Harness](https://github.com/deepseek-ai)（DSH）的**自动切换**代理插件：按请求规则切换 Host 进程的出站线路，而不是把所有流量固定交给一个代理。

无需重启，无额外运行时依赖。

## 和固定代理插件的区别

多数 DSH 代理插件把 Host 的所有流量固定到同一个上游。本插件会在本机启动一个回环路由，对每个请求执行规则，因此模型接口、包仓库和内网服务可以同时走不同线路。需要固定线路时仍然可以一键选择，但它不再是唯一选择。

## 功能

- **系统代理 / 直连 / 自动切换** 三种线路；服务器列表与线路列表分离。
- **自动切换**：本机回环路由按规则逐请求判断，直连或经指定服务器转发。
- **两种规则订阅格式**：
  - SwitchyOmega `.sorl` 条件列表
  - AutoProxy / GFW 列表（`||domain`、`@@||domain`、`|prefix`、`/regex/`）
- **定时更新**，本地缓存；也可手动「更新 / 更新全部」。
- **侧栏入口**：地球按钮打开线路菜单，「代理设置」打开管理器。
- **安全退出**：禁用/卸载时先安装直连 dispatcher，再停止 Auto 路由，不需要重启 DSH。
- 中英文界面。

## 要求

- DSH 0.2.x，带 Web UI。
- Host 进程使用 Node 24.5+（`http.setGlobalProxyFromEnv`）。Electron 44 / Node 24.18 已验证可用。
- 仅支持 HTTP / HTTPS 代理，不支持 SOCKS 与 PAC。

## 安装

```bash
git clone https://github.com/Scatola-desu/dsh-auto-switch-proxy.git
```

1. 在 DSH 中打开 **插件 → 安装插件**。
2. 填入克隆目录的绝对路径，或使用 `github:Scatola-desu/dsh-auto-switch-proxy`。
3. 如果未自动启用，启用该插件。

## 使用

输入框工具条中没有代理按钮，入口只在左侧栏底部。

- **侧栏底部 → 地球按钮**：
  - 系统代理：使用 DSH 启动时的代理环境
  - 直连：不使用代理
  - 自动切换：按规则判断
  - 代理设置：打开管理器
- 管理器中包含线路选择、服务器列表、手动规则、订阅、更新和连接测试。

### 服务器

服务器地址支持完整 URL、`host:port` 或只填端口：

```text
7890                  → http://127.0.0.1:7890
127.0.0.1:7890        → http://127.0.0.1:7890
http://proxy:8080     → 原样
http://user:pass@host:port
```

默认不预置服务器。请先在「代理设置」中添加，并在自动模式中选择。

### 自动切换

自动模式在 `127.0.0.1:<临时端口>` 启动路由，并把 `HTTP_PROXY` / `HTTPS_PROXY` 指向它。每个请求按以下顺序判断：

1. 手动规则（按添加顺序）
2. 已启用订阅（按列表顺序）
3. 默认行为（代理 / 直连）

判定为代理时，路由通过所选服务器建立 CONNECT 隧道；否则直连。回环流量不经过路由。

订阅有格式、行为和更新间隔（15–10080 分钟，默认 720）。最近一次下载内容缓存在 `$DSH_HOME/proxy-switchy/rules/<id>.txt`；`raw.githubusercontent.com` 拉取失败时会尝试 `https://ghproxy.net/<url>`。

首次启用会预置公开的 [SwitchyOmega-Whitelist](https://github.com/entr0pia/SwitchyOmega-Whitelist) `.sorl` 白名单，行为为**直连**。它只是普通订阅，可在管理器中修改或删除。

## 安全与限制

- HTTPS 请求经过 CONNECT 时只能看到目标域名，路径/正则规则只能匹配域名；HTTP 请求可匹配完整 URL。
- Auto 路由只监听 `127.0.0.1`，但启用自动模式期间它是一个无认证的本地 HTTP 代理，其他本机进程也可以使用。
- 代理 URL 可能包含账号密码，会明文保存在 `$DSH_HOME/proxy-switchy/state.json`，请像保护凭据文件一样保护它。
- 规则对整个进程生效，没有按会话路由。
- 直连/系统模式下更新订阅会走当前线路；如果订阅地址不可达，请切到自动模式或换可用网络。
- 禁用插件时会尽量恢复启动时的代理环境；启动环境没有代理时安装直连 dispatcher。

## 文件

| 路径 | 作用 |
|---|---|
| `index.js` | Host 插件：状态、路由、订阅更新、线路应用 |
| `lib/switch.js` | 状态结构、校验、环境应用 |
| `lib/rules.js` | SwitchyOmega / AutoProxy 解析与匹配 |
| `lib/router.js` | 自动模式的本机直连/代理路由 |
| `client.js` | 侧栏菜单、管理器、词典、样式 |
| `cordis.patch.yml` | Bundle 行 |
| `locale/*.json` | 插件管理器显示元数据 |

运行数据：

```text
$DSH_HOME/proxy-switchy/state.json
$DSH_HOME/proxy-switchy/rules/<subscription-id>.txt
```

## 许可证

MIT，见 [LICENSE](LICENSE)。
