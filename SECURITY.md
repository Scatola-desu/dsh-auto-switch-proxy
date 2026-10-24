# Security

## Local router

Auto Switch starts an HTTP proxy on `127.0.0.1` with an ephemeral port. It is
not authenticated: any local process can use it while Auto mode is active. The
router is stopped when the plugin is disabled or unloaded.

## Credentials

Proxy URLs may embed a username and password. They are stored in plain text in:

```text
$DSH_HOME/proxy-switchy/state.json
```

Protect that file with the same care as other local credentials. The UI masks
credentials in lists, but the edit form exposes them.

## Rule subscriptions

Subscription downloads use the active outbound route. In Auto mode the
subscription host is temporarily forced through the selected server. A rule
list is text; it cannot execute code.

## Reporting

Open an issue without including proxy passwords, API keys, subscription
tokens, or full `state.json` contents.
