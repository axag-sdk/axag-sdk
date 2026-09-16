# @axag/shim

A `document.modelContext` for browsers that don't have one yet, so code written against [WebMCP](https://github.com/webmachinelearning/webmcp) runs unchanged.

```bash
npm install @axag/shim
```

```ts
import { installShim } from '@axag/shim';

installShim(); // no-op where the browser has its own implementation
```

Then register as usual — [`@axag/webmcp`](../webmcp) and the framework bindings find the shim exactly as they find a native implementation:

```ts
registerManifest(tools, { signal: route.signal, handlers });
```

## What it is, and isn't

It implements the part of the draft a page calls: `registerTool(tool, { signal })`, with abort unregistering. It keeps the registered tools somewhere a bridge or an inspector can read them.

Installing it **connects no agent**. It is the socket a connection plugs into — [`@axag/bridge`](../bridge) is one such connection.

## Reading the registry

```ts
import { getShimRegistry } from '@axag/shim';

const registry = getShimRegistry();
registry?.listTools();                       // what is registered right now
registry?.subscribe(tools => render(tools));  // called whenever that changes
await registry?.callTool('order_track', { order_id: 'o1' });
```

Under 2 KB gzipped, with no dependencies: this is the one piece that ships on every page.
