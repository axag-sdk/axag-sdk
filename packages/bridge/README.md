# @web-axag/bridge

Gives an MCP client — Claude Desktop, Claude Code, anything that speaks MCP — access to the tools a browser tab has registered.

```bash
npx axag-bridge
```

```text
[axag-bridge] listening on ws://127.0.0.1:53422
[axag-bridge] pairing code: 7f3a91c2
```

In the page:

```ts
import { installShim } from '@web-axag/shim';
import { connectBridge } from '@web-axag/bridge/client';

installShim();
connectBridge({ url: 'ws://127.0.0.1:53422', pairingCode: '7f3a91c2' });
```

The agent now lists and calls the tools that tab is offering, and the list changes as the person navigates.

## Why a relay

A browser tab can't be an MCP server that a desktop agent dials into: it has no address, and it isn't running when the agent starts. So the tab connects **out** to a small local process, which is the MCP server the agent connects to.

```text
browser tab  ──websocket──▶  axag-bridge  ──MCP (stdio)──▶  agent
```

Calls run **in the tab**, in the session the person is already signed into. No credentials pass through the relay, and the page's own [safety enforcers](../webmcp#safety-enforcers) wrap every call, so a bridged agent meets the same confirmation and tenant checks as one running in the browser.

## What keeps it closed

- **Loopback only.** The relay binds `127.0.0.1`.
- **A pairing code**, printed in the terminal and copied into the page. A tab that doesn't send it is refused.
- **An origin allowlist** with `--origin https://app.example.com`, repeatable. Without it any origin may pair — fine while developing locally, not otherwise.
- **One tab at a time.** A second connection is refused rather than silently taking over.
- **Calls expire.** A tab that never answers fails the call rather than hanging the agent.

## CLI

| Flag | Description |
|------|-------------|
| `--port <n>` | Port for the tab to connect to. Default: a free port |
| `--origin <url>` | Origin allowed to pair; repeatable |
| `--pairing <code>` | Fixed pairing code instead of a fresh one |

Configure it like any other MCP server:

```json
{
  "mcpServers": {
    "axag-bridge": { "command": "npx", "args": ["axag-bridge", "--origin", "https://app.example.com"] }
  }
}
```

## Embedding the relay

```ts
import { startBridgeServer } from '@web-axag/bridge';

const { mcp, relay, pairingCode, port, close } = await startBridgeServer({ allowedOrigins: ['https://app.example.com'] });
await mcp.connect(myTransport);
```

`relay.listTools()` and `relay.status()` are what an inspector renders.
