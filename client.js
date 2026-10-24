window.__ModuleLoader__.load({
  id: 'dsh-auto-switch-proxy',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    let createPortal = null
    try {
      createPortal = require('react-dom').createPortal ?? null
    } catch {
      createPortal = null
    }

    const NS = 'proxy-switchy'
    const ROUTE = '/proxy-switchy/'

    const zh = {
      'control.tooltip': '切换网络代理',
      'control.manage': '代理设置',
      'control.manageShort': '代理',
      'control.loading': '代理',
      'common.close': '关闭',
      'common.save': '保存',
      'common.cancel': '取消',
      'common.edit': '编辑',
      'common.delete': '删除',
      'common.update': '更新',
      'common.updating': '更新中…',
      'mode.system': '系统代理',
      'mode.direct': '直连',
      'mode.auto': '自动切换',
      'mode.systemHint': '使用启动环境',
      'mode.directHint': '不经过代理',
      'mode.autoHint': '按规则选择直连或代理',
      'status.active': '当前线路',
      'status.systemProxy': '启动环境：{proxy}',
      'status.systemNone': '启动环境未配置代理',
      'status.runtime': 'Node {node} · Electron {electron}',
      'status.lastApplied': '上次切换于 {time}',
      'status.neverApplied': '尚未应用过切换',
      'status.test': '测试连接',
      'status.testing': '正在测试…',
      'status.testOk': '连接正常 · {ms} 毫秒 · HTTP {status}',
      'status.testFailed': '无法连接',
      'status.retry': '重试',
      'status.rulesActive': '规则已生效',
      'servers.title': '服务器列表',
      'servers.intro': '代理服务器的地址和端口只在这里维护；线路只引用服务器。',
      'servers.empty': '还没有服务器。添加一个本机或远程代理服务器。',
      'servers.add': '添加服务器',
      'servers.name': '名称',
      'servers.namePlaceholder': '本机代理',
      'servers.url': '地址 / 端口',
      'servers.urlPlaceholder': '7890 或 http://127.0.0.1:7890',
      'servers.urlHint': '可只填端口（会使用 127.0.0.1），也可填 host:port 或完整 URL。',
      'servers.editTitle': '编辑服务器',
      'servers.newTitle': '新建服务器',
      'servers.autoTag': '自动线路',
      'servers.deleteConfirm': '确认删除这个服务器？',
      'servers.count': '共 {count} 个',
      'modes.title': '线路',
      'modes.intro': '选择 DSH 主机访问网络的方式；服务器在下方单独维护。',
      'modes.autoServer': '自动切换服务器',
      'modes.defaultBehavior': '未匹配规则时',
      'modes.defaultProxy': '走代理',
      'modes.defaultDirect': '直连',
      'modes.noServer': '请先添加服务器',
      'modes.apply': '应用',
      'rules.title': '自动切换规则',
      'rules.intro': '按顺序匹配：手动规则优先，然后按订阅顺序。HTTPS 请求只能匹配域名，匹配不到路径。',
      'rules.manualTitle': '手动规则',
      'rules.manualEmpty': '暂无手动规则。',
      'rules.pattern': '规则',
      'rules.patternPlaceholder': '||example.com 或 @@||direct.example.com',
      'rules.behavior': '行为',
      'rules.behaviorProxy': '代理',
      'rules.behaviorDirect': '直连',
      'rules.addManual': '添加规则',
      'rules.manualHint': '支持 ||域名、@@||域名、|URL 前缀、/正则/、通配符。',
      'rules.subscriptionsTitle': '订阅',
      'rules.subscriptionsEmpty': '暂无订阅。',
      'rules.addSubscription': '添加订阅',
      'rules.subName': '名称',
      'rules.subUrl': '订阅地址',
      'rules.subFormat': '格式',
      'rules.subBehavior': '列表行为',
      'rules.subBehaviorHint': 'Switchy 列表的所有规则使用这个行为；AutoProxy 列表由 || 和 @@ 决定。',
      'rules.subInterval': '更新间隔（分钟）',
      'rules.lastUpdated': '更新于 {time}',
      'rules.neverUpdated': '尚未更新',
      'rules.ruleCount': '{count} 条',
      'rules.update': '更新',
      'rules.updateAll': '更新全部',
      'rules.deleteConfirm': '确认删除这个订阅？',
      'rules.error': '更新失败：{message}',
      'rules.formatSwitchy': 'SwitchyOmega',
      'rules.formatAutoProxy': 'AutoProxy',
      'rules.editTitle': '编辑订阅',
      'rules.newTitle': '新建订阅',
      'rules.enabled': '启用',
      'rules.disabled': '已停用',
      'rules.defaultProxy': '默认走代理',
      'rules.defaultDirect': '默认直连',
      'warning.unsupportedTitle': '无法切换代理',
      'warning.unsupportedDetail': '当前主机的 Node 运行时没有提供 http.setGlobalProxyFromEnv。配置仍可保存，但切换功能不可用。',
      'error.generic': '操作失败：{message}',
      'error.nameRequired': '请填写名称。',
      'error.nameTooLong': '名称不能超过 60 个字符。',
      'error.nameInvalid': '名称包含不支持的控制字符。',
      'error.nameDuplicate': '已有同名服务器。',
      'error.urlInvalid': '请填写有效的地址。',
      'error.urlScheme': '仅支持 http:// 和 https://。',
      'error.urlPath': '地址不能包含路径、查询参数或片段。',
      'error.noProxyTooLong': '直连名单不能超过 500 个字符。',
      'error.serversInvalid': '服务器列表格式不正确。',
      'error.serverLimit': '最多保留 50 个服务器。',
      'error.ruleRequired': '请填写规则内容。',
      'error.ruleTooLong': '单条规则不能超过 2048 个字符。',
      'error.rulesInvalid': '规则列表格式不正确。',
      'error.ruleLimit': '最多保留 500 条手动规则。',
      'error.subscriptionsInvalid': '订阅列表格式不正确。',
      'error.subscriptionLimit': '最多保留 30 个订阅。',
      'error.serverRequired': '请先在服务器列表添加并选择一个服务器。',
      'error.unknownServer': '这个服务器已不存在。',
      'error.unknownSubscription': '这个订阅已不存在。',
      'error.badRequest': '请求被拒绝。',
      'error.unsupportedRuntime': '当前运行时无法切换代理。',
      'error.autoUnavailable': '自动切换路由没有启动。',
      'error.applyFailed': '代理应用失败：{message}',
      'error.statePersistFailed': '代理已应用，但配置没有保存成功：{message}',
    }

    const en = {
      'control.tooltip': 'Switch network proxy',
      'control.manage': 'Proxy settings',
      'control.manageShort': 'Proxy',
      'control.loading': 'Proxy',
      'common.close': 'Close',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.edit': 'Edit',
      'common.delete': 'Delete',
      'common.update': 'Update',
      'common.updating': 'Updating…',
      'mode.system': 'System',
      'mode.direct': 'Direct',
      'mode.auto': 'Auto Switch',
      'mode.systemHint': 'Use launch environment',
      'mode.directHint': 'No proxy',
      'mode.autoHint': 'Choose direct or proxy by rule',
      'status.active': 'Active route',
      'status.systemProxy': 'Launch environment: {proxy}',
      'status.systemNone': 'Launch environment has no proxy configured',
      'status.runtime': 'Node {node} · Electron {electron}',
      'status.lastApplied': 'Last switched {time}',
      'status.neverApplied': 'No switch has been applied yet',
      'status.test': 'Test connection',
      'status.testing': 'Testing…',
      'status.testOk': 'Reachable · {ms} ms · HTTP {status}',
      'status.testFailed': 'Unreachable',
      'status.retry': 'Retry',
      'status.rulesActive': 'Rules active',
      'servers.title': 'Servers',
      'servers.intro': 'Proxy addresses and ports live here; modes only reference a server.',
      'servers.empty': 'No servers yet. Add a local or remote proxy server.',
      'servers.add': 'Add server',
      'servers.name': 'Name',
      'servers.namePlaceholder': 'Local proxy',
      'servers.url': 'Address / port',
      'servers.urlPlaceholder': '7890 or http://127.0.0.1:7890',
      'servers.urlHint': 'A bare port means 127.0.0.1; host:port and full URLs also work.',
      'servers.editTitle': 'Edit server',
      'servers.newTitle': 'New server',
      'servers.autoTag': 'Auto',
      'servers.deleteConfirm': 'Delete this server?',
      'servers.count': '{count} total',
      'modes.title': 'Route',
      'modes.intro': 'Choose how DSH reaches the network; servers are managed separately below.',
      'modes.autoServer': 'Auto-mode server',
      'modes.defaultBehavior': 'When no rule matches',
      'modes.defaultProxy': 'Proxy',
      'modes.defaultDirect': 'Direct',
      'modes.noServer': 'Add a server first',
      'modes.apply': 'Apply',
      'rules.title': 'Auto Switch rules',
      'rules.intro': 'Evaluated in order: manual rules first, then subscriptions. HTTPS requests can match hosts only, not paths.',
      'rules.manualTitle': 'Manual rules',
      'rules.manualEmpty': 'No manual rules.',
      'rules.pattern': 'Rule',
      'rules.patternPlaceholder': '||example.com or @@||direct.example.com',
      'rules.behavior': 'Behavior',
      'rules.behaviorProxy': 'Proxy',
      'rules.behaviorDirect': 'Direct',
      'rules.addManual': 'Add rule',
      'rules.manualHint': 'Supports ||domain, @@||domain, |URL prefixes, /regex/, and wildcards.',
      'rules.subscriptionsTitle': 'Subscriptions',
      'rules.subscriptionsEmpty': 'No subscriptions.',
      'rules.addSubscription': 'Add subscription',
      'rules.subName': 'Name',
      'rules.subUrl': 'Subscription URL',
      'rules.subFormat': 'Format',
      'rules.subBehavior': 'List behavior',
      'rules.subBehaviorHint': 'Switchy lists apply this behavior to every rule; AutoProxy lists use || and @@.',
      'rules.subInterval': 'Update interval (minutes)',
      'rules.lastUpdated': 'Updated {time}',
      'rules.neverUpdated': 'Never updated',
      'rules.ruleCount': '{count} rules',
      'rules.update': 'Update',
      'rules.updateAll': 'Update all',
      'rules.deleteConfirm': 'Delete this subscription?',
      'rules.error': 'Update failed: {message}',
      'rules.formatSwitchy': 'SwitchyOmega',
      'rules.formatAutoProxy': 'AutoProxy',
      'rules.editTitle': 'Edit subscription',
      'rules.newTitle': 'New subscription',
      'rules.enabled': 'Enabled',
      'rules.disabled': 'Disabled',
      'rules.defaultProxy': 'Proxy by default',
      'rules.defaultDirect': 'Direct by default',
      'warning.unsupportedTitle': 'Proxy switching is unavailable',
      'warning.unsupportedDetail': "This host's Node runtime does not expose http.setGlobalProxyFromEnv. Profiles can still be saved; switching is disabled.",
      'error.generic': 'The change failed: {message}',
      'error.nameRequired': 'Enter a name.',
      'error.nameTooLong': 'Keep the name under 60 characters.',
      'error.nameInvalid': 'The name contains unsupported control characters.',
      'error.nameDuplicate': 'Another server already uses this name.',
      'error.urlInvalid': 'Enter a valid address.',
      'error.urlScheme': 'Only http:// and https:// are supported.',
      'error.urlPath': 'The address cannot include a path, query, or fragment.',
      'error.noProxyTooLong': 'Keep the bypass list under 500 characters.',
      'error.serversInvalid': 'The server list is malformed.',
      'error.serverLimit': 'You can keep at most 50 servers.',
      'error.ruleRequired': 'Enter a rule.',
      'error.ruleTooLong': 'A rule cannot exceed 2048 characters.',
      'error.rulesInvalid': 'The rule list is malformed.',
      'error.ruleLimit': 'You can keep at most 500 manual rules.',
      'error.subscriptionsInvalid': 'The subscription list is malformed.',
      'error.subscriptionLimit': 'You can keep at most 30 subscriptions.',
      'error.serverRequired': 'Add and select a server first.',
      'error.unknownServer': 'That server no longer exists.',
      'error.unknownSubscription': 'That subscription no longer exists.',
      'error.badRequest': 'The request was rejected.',
      'error.unsupportedRuntime': 'This runtime cannot switch proxies.',
      'error.autoUnavailable': 'The Auto Switch router is not running.',
      'error.applyFailed': 'The proxy could not be applied: {message}',
      'error.statePersistFailed': 'The proxy changed but the configuration was not saved: {message}',
    }

    const CSS = `
.psx-switcher { display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 3px; border-radius: 8px; color: var(--dsw-alias-label-secondary); }
.psx-switcher:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.psx-switcher--disabled { opacity: .55; }
.psx-trigger { display: inline-flex; align-items: center; gap: 4px; max-width: 180px; height: 24px; padding: 0 4px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; font-size: 12px; line-height: 20px; cursor: pointer; }
.psx-trigger:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.psx-trigger:disabled { opacity: .5; cursor: default; }
.psx-current { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.psx-globe { flex: none; opacity: .9; }
.psx-chevron { flex: none; opacity: .55; }
.psx-label { font-size: 12px; line-height: 20px; }
.psx-spinner { width: 12px; height: 12px; border: 1.5px solid var(--dsw-alias-border-l2); border-top-color: #4d6bfe; border-radius: 50%; animation: psx-spin .8s linear infinite; }
.psx-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; background: var(--dsw-alias-state-error-primary); }
@keyframes psx-spin { to { transform: rotate(360deg); } }
.psx-icon-button { flex: none; width: 24px; height: 24px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 6px; background: transparent; color: inherit; cursor: pointer; }
.psx-icon-button:hover { background: var(--dsw-alias-bg-layer-2); }
.psx-icon-button:disabled { opacity: .5; cursor: default; }
.psx-sidebar-anchor { box-sizing: border-box; display: block; width: 100%; min-width: 0; }
.psx-sidebar-action { box-sizing: border-box; appearance: none; -webkit-appearance: none; display: flex; flex-direction: row; align-items: center; gap: 8px; min-width: 0; width: 100%; height: 40px; margin: 0; padding: 0 7px; border: .5px solid transparent; border-radius: 10px; background: transparent; color: var(--dsw-alias-label-secondary, #9aa0ab); font-family: inherit; font-size: 13px; line-height: 18px; text-align: left; cursor: pointer; transition: background .15s ease, border-color .15s ease, color .15s ease; }
.psx-sidebar-action:hover { background: var(--dsw-alias-bg-layer-2, #26282f); border-color: var(--dsw-alias-border-l1, #2f323a); color: var(--dsw-alias-label-primary, #e9eaee); }
.psx-sidebar-action[aria-expanded="true"] { background: var(--dsw-alias-bg-layer-2, #26282f); border-color: var(--dsw-alias-border-l2, #3c404a); color: var(--dsw-alias-label-primary, #e9eaee); }
.psx-sidebar-mark { position: relative; flex: 0 0 auto; box-sizing: border-box; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #26282f); color: var(--dsw-alias-label-secondary, #9aa0ab); }
.psx-sidebar-mark[data-state="proxy"] { background: color-mix(in srgb, #4d6bfe 16%, transparent); color: #6f88ff; }
.psx-sidebar-mark[data-state="direct"] { background: color-mix(in srgb, var(--dsw-alias-state-idle-primary) 16%, transparent); color: var(--dsw-alias-state-idle-primary); }
.psx-sidebar-mark[data-state="system"] { color: #7b818c; }
.psx-sidebar-dot { position: absolute; right: -1px; bottom: -1px; width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-base)); background: var(--dsw-alias-state-idle-primary); }
.psx-sidebar-dot[data-state="proxy"] { background: #5b76ff; }
.psx-sidebar-dot[data-state="direct"] { background: var(--dsw-alias-state-idle-primary); }
.psx-sidebar-dot[data-state="system"] { background: var(--dsw-alias-state-warn-primary, var(--dsw-alias-state-idle-primary)); }
.psx-sidebar-text { box-sizing: border-box; display: flex; flex-direction: column; gap: 0; min-width: 0; flex: 1 1 auto; }
.psx-sidebar-label { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary, #e9eaee); font-size: 13px; line-height: 18px; font-weight: 500; }
.psx-sidebar-sub { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-secondary, #9aa0ab); font-size: 11px; line-height: 15px; }
.psx-sidebar-badge { flex: 0 0 auto; display: inline-flex; align-items: center; padding: 0 6px; border-radius: 9px; background: rgba(77, 107, 254, .16); color: #8ea1ff; font-size: 11px; line-height: 18px; font-variant-numeric: tabular-nums; }
.psx-sidebar-chevron { flex: 0 0 auto; display: inline-flex; opacity: .6; transition: transform .15s ease; }
.psx-sidebar-chevron--open { transform: rotate(180deg); }
.psx-menu { box-sizing: border-box; display: flex; flex-direction: column; max-height: 60vh; overflow: auto; padding: 6px; border: .5px solid var(--dsw-alias-border-l2, #3c404a); border-radius: 12px; background: var(--dsw-alias-bg-overlay, #232528); box-shadow: 0 16px 44px rgba(0, 0, 0, .38); }
.psx-menu-head { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 6px 8px 8px; }
.psx-menu-head-icon { box-sizing: border-box; flex: none; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 7px; background: color-mix(in srgb, #4d6bfe 16%, transparent); color: #8ea1ff; }
.psx-menu-head-text { box-sizing: border-box; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.psx-menu-head-title { font-size: 13px; line-height: 18px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.psx-menu-head-sub { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.psx-menu-item { box-sizing: border-box; appearance: none; -webkit-appearance: none; display: flex; flex-direction: row; align-items: center; gap: 9px; width: 100%; margin: 0; padding: 8px 9px; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary, #e9eaee); font-family: inherit; font-size: 13px; line-height: 18px; text-align: left; cursor: pointer; transition: background .12s ease; }
.psx-menu-item:hover { background: var(--dsw-alias-bg-layer-2, #26282f); }
.psx-menu-item:disabled { opacity: .5; cursor: default; }
.psx-menu-item--active { background: color-mix(in srgb, #4d6bfe 12%, transparent); }
.psx-menu-icon { box-sizing: border-box; flex: 0 0 auto; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-secondary, #9aa0ab); }
.psx-menu-body { box-sizing: border-box; display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1 1 auto; }
.psx-menu-label { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 18px; }
.psx-menu-hint { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 15px; }
.psx-menu-check { flex: none; color: #4d6bfe; }
.psx-menu-sep { height: 1px; margin: 4px 6px; background: var(--dsw-alias-border-l1); }
.psx-modal-backdrop { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; justify-content: center; inset: 0; padding: 24px; background: rgba(0, 0, 0, .45); }
.psx-modal { position: relative; width: min(720px, 100%); max-height: min(84vh, 820px); overflow: auto; padding: 20px; border: .5px solid var(--dsw-alias-border-l2); border-radius: 14px; background: var(--dsw-alias-bg-overlay); box-shadow: 0 24px 70px rgba(0, 0, 0, .35); }
.psx-modal-close { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 20px; line-height: 1; cursor: pointer; }
.psx-modal-close:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.psx-sidebar-action[data-wide="0"] { width: 44px; padding: 0; justify-content: center; }
.psx-sidebar-action[data-wide="0"] .psx-sidebar-badge,
.psx-sidebar-action[data-wide="0"] .psx-sidebar-text,
.psx-sidebar-action[data-wide="0"] .psx-sidebar-chevron { display: none; }
* { box-sizing: border-box; }
button, input, select { font-family: inherit; }
@media (max-width: 640px) { .psx-modal-backdrop { padding: 10px; } .psx-modal { padding: 16px; max-height: 90vh; } }
.psx-section { max-width: 760px; display: flex; flex-direction: column; gap: 12px; color: var(--dsw-alias-label-primary); }
.psx-title { margin: 0; font-size: 16px; font-weight: 500; line-height: 24px; }
.psx-intro { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 14px; line-height: 22px; }
.psx-subtitle { margin: 0; font-size: 14px; font-weight: 500; line-height: 22px; }
.psx-card { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); }
.psx-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.psx-status { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.psx-status-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.psx-status-label { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.psx-status-value { font-size: 14px; line-height: 22px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.psx-meta { display: flex; flex-direction: column; gap: 3px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.psx-test-result { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.psx-test-result--ok { color: var(--dsw-alias-state-success-primary); }
.psx-test-result--error { color: var(--dsw-alias-state-error-primary); }
.psx-banner { padding: 8px 12px; border-radius: 8px; font-size: 13px; line-height: 20px; border: .5px solid var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 9%, transparent); }
.psx-banner--warn { border-color: var(--dsw-alias-state-warn-primary); color: var(--dsw-alias-state-warn-primary); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 9%, transparent); }
.psx-banner-title { font-weight: 500; margin-right: 4px; }
.psx-mode-list { display: flex; flex-direction: column; gap: 6px; }
.psx-mode-option { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 10px; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; text-align: left; cursor: pointer; }
.psx-mode-option:hover { background: var(--dsw-alias-bg-layer-2); }
.psx-mode-option:disabled { opacity: .5; cursor: default; }
.psx-mode-option--active { border-color: #4d6bfe; background: color-mix(in srgb, #4d6bfe 8%, transparent); }
.psx-mode-icon { flex: none; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-secondary); }
.psx-mode-option--active .psx-mode-icon { color: #4d6bfe; }
.psx-mode-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.psx-mode-title { font-size: 13px; line-height: 19px; font-weight: 500; }
.psx-mode-hint { color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; }
.psx-select { height: 32px; padding: 0 8px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); color-scheme: inherit; font: inherit; font-size: 13px; outline: 0; }
.psx-select:focus { border-color: #4d6bfe; }
.psx-server { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-base); }
.psx-server-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.psx-server-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.psx-server-name { font-size: 13px; line-height: 20px; font-weight: 500; }
.psx-tag { padding: 1px 6px; border: .5px solid var(--dsw-alias-border-l2); border-radius: 4px; color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; }
.psx-tag--active { border-color: #4d6bfe; color: #4d6bfe; }
.psx-url { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; word-break: break-all; }
.psx-row-actions { flex: none; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.psx-button { box-sizing: border-box; display: inline-flex; flex-direction: row; align-items: center; justify-content: center; gap: 6px; height: 30px; padding: 0 10px; border: .5px solid var(--dsw-alias-border-l2); border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; white-space: nowrap; }
.psx-button:hover { background: var(--dsw-alias-bg-layer-2); }
.psx-button:disabled { opacity: .5; cursor: default; }
.psx-button--primary { border-color: transparent; background: #4d6bfe; color: #fff; }
.psx-button--primary:hover { background: #3f5be0; opacity: 1; }
.psx-button--danger { border-color: transparent; color: var(--dsw-alias-state-error-primary); }
.psx-button--ghost { border-color: transparent; color: var(--dsw-alias-label-secondary); }
.psx-card-head { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.psx-status { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 12px; flex-wrap: wrap; }
.psx-server { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; gap: 10px; padding: 10px 12px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-base); }
.psx-server-head { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 6px; flex-wrap: wrap; }
.psx-row-actions { box-sizing: border-box; flex: none; display: flex; flex-direction: row; align-items: center; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.psx-sub { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; gap: 10px; padding: 10px 12px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-base); }
.psx-sub-head { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 6px; flex-wrap: wrap; }
.psx-rule { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 7px 9px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-base); }
.psx-form { display: flex; flex-direction: column; gap: 10px; padding: 12px; border: .5px solid var(--dsw-alias-border-l2); border-radius: 10px; background: var(--dsw-alias-bg-layer-2); }
.psx-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; line-height: 20px; }
.psx-input { height: 32px; padding: 0 10px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; outline: 0; }
.psx-input:focus { border-color: #4d6bfe; }
.psx-hint { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.psx-form-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
.psx-empty { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
.psx-confirm { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; font-size: 12px; color: var(--dsw-alias-state-error-primary); }
.psx-divider { height: 1px; margin: 2px 0; background: var(--dsw-alias-border-l1); }
.psx-rule { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-base); }
.psx-rule-pattern { min-width: 0; flex: 1; font-size: 12px; line-height: 18px; word-break: break-all; }
.psx-rule-add { display: flex; align-items: flex-end; gap: 8px; flex-wrap: wrap; }
.psx-rule-add .psx-field { flex: 1; min-width: 160px; }
.psx-sub { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-base); }
.psx-sub-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.psx-sub-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.psx-sub-name { font-size: 13px; line-height: 20px; font-weight: 500; }
.psx-check { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.psx-check input { accent-color: #4d6bfe; }
.psx-error-text { color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 18px; word-break: break-word; }
.psx-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
`

    function errorText(error, t) {
      if (!error) return ''
      const code = typeof error === 'string' ? error : error.code
      if (code) {
        const mapped = t(`error.${code}`)
        if (mapped && mapped !== `error.${code}`) return mapped
      }
      const message = typeof error === 'string' ? error : error.message ?? String(error)
      return t('error.generic', { message })
    }

    function maskUrl(raw) {
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

    function activeServer(state) {
      return (state.servers ?? []).find((server) => server.id === state.autoServerId)
    }

    function modeLabel(state, t) {
      if (state.activeMode === 'auto') return t('mode.auto')
      if (state.activeMode === 'direct') return t('mode.direct')
      return t('mode.system')
    }

    function modeHint(state, t) {
      if (state.activeMode === 'auto') {
        const server = activeServer(state)
        return server ? server.name : t('modes.noServer')
      }
      return state.activeMode === 'direct' ? t('mode.directHint') : t('mode.systemHint')
    }

    function modeState(state) {
      if (!state) return 'idle'
      if (state.activeMode === 'auto') return 'proxy'
      if (state.activeMode === 'direct') return 'direct'
      return 'system'
    }

    function fmtTime(value) {
      if (!value) return ''
      try {
        return new Date(value).toLocaleString()
      } catch {
        return ''
      }
    }

    function GlobeIcon(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 14,
          height: 14,
          'aria-hidden': 'true',
          className: props?.className,
        },
        h('circle', { cx: 8, cy: 8, r: 6, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }),
        h('ellipse', {
          cx: 8,
          cy: 8,
          rx: 2.7,
          ry: 6,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.1,
          opacity: 0.8,
        }),
        h('path', {
          d: 'M2.4 6h11.2M2.4 10h11.2',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.1,
          opacity: 0.8,
        }),
      )
    }

    function ChevronIcon(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 10,
          height: 10,
          'aria-hidden': 'true',
          className: props?.className,
        },
        h('path', {
          d: 'M4 6l4 4 4-4',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function PlusIcon(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 12,
          height: 12,
          'aria-hidden': 'true',
          className: props?.className,
        },
        h('path', {
          d: 'M8 3v10M3 8h10',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
        }),
      )
    }

    function CheckIcon(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 14,
          height: 14,
          'aria-hidden': 'true',
          className: props?.className,
        },
        h('path', {
          d: 'M3.5 8.5l3 3 6-6',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function MonitorIcon(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 14,
          height: 14,
          'aria-hidden': 'true',
          className: props?.className,
        },
        h('rect', {
          x: 2,
          y: 3,
          width: 12,
          height: 8,
          rx: 1.5,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
        }),
        h('path', {
          d: 'M5.5 13h5M8 11v2',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
        }),
      )
    }

    function OffIcon(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 14,
          height: 14,
          'aria-hidden': 'true',
          className: props?.className,
        },
        h('circle', { cx: 8, cy: 8, r: 5.5, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }),
        h('path', {
          d: 'M4.4 11.6l7.2-7.2',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
        }),
      )
    }

    function ServerIcon(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 14,
          height: 14,
          'aria-hidden': 'true',
          className: props?.className,
        },
        h('rect', {
          x: 2.5,
          y: 2.5,
          width: 11,
          height: 4.5,
          rx: 1,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
        }),
        h('rect', {
          x: 2.5,
          y: 9,
          width: 11,
          height: 4.5,
          rx: 1,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
        }),
        h('path', { d: 'M5 4.75h.01M5 11.25h.01', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }),
      )
    }

    function RouteIcon(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 14,
          height: 14,
          'aria-hidden': 'true',
          className: props?.className,
        },
        h('circle', { cx: 3.5, cy: 12, r: 1.8, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }),
        h('circle', { cx: 12.5, cy: 4, r: 1.8, fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }),
        h('path', {
          d: 'M5.3 12h3.2a3.5 3.5 0 0 0 3.5-3.5v-3',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
        }),
      )
    }

    function SlidersIcon(props) {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 14,
          height: 14,
          'aria-hidden': 'true',
          className: props?.className,
        },
        h('path', {
          d: 'M2.5 5h11M2.5 11h11',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
        }),
        h('circle', {
          cx: 6,
          cy: 5,
          r: 1.6,
          fill: 'var(--dsw-alias-bg-overlay)',
          stroke: 'currentColor',
          strokeWidth: 1.2,
        }),
        h('circle', {
          cx: 10,
          cy: 11,
          r: 1.6,
          fill: 'var(--dsw-alias-bg-overlay)',
          stroke: 'currentColor',
          strokeWidth: 1.2,
        }),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)

        // The sidebar control is shadow-scoped, so theme values are resolved
        // here on the host document and copied onto the shadow host as inline
        // custom properties (they inherit across the shadow boundary).
        const HOST_VARS = [
          '--dsw-alias-bg-base',
          '--dsw-alias-bg-layer-1',
          '--dsw-alias-bg-layer-2',
          '--dsw-alias-bg-overlay',
          '--dsw-alias-border-l1',
          '--dsw-alias-border-l2',
          '--dsw-alias-border-l3',
          '--dsw-alias-label-primary',
          '--dsw-alias-label-secondary',
          '--dsw-alias-label-tertiary',
          '--dsw-alias-state-idle-primary',
          '--dsw-alias-state-warn-primary',
          '--dsw-alias-state-error-primary',
          '--dsw-alias-state-success-primary',
          '--dsw-specific-sidebar-fill',
          '--ds-transition-duration-slow',
          '--ds-ease-in-out',
        ]

        function themeVars() {
          if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') return {}
          const styles = getComputedStyle(document.documentElement)
          const vars = {}
          for (const name of HOST_VARS) {
            const value = styles.getPropertyValue(name).trim()
            if (value !== '') vars[name] = value
          }
          return vars
        }
        const store = {
          snapshot: { phase: 'idle', state: null, error: null, busy: null, test: null },
          listeners: new Set(),
          get() {
            return this.snapshot
          },
          update(patch) {
            this.snapshot = { ...this.snapshot, ...patch }
            for (const listener of [...this.listeners]) listener(this.snapshot)
          },
          subscribe(listener) {
            this.listeners.add(listener)
            return () => this.listeners.delete(listener)
          },
        }

        async function request(action, init = {}) {
          const response = await fetch(ROUTE + action, {
            cache: 'no-store',
            ...init,
            headers: {
              ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
              ...(init.headers ?? {}),
            },
          })
          const payload = await response.json().catch(() => null)
          if (!response.ok) {
            const error = new Error(payload?.error?.message ?? `HTTP ${response.status}`)
            error.code = payload?.error?.code ?? 'badRequest'
            error.state = payload?.state
            error.details = payload?.error?.details
            throw error
          }
          return payload
        }

        function asError(error) {
          return {
            code: error?.code ?? 'applyFailed',
            message: error instanceof Error ? error.message : String(error),
            details: error?.details,
          }
        }

        store.load = async function load() {
          if (this.snapshot.phase === 'loading') return
          this.update({ phase: 'loading', error: null })
          try {
            const payload = await request('state')
            this.update({ phase: 'ready', state: payload.state, error: null })
          } catch (error) {
            this.update({ phase: this.snapshot.state ? 'ready' : 'error', error: asError(error) })
          }
        }

        store.mutate = async function mutate(kind, action, body) {
          this.update({ busy: kind, error: null })
          try {
            const payload = await request(action, {
              method: 'POST',
              body: JSON.stringify(body ?? {}),
            })
            this.update({ busy: null, phase: 'ready', state: payload.state, error: null })
            return true
          } catch (error) {
            this.update({
              busy: null,
              error: asError(error),
              state: error?.state ?? this.snapshot.state,
            })
            return false
          }
        }

        store.setMode = function setMode(mode, serverId) {
          return this.mutate('mode', 'mode', { mode, serverId })
        }
        store.saveServers = function saveServers(servers) {
          return this.mutate('servers', 'servers', { servers })
        }
        store.saveSubscriptions = function saveSubscriptions(subscriptions) {
          return this.mutate('subscriptions', 'subscriptions', { subscriptions })
        }
        store.saveManualRules = function saveManualRules(rules) {
          return this.mutate('rules', 'manual-rules', { rules })
        }
        store.saveAuto = function saveAuto(defaultBehavior) {
          return this.mutate('auto', 'auto', { defaultBehavior })
        }
        store.refresh = function refresh(id) {
          return this.mutate('refresh', 'refresh', id ? { id } : {})
        }
        store.test = async function test() {
          this.update({ busy: 'test', test: { phase: 'running' } })
          try {
            const payload = await request('test', { method: 'POST', body: '{}' })
            this.update({
              busy: null,
              state: payload.state ?? this.snapshot.state,
              test: { phase: 'done', result: payload.result },
            })
          } catch (error) {
            this.update({ busy: null, test: { phase: 'error', message: error?.message ?? String(error) } })
          }
        }

        function useStore() {
          const [snapshot, setSnapshot] = React.useState(store.get())
          React.useEffect(() => {
            const unsubscribe = store.subscribe(setSnapshot)
            if (store.get().phase === 'idle') store.load()
            return unsubscribe
          }, [])
          return snapshot
        }

        // The shell's global button/span rules can beat a plugin's plain class
        // selectors inside the sidebar, so every control states its own layout,
        // background and display instead of relying on defaults.
        function InlineStyle() {
          return h('style', { 'data-proxy-switchy': 'true' }, CSS)
        }

        function useThemeVars() {
          const [vars, setVars] = React.useState(() => themeVars())
          React.useEffect(() => {
            let frame = 0
            const refresh = () => {
              cancelAnimationFrame(frame)
              frame = requestAnimationFrame(() => setVars(themeVars()))
            }
            const observer = new MutationObserver(refresh)
            observer.observe(document.documentElement, {
              attributes: true,
              attributeFilter: ['class', 'style', 'data-theme'],
            })
            const media = window.matchMedia?.('(prefers-color-scheme: dark)')
            media?.addEventListener?.('change', refresh)
            return () => {
              cancelAnimationFrame(frame)
              observer.disconnect()
              media?.removeEventListener?.('change', refresh)
            }
          }, [])
          return vars
        }

        function Tag(props) {
          return h('span', { className: `psx-tag${props.active ? ' psx-tag--active' : ''}` }, props.children)
        }

        function MenuItem(props) {
          return h(
            'button',
            {
              type: 'button',
              role: 'menuitemradio',
              'aria-checked': props.active ? 'true' : 'false',
              className: `psx-menu-item${props.active ? ' psx-menu-item--active' : ''}`,
              disabled: props.disabled === true,
              title: props.title,
              onClick: props.onSelect,
            },
            h('span', { className: 'psx-menu-icon' }, props.icon),
            h(
              'span',
              { className: 'psx-menu-body' },
              h('span', { className: 'psx-menu-label' }, props.label),
              props.hint && h('span', { className: 'psx-menu-hint' }, props.hint),
            ),
            props.active && h(CheckIcon, { className: 'psx-menu-check' }),
          )
        }

        function ModeOption(props) {
          return h(
            'button',
            {
              type: 'button',
              className: `psx-mode-option${props.active ? ' psx-mode-option--active' : ''}`,
              disabled: props.disabled,
              onClick: props.onSelect,
            },
            h('span', { className: 'psx-mode-icon' }, props.icon),
            h(
              'span',
              { className: 'psx-mode-text' },
              h('span', { className: 'psx-mode-title' }, props.label),
              h('span', { className: 'psx-mode-hint' }, props.hint),
            ),
            props.active && h(CheckIcon, { className: 'psx-menu-check' }),
          )
        }

        function Field(props) {
          return h(
            'label',
            { className: 'psx-field' },
            props.label,
            props.children,
            props.hint && h('span', { className: 'psx-hint' }, props.hint),
          )
        }

        function ProxyManager(props) {
          const snapshot = useStore()
          const translate = props?.t ?? t
          const state = snapshot.state
          const themeVars = useThemeVars()
          const [serverEditor, setServerEditor] = React.useState(null)
          const [subEditor, setSubEditor] = React.useState(null)
          const [confirm, setConfirm] = React.useState(null)
          const [rulePattern, setRulePattern] = React.useState('')
          const [ruleBehavior, setRuleBehavior] = React.useState('proxy')
          const busy = snapshot.busy !== null

          if (!state) {
            return h(
              'section',
              { className: 'psx-section' },
              h(InlineStyle),
              h('h2', { className: 'psx-title' }, translate('control.manage')),
              h(
                'div',
                { className: 'psx-card' },
                h(
                  'p',
                  { className: 'psx-empty' },
                  snapshot.phase === 'error'
                    ? errorText(snapshot.error, translate)
                    : translate('control.loading'),
                ),
                snapshot.phase === 'error' &&
                  h(
                    'button',
                    { type: 'button', className: 'psx-button', onClick: () => store.load() },
                    translate('status.retry'),
                  ),
              ),
            )
          }

          const servers = state.servers ?? []
          const subscriptions = state.subscriptions ?? []
          const manualRules = state.manualRules ?? []
          const applied = state.activeMode === 'auto' ? activeServer(state) : null
          const systemLabel = state.system
            ? `${state.system.protocol ? `${state.system.protocol}://` : ''}${state.system.host}`
            : null
          const test = snapshot.test
          const testing = snapshot.busy === 'test'

          const chooseMode = (mode) => {
            if (busy) return
            if (mode === 'auto' && !state.autoServerId) {
              setServerEditor({ mode: 'new', name: '', url: '' })
              return
            }
            store.setMode(mode)
          }

          const startNewServer = () => {
            setConfirm(null)
            setServerEditor({ mode: 'new', name: '', url: '' })
          }
          const startEditServer = (server) => {
            setConfirm(null)
            setServerEditor({
              mode: 'edit',
              id: server.id,
              name: server.name,
              url: server.url,
            })
          }
          const saveServer = async (event) => {
            event?.preventDefault?.()
            if (!serverEditor) return
            const draft = {
              name: serverEditor.name,
              url: serverEditor.url,
            }
            const next = servers.map((server) => ({ ...server }))
            if (serverEditor.mode === 'edit') {
              const index = next.findIndex((server) => server.id === serverEditor.id)
              if (index === -1) {
                setServerEditor(null)
                return
              }
              next[index] = { ...next[index], ...draft }
            } else {
              next.push(draft)
            }
            if (await store.saveServers(next)) setServerEditor(null)
          }
          const removeServer = async (id) => {
            if (await store.saveServers(servers.filter((server) => server.id !== id))) setConfirm(null)
          }

          const startNewSub = () => {
            setConfirm(null)
            setSubEditor({
              mode: 'new',
              name: '',
              url: '',
              format: 'switchy',
              behavior: 'direct',
              intervalMinutes: 720,
              enabled: true,
            })
          }
          const startEditSub = (sub) => {
            setConfirm(null)
            setSubEditor({
              mode: 'edit',
              id: sub.id,
              name: sub.name,
              url: sub.url,
              format: sub.format,
              behavior: sub.behavior,
              intervalMinutes: sub.intervalMinutes ?? 720,
              enabled: sub.enabled !== false,
            })
          }
          const saveSub = async (event) => {
            event?.preventDefault?.()
            if (!subEditor) return
            const draft = {
              name: subEditor.name,
              url: subEditor.url,
              format: subEditor.format,
              behavior: subEditor.behavior,
              intervalMinutes: Number(subEditor.intervalMinutes) || 720,
              enabled: subEditor.enabled !== false,
            }
            const next = subscriptions.map((sub) => ({ ...sub }))
            if (subEditor.mode === 'edit') {
              const index = next.findIndex((sub) => sub.id === subEditor.id)
              if (index === -1) {
                setSubEditor(null)
                return
              }
              next[index] = { ...next[index], ...draft }
            } else {
              next.push(draft)
            }
            if (await store.saveSubscriptions(next)) setSubEditor(null)
          }
          const removeSub = async (id) => {
            if (await store.saveSubscriptions(subscriptions.filter((sub) => sub.id !== id))) setConfirm(null)
          }
          const toggleSub = (sub, enabled) => {
            const next = subscriptions.map((entry) =>
              entry.id === sub.id ? { id: entry.id, ...editableSub(entry), enabled } : { id: entry.id, ...editableSub(entry) },
            )
            store.saveSubscriptions(next)
          }
          const editableSub = (sub) => ({
            name: sub.name,
            url: sub.url,
            format: sub.format,
            behavior: sub.behavior,
            intervalMinutes: sub.intervalMinutes,
            enabled: sub.enabled !== false,
          })

          const addManualRule = async () => {
            if (rulePattern.trim() === '') return
            const next = [...manualRules, { pattern: rulePattern.trim(), behavior: ruleBehavior }]
            if (await store.saveManualRules(next)) setRulePattern('')
          }
          const removeManualRule = async (id) => {
            await store.saveManualRules(manualRules.filter((rule) => rule.id !== id))
          }

          return h(
            'section',
            { className: 'psx-section', style: themeVars },
            h(InlineStyle),
            h('h2', { className: 'psx-title' }, translate('control.manage')),
            h('p', { className: 'psx-intro' }, translate('servers.intro')),

            !state.supported &&
              h(
                'div',
                { className: 'psx-banner psx-banner--warn' },
                h('span', { className: 'psx-banner-title' }, translate('warning.unsupportedTitle')),
                translate('warning.unsupportedDetail'),
              ),

            snapshot.error &&
              !serverEditor &&
              !subEditor &&
              h('div', { className: 'psx-banner' }, errorText(snapshot.error, translate)),

            h(
              'div',
              { className: 'psx-card' },
              h(
                'div',
                { className: 'psx-status' },
                h(
                  'div',
                  { className: 'psx-status-main' },
                  h('span', { className: 'psx-status-label' }, translate('status.active')),
                  h('span', { className: 'psx-status-value' }, modeLabel(state, translate)),
                  applied && h('span', { className: 'psx-url' }, maskUrl(applied.url)),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'psx-button',
                    disabled: testing || busy,
                    onClick: () => store.test(),
                  },
                  testing ? translate('status.testing') : translate('status.test'),
                ),
              ),
              h(
                'div',
                { className: 'psx-meta' },
                h(
                  'span',
                  null,
                  systemLabel
                    ? translate('status.systemProxy', { proxy: systemLabel })
                    : translate('status.systemNone'),
                ),
                h(
                  'span',
                  null,
                  translate('status.runtime', {
                    node: state.node ?? '—',
                    electron: state.electron ?? '—',
                  }),
                ),
                h(
                  'span',
                  null,
                  state.lastAppliedAt
                    ? translate('status.lastApplied', { time: fmtTime(state.lastAppliedAt) })
                    : translate('status.neverApplied'),
                ),
                state.activeMode === 'auto' &&
                  h(
                    'span',
                    null,
                    translate('status.rulesActive'),
                  ),
              ),
              test?.phase === 'done' &&
                h(
                  'span',
                  {
                    className: `psx-test-result ${
                      test.result?.ok ? 'psx-test-result--ok' : 'psx-test-result--error'
                    }`,
                  },
                  test.result?.ok
                    ? translate('status.testOk', {
                        ms: test.result.latencyMs,
                        status: test.result.status,
                      })
                    : `${translate('status.testFailed')}${
                        test.result?.message ? ` · ${test.result.message}` : ''
                      }`,
                ),
              test?.phase === 'error' &&
                h(
                  'span',
                  { className: 'psx-test-result psx-test-result--error' },
                  `${translate('status.testFailed')} · ${test.message}`,
                ),
            ),

            h(
              'div',
              { className: 'psx-card' },
              h('h3', { className: 'psx-subtitle' }, translate('modes.title')),
              h('p', { className: 'psx-hint' }, translate('modes.intro')),
              h(
                'div',
                { className: 'psx-mode-list' },
                h(ModeOption, {
                  active: state.activeMode === 'system',
                  icon: h(MonitorIcon),
                  label: translate('mode.system'),
                  hint: translate('mode.systemHint'),
                  disabled: busy,
                  onSelect: () => chooseMode('system'),
                }),
                h(ModeOption, {
                  active: state.activeMode === 'direct',
                  icon: h(OffIcon),
                  label: translate('mode.direct'),
                  hint: translate('mode.directHint'),
                  disabled: busy,
                  onSelect: () => chooseMode('direct'),
                }),
                h(ModeOption, {
                  active: state.activeMode === 'auto',
                  icon: h(RouteIcon),
                  label: translate('mode.auto'),
                  hint: state.autoServerId ? translate('mode.autoHint') : translate('modes.noServer'),
                  disabled: busy,
                  onSelect: () => chooseMode('auto'),
                }),
              ),
              state.activeMode === 'auto' &&
                h(
                  Field,
                  { label: translate('modes.autoServer') },
                  h(
                    'select',
                    {
                      className: 'psx-select',
                      value: state.autoServerId ?? '',
                      disabled: busy,
                      onChange: (event) => store.setMode('auto', event.target.value),
                    },
                    servers.map((server) =>
                      h('option', { key: server.id, value: server.id }, `${server.name} · ${maskUrl(server.url)}`),
                    ),
                  ),
                ),
              state.activeMode === 'auto' &&
                h(
                  Field,
                  { label: translate('modes.defaultBehavior') },
                  h(
                    'select',
                    {
                      className: 'psx-select',
                      value: state.autoDefault === 'direct' ? 'direct' : 'proxy',
                      disabled: busy,
                      onChange: (event) => store.saveAuto(event.target.value),
                    },
                    h('option', { value: 'proxy' }, translate('modes.defaultProxy')),
                    h('option', { value: 'direct' }, translate('modes.defaultDirect')),
                  ),
                ),
            ),

            h(
              'div',
              { className: 'psx-card' },
              h(
                'div',
                { className: 'psx-card-head' },
                h('h3', { className: 'psx-subtitle' }, translate('servers.title')),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'psx-button psx-button--primary',
                    disabled: busy || servers.length >= 50,
                    onClick: startNewServer,
                  },
                  translate('servers.add'),
                ),
              ),
              h('p', { className: 'psx-hint' }, translate('servers.intro')),
              servers.length === 0
                ? h('p', { className: 'psx-empty' }, translate('servers.empty'))
                : h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                    servers.map((server) =>
                      h(
                        'div',
                        { key: server.id, className: 'psx-server' },
                        h(
                          'div',
                          { className: 'psx-server-main' },
                          h(
                            'div',
                            { className: 'psx-server-head' },
                            h('span', { className: 'psx-server-name' }, server.name),
                            state.autoServerId === server.id &&
                              h(Tag, { active: true }, translate('servers.autoTag')),
                          ),
                          h('span', { className: 'psx-url' }, maskUrl(server.url)),
                        ),
                        confirm?.kind === 'server' && confirm.id === server.id
                          ? h(
                              'div',
                              { className: 'psx-confirm' },
                              translate('servers.deleteConfirm'),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'psx-button psx-button--danger',
                                  disabled: busy,
                                  onClick: () => removeServer(server.id),
                                },
                                translate('common.delete'),
                              ),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'psx-button psx-button--ghost',
                                  disabled: busy,
                                  onClick: () => setConfirm(null),
                                },
                                translate('common.cancel'),
                              ),
                            )
                          : h(
                              'div',
                              { className: 'psx-row-actions' },
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'psx-button psx-button--ghost',
                                  disabled: busy,
                                  onClick: () => startEditServer(server),
                                },
                                translate('common.edit'),
                              ),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'psx-button psx-button--danger',
                                  disabled: busy,
                                  onClick: () => setConfirm({ kind: 'server', id: server.id }),
                                },
                                translate('common.delete'),
                              ),
                            ),
                      ),
                    ),
                  ),
              serverEditor &&
                h(
                  'form',
                  { className: 'psx-form', onSubmit: saveServer },
                  h(
                    'h3',
                    { className: 'psx-subtitle' },
                    translate(serverEditor.mode === 'new' ? 'servers.newTitle' : 'servers.editTitle'),
                  ),
                  h(
                    Field,
                    { label: translate('servers.name') },
                    h('input', {
                      className: 'psx-input',
                      value: serverEditor.name,
                      maxLength: 60,
                      autoFocus: true,
                      placeholder: translate('servers.namePlaceholder'),
                      onChange: (event) =>
                        setServerEditor((current) => ({ ...current, name: event.target.value })),
                    }),
                  ),
                  h(
                    Field,
                    { label: translate('servers.url'), hint: translate('servers.urlHint') },
                    h('input', {
                      className: 'psx-input',
                      value: serverEditor.url,
                      placeholder: translate('servers.urlPlaceholder'),
                      spellCheck: false,
                      onChange: (event) =>
                        setServerEditor((current) => ({ ...current, url: event.target.value })),
                    }),
                  ),
                  snapshot.error && h('div', { className: 'psx-banner' }, errorText(snapshot.error, translate)),
                  h(
                    'div',
                    { className: 'psx-form-actions' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'psx-button psx-button--ghost',
                        disabled: busy,
                        onClick: () => setServerEditor(null),
                      },
                      translate('common.cancel'),
                    ),
                    h(
                      'button',
                      { type: 'submit', className: 'psx-button psx-button--primary', disabled: busy },
                      translate('common.save'),
                    ),
                  ),
                ),
            ),

            h(
              'div',
              { className: 'psx-card' },
              h('h3', { className: 'psx-subtitle' }, translate('rules.title')),
              h('p', { className: 'psx-hint' }, translate('rules.intro')),
              h('div', { className: 'psx-divider' }),
              h('h4', { className: 'psx-subtitle' }, translate('rules.manualTitle')),
              manualRules.length === 0
                ? h('p', { className: 'psx-empty' }, translate('rules.manualEmpty'))
                : h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                    manualRules.map((rule) =>
                      h(
                        'div',
                        { key: rule.id, className: 'psx-rule' },
                        h('span', { className: 'psx-rule-pattern psx-code' }, rule.pattern),
                        h(
                          Tag,
                          { active: rule.behavior === 'proxy' },
                          rule.behavior === 'proxy'
                            ? translate('rules.behaviorProxy')
                            : translate('rules.behaviorDirect'),
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'psx-button psx-button--danger',
                            disabled: busy,
                            onClick: () => removeManualRule(rule.id),
                          },
                          translate('common.delete'),
                        ),
                      ),
                    ),
                  ),
              h(
                'div',
                { className: 'psx-rule-add' },
                h(
                  Field,
                  { label: translate('rules.pattern'), hint: translate('rules.manualHint') },
                  h('input', {
                    className: 'psx-input',
                    value: rulePattern,
                    placeholder: translate('rules.patternPlaceholder'),
                    spellCheck: false,
                    onChange: (event) => setRulePattern(event.target.value),
                  }),
                ),
                h(
                  Field,
                  { label: translate('rules.behavior') },
                  h(
                    'select',
                    {
                      className: 'psx-select',
                      value: ruleBehavior,
                      onChange: (event) => setRuleBehavior(event.target.value),
                    },
                    h('option', { value: 'proxy' }, translate('rules.behaviorProxy')),
                    h('option', { value: 'direct' }, translate('rules.behaviorDirect')),
                  ),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'psx-button',
                    disabled: busy || rulePattern.trim() === '',
                    onClick: addManualRule,
                  },
                  translate('rules.addManual'),
                ),
              ),
              h('div', { className: 'psx-divider' }),
              h(
                'div',
                { className: 'psx-card-head' },
                h('h4', { className: 'psx-subtitle' }, translate('rules.subscriptionsTitle')),
                h(
                  'div',
                  { className: 'psx-row-actions' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'psx-button',
                      disabled: busy,
                      onClick: () => store.refresh(null),
                    },
                    snapshot.busy === 'refresh' ? translate('common.updating') : translate('rules.updateAll'),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'psx-button psx-button--primary',
                      disabled: busy || subscriptions.length >= 30,
                      onClick: startNewSub,
                    },
                    translate('rules.addSubscription'),
                  ),
                ),
              ),
              subscriptions.length === 0
                ? h('p', { className: 'psx-empty' }, translate('rules.subscriptionsEmpty'))
                : h(
                    'div',
                    { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                    subscriptions.map((sub) =>
                      h(
                        'div',
                        { key: sub.id, className: 'psx-sub' },
                        h(
                          'div',
                          { className: 'psx-sub-main' },
                          h(
                            'div',
                            { className: 'psx-sub-head' },
                            h('span', { className: 'psx-sub-name' }, sub.name),
                            h(
                              Tag,
                              null,
                              sub.format === 'autoproxy'
                                ? translate('rules.formatAutoProxy')
                                : translate('rules.formatSwitchy'),
                            ),
                            h(
                              Tag,
                              { active: sub.behavior === 'direct' },
                              sub.behavior === 'direct'
                                ? translate('rules.behaviorDirect')
                                : translate('rules.behaviorProxy'),
                            ),
                            h(
                              'label',
                              { className: 'psx-check' },
                              h('input', {
                                type: 'checkbox',
                                checked: sub.enabled !== false,
                                disabled: busy,
                                onChange: (event) => toggleSub(sub, event.target.checked),
                              }),
                              translate('rules.enabled'),
                            ),
                          ),
                          h('span', { className: 'psx-url' }, sub.url),
                          h(
                            'span',
                            { className: 'psx-hint' },
                            `${translate('rules.ruleCount', { count: sub.ruleCount ?? 0 })} · ${
                              sub.lastUpdatedAt
                                ? translate('rules.lastUpdated', { time: fmtTime(sub.lastUpdatedAt) })
                                : translate('rules.neverUpdated')
                            } · ${translate('rules.subInterval')}: ${sub.intervalMinutes ?? 720}`,
                          ),
                          sub.lastError &&
                            h(
                              'span',
                              { className: 'psx-error-text' },
                              translate('rules.error', { message: sub.lastError }),
                            ),
                        ),
                        confirm?.kind === 'sub' && confirm.id === sub.id
                          ? h(
                              'div',
                              { className: 'psx-confirm' },
                              translate('rules.deleteConfirm'),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'psx-button psx-button--danger',
                                  disabled: busy,
                                  onClick: () => removeSub(sub.id),
                                },
                                translate('common.delete'),
                              ),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'psx-button psx-button--ghost',
                                  disabled: busy,
                                  onClick: () => setConfirm(null),
                                },
                                translate('common.cancel'),
                              ),
                            )
                          : h(
                              'div',
                              { className: 'psx-row-actions' },
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'psx-button',
                                  disabled: busy,
                                  onClick: () => store.refresh(sub.id),
                                },
                                translate('rules.update'),
                              ),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'psx-button psx-button--ghost',
                                  disabled: busy,
                                  onClick: () => startEditSub(sub),
                                },
                                translate('common.edit'),
                              ),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'psx-button psx-button--danger',
                                  disabled: busy,
                                  onClick: () => setConfirm({ kind: 'sub', id: sub.id }),
                                },
                                translate('common.delete'),
                              ),
                            ),
                      ),
                    ),
                  ),
              subEditor &&
                h(
                  'form',
                  { className: 'psx-form', onSubmit: saveSub },
                  h(
                    'h3',
                    { className: 'psx-subtitle' },
                    translate(subEditor.mode === 'new' ? 'rules.newTitle' : 'rules.editTitle'),
                  ),
                  h(
                    Field,
                    { label: translate('rules.subName') },
                    h('input', {
                      className: 'psx-input',
                      value: subEditor.name,
                      maxLength: 60,
                      autoFocus: true,
                      onChange: (event) =>
                        setSubEditor((current) => ({ ...current, name: event.target.value })),
                    }),
                  ),
                  h(
                    Field,
                    { label: translate('rules.subUrl') },
                    h('input', {
                      className: 'psx-input',
                      value: subEditor.url,
                      spellCheck: false,
                      placeholder: 'https://example.com/list.sorl',
                      onChange: (event) =>
                        setSubEditor((current) => ({ ...current, url: event.target.value })),
                    }),
                  ),
                  h(
                    Field,
                    { label: translate('rules.subFormat') },
                    h(
                      'select',
                      {
                        className: 'psx-select',
                        value: subEditor.format,
                        onChange: (event) =>
                          setSubEditor((current) => ({ ...current, format: event.target.value })),
                      },
                      h('option', { value: 'switchy' }, translate('rules.formatSwitchy')),
                      h('option', { value: 'autoproxy' }, translate('rules.formatAutoProxy')),
                    ),
                  ),
                  h(
                    Field,
                    { label: translate('rules.subBehavior'), hint: translate('rules.subBehaviorHint') },
                    h(
                      'select',
                      {
                        className: 'psx-select',
                        value: subEditor.behavior,
                        onChange: (event) =>
                          setSubEditor((current) => ({ ...current, behavior: event.target.value })),
                      },
                      h('option', { value: 'proxy' }, translate('rules.behaviorProxy')),
                      h('option', { value: 'direct' }, translate('rules.behaviorDirect')),
                    ),
                  ),
                  h(
                    Field,
                    { label: translate('rules.subInterval') },
                    h('input', {
                      className: 'psx-input',
                      type: 'number',
                      min: 15,
                      max: 10080,
                      value: subEditor.intervalMinutes,
                      onChange: (event) =>
                        setSubEditor((current) => ({
                          ...current,
                          intervalMinutes: event.target.value,
                        })),
                    }),
                  ),
                  snapshot.error && h('div', { className: 'psx-banner' }, errorText(snapshot.error, translate)),
                  h(
                    'div',
                    { className: 'psx-form-actions' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'psx-button psx-button--ghost',
                        disabled: busy,
                        onClick: () => setSubEditor(null),
                      },
                      translate('common.cancel'),
                    ),
                    h(
                      'button',
                      { type: 'submit', className: 'psx-button psx-button--primary', disabled: busy },
                      translate('common.save'),
                    ),
                  ),
                ),
            ),
          )
        }

        function ProxyManagerModal(props) {
          const translate = props?.t ?? t
          const onClose = props?.onClose
          const themeVars = useThemeVars()
          React.useEffect(() => {
            const onKey = (event) => {
              if (event.key === 'Escape') onClose?.()
            }
            window.addEventListener('keydown', onKey)
            return () => window.removeEventListener('keydown', onKey)
          }, [onClose])

          const overlay = h(
            'div',
            {
              className: 'psx-modal-backdrop',
              style: { ...themeVars, position: 'fixed', zIndex: 3000 },
              onMouseDown: (event) => {
                if (event.target === event.currentTarget) onClose?.()
              },
            },
            h(InlineStyle),
            h(
              'div',
              {
                className: 'psx-modal',
                role: 'dialog',
                'aria-modal': 'true',
                'aria-label': translate('control.manage'),
              },
              h(
                'button',
                {
                  type: 'button',
                  className: 'psx-modal-close',
                  'aria-label': translate('common.close'),
                  title: translate('common.close'),
                  onClick: onClose,
                },
                '×',
              ),
              h(ProxyManager, { t: translate }),
            ),
          )

          return createPortal ? createPortal(overlay, document.body) : overlay
        }

        function SidebarProxyAction(props) {
          const translate = props?.t ?? t
          const snapshot = useStore()
          const state = snapshot.state
          const themeVars = useThemeVars()
          const [open, setOpen] = React.useState(false)
          const [manager, setManager] = React.useState(false)
          const [menuPosition, setMenuPosition] = React.useState(null)
          const anchorRef = React.useRef(null)
          const menuRef = React.useRef(null)

          const closeMenu = () => {
            setOpen(false)
            setMenuPosition(null)
          }
          const openMenu = () => {
            if (!state) {
              setManager(true)
              return
            }
            const rect = anchorRef.current?.getBoundingClientRect()
            const width = 280
            setMenuPosition({
              left: rect ? Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) : 12,
              bottom: rect ? Math.max(12, window.innerHeight - rect.top + 8) : 60,
              width,
            })
            setOpen(true)
          }

          React.useEffect(() => {
            if (!open) return undefined
            const onPointerDown = (event) => {
              if (menuRef.current?.contains(event.target)) return
              if (anchorRef.current?.contains(event.target)) return
              closeMenu()
            }
            const onKeyDown = (event) => {
              if (event.key === 'Escape') closeMenu()
            }
            const onViewport = () => closeMenu()
            document.addEventListener('mousedown', onPointerDown)
            document.addEventListener('keydown', onKeyDown)
            window.addEventListener('resize', onViewport)
            window.addEventListener('scroll', onViewport, true)
            return () => {
              document.removeEventListener('mousedown', onPointerDown)
              document.removeEventListener('keydown', onKeyDown)
              window.removeEventListener('resize', onViewport)
              window.removeEventListener('scroll', onViewport, true)
            }
          }, [open])

          const choose = (mode) => {
            closeMenu()
            if (mode === 'auto' && !state?.autoServerId) {
              setManager(true)
              return
            }
            if (state && mode !== state.activeMode) store.setMode(mode)
          }

          const busy = snapshot.busy === 'mode'
          const label = state ? modeLabel(state, translate) : translate('control.loading')
          const hint = state ? modeHint(state, translate) : translate('control.manage')
          const wide = props?.wide === true

          const menu =
            open && menuPosition && state && createPortal
              ? createPortal(
                  h(
                    'div',
                    {
                      className: 'psx-menu',
                      ref: menuRef,
                      role: 'menu',
                      style: {
                        ...themeVars,
                        position: 'fixed',
                        left: menuPosition.left,
                        bottom: menuPosition.bottom,
                        width: menuPosition.width,
                        zIndex: 3000,
                      },
                    },
                    h(InlineStyle),
                    h(
                      'div',
                      { className: 'psx-menu-head' },
                      h('span', { className: 'psx-menu-head-icon' }, h(GlobeIcon)),
                      h(
                        'span',
                        { className: 'psx-menu-head-text' },
                        h('span', { className: 'psx-menu-head-title' }, label),
                        h('span', { className: 'psx-menu-head-sub' }, hint),
                      ),
                    ),
                    h('div', { className: 'psx-menu-sep' }),
                    h(MenuItem, {
                      active: state.activeMode === 'system',
                      icon: h(MonitorIcon),
                      label: translate('mode.system'),
                      hint: translate('mode.systemHint'),
                      onSelect: () => choose('system'),
                    }),
                    h(MenuItem, {
                      active: state.activeMode === 'direct',
                      icon: h(OffIcon),
                      label: translate('mode.direct'),
                      hint: translate('mode.directHint'),
                      onSelect: () => choose('direct'),
                    }),
                    h(MenuItem, {
                      active: state.activeMode === 'auto',
                      icon: h(RouteIcon),
                      label: translate('mode.auto'),
                      hint: translate('mode.autoHint'),
                      onSelect: () => choose('auto'),
                    }),
                    h('div', { className: 'psx-menu-sep' }),
                    h(MenuItem, {
                      icon: h(SlidersIcon),
                      label: translate('control.manage'),
                      onSelect: () => {
                        closeMenu()
                        setManager(true)
                      },
                    }),
                  ),
                  document.body,
                )
              : null

          return h(
            React.Fragment,
            null,
            h(InlineStyle),
            h(
              'div',
              { ref: anchorRef, className: 'psx-sidebar-anchor', style: themeVars },
              h(
                'button',
                {
                  type: 'button',
                  className: 'psx-sidebar-action',
                  title: hint,
                  'aria-label': hint,
                  'aria-haspopup': 'menu',
                  'aria-expanded': open,
                  'data-wide': wide ? '1' : '0',
                  onClick: () => (open ? closeMenu() : openMenu()),
                },
                h(
                  'span',
                  { className: 'psx-sidebar-mark', 'data-state': modeState(state) },
                  h(GlobeIcon, { className: 'psx-sidebar-icon' }),
                  h('span', { className: 'psx-sidebar-dot', 'data-state': modeState(state) }),
                ),
                wide &&
                  h(
                    'span',
                    { className: 'psx-sidebar-text' },
                    h('span', { className: 'psx-sidebar-label' }, label),
                    h('span', { className: 'psx-sidebar-sub' }, hint),
                  ),
                wide && h('span', { className: 'psx-sidebar-chevron-placeholder' }),
                busy && h('span', { className: 'psx-spinner', 'aria-hidden': 'true' }),
                wide &&
                  h(ChevronIcon, {
                    className: `psx-sidebar-chevron${open ? ' psx-sidebar-chevron--open' : ''}`,
                  }),
              ),
            ),
            menu,
            manager && h(ProxyManagerModal, { t: translate, onClose: () => setManager(false) }),
          )
        }

        ctx.effect(
          () => ctx.locale.register(NS, { zh, en }),
          'proxy-switchy: dictionaries',
        )

        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'proxy-switchy',
              order: 25,
              locale: NS,
              label: () => t('control.manage'),
            },
            ProxyManager,
          ),
        )

        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(
            {
              name: 'sidebar.footer.action',
              id: 'proxy-switchy',
              order: -10,
              locale: NS,
              label: () => t('control.manageShort'),
            },
            SidebarProxyAction,
          ),
        )
      },
    }
  },
})
