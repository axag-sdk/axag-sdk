# @axag/webmcp

Registers AXAG actions as [WebMCP](https://github.com/webmachinelearning/webmcp) tools, for as long as the UI they belong to is on screen.

```bash
npm install @axag/webmcp
```

## Registering the tools your build produced

```ts
import { registerManifest } from '@axag/webmcp';
import { tools } from 'virtual:axag/tools'; // from @axag/compiler

const route = new AbortController();
registerManifest(tools, {
  signal: route.signal,
  handlers: { user_deactivate: ({ user_id }) => api.deactivate(user_id) },
});

// Leaving the route takes the tools with it.
route.abort();
```

This path is ~1.8 KB gzipped: the tools were built ahead of time, so nothing that reads annotations ships to the browser.

## Registering one action

```ts
import { defineAction } from '@axag/core';
import { registerAction } from '@axag/webmcp';

const controller = new AbortController();
registerAction(
  defineAction({
    intent: 'user.deactivate',
    actionType: 'write',
    riskLevel: 'critical',
    requiredParameters: [{ name: 'user_id', type: 'string' }],
    handler: ({ user_id }) => api.deactivate(user_id),
  }),
  { element: button, signal: controller.signal },
);
```

For components, use the framework bindings instead: [`@axag/react`](../react), [`@axag/vue`](../vue), [`@axag/angular`](../angular).

## Reading the page instead

```ts
import { registerDocument } from '@axag/webmcp';

registerDocument({ signal: controller.signal });
```

Every annotated element on the page is registered, with parameters harvested from its form. Costs a DOM scan and ~7.9 KB gzipped, so prefer the build-time path where you have one.

## Lifecycle

- **Aborting the signal unregisters.** WebMCP has no `unregisterTool`; the signal *is* the lifecycle.
- **Operability is watched.** An action whose element is disabled, `hidden`, `inert`, `aria-hidden`, `aria-disabled` or detached is unregistered, and registered again when the element comes back. One `MutationObserver` serves every registration.
- **No handler needed.** The default handler fills the element's form from the tool's arguments — writing through the prototype setter so React and Vue see the change — then presses the control.

## Middleware

```ts
registerManifest(tools, {
  signal: route.signal,
  middleware: [
    async (ctx, next) => (await confirm(ctx.tool)) ? next() : { error: 'declined' },
  ],
});
```

Middleware wraps every call, in order. This is where confirmation, tenant scoping and audit hooks belong.

## The draft it targets

`document.modelContext.registerTool(tool, { signal })`, falling back to `navigator.modelContext` (deprecated in Chromium 150). `provideContext`/`clearContext` were removed from the spec in March 2026 and are not used. Everything version-specific lives in `src/model-context.ts`; when the draft moves again, that file is what changes.

Where the browser has no WebMCP at all, `registerTool` reports through `onError` rather than throwing.
