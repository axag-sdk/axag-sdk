# @web-axag/webmcp

Registers AXAG actions as [WebMCP](https://github.com/webmachinelearning/webmcp) tools, for as long as the UI they belong to is on screen.

```bash
npm install @web-axag/webmcp
```

## Registering the tools your build produced

```ts
import { registerManifest } from '@web-axag/webmcp';
import { tools } from 'virtual:axag/tools'; // from @web-axag/compiler

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
import { defineAction } from '@web-axag/core';
import { registerAction } from '@web-axag/webmcp';

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

For components, use the framework bindings instead: [`@web-axag/react`](../react), [`@web-axag/vue`](../vue), [`@web-axag/angular`](../angular).

## Reading the page instead

```ts
import { registerDocument } from '@web-axag/webmcp';

registerDocument({ signal: controller.signal });
```

Every annotated element on the page is registered, with parameters harvested from its form. Costs a DOM scan and ~7.9 KB gzipped, so prefer the build-time path where you have one.

## Lifecycle

- **Aborting the signal unregisters.** WebMCP has no `unregisterTool`; the signal *is* the lifecycle.
- **Operability is watched.** An action whose element is disabled, `hidden`, `inert`, `aria-hidden`, `aria-disabled` or detached is unregistered, and registered again when the element comes back. One `MutationObserver` serves every registration.
- **No handler needed.** The default handler fills the element's form from the tool's arguments — writing through the prototype setter so React and Vue see the change — then presses the control.

## Safety enforcers

The middleware high-risk actions need, without writing the glue yourself:

```ts
import { createEnforcers, registerManifest } from '@web-axag/webmcp';

const safety = createEnforcers({
  confirm: { from: 'high', endpoint: '/axag/confirm' },
  tenant: { id: () => session.tenantId },
  csrf: {},
  audit: event => analytics.track('agent_action', event),
});

registerManifest(tools, { signal: route.signal, handlers, ...safety });
```

- **Confirmation** — a dialog in a closed shadow root, showing the action and its parameters read-only, for anything at `high` risk or above (or with `confirmation_required`). Declining refuses the call with `AXAG_CONFIRMATION_MISSING`. With `endpoint`, the answer is exchanged for a single-use token the server can verify.
- **Tenant scope** — tenant parameters are removed from the agent-facing schema, so an agent cannot choose a tenant, and the session's tenant is attached instead.
- **CSRF** — the token from `<meta name="csrf-token">` is attached.
- **Audit** — every call is recorded with its outcome and *parameter names only*.

What they add travels in a reserved `_axag` entry alongside the agent's parameters. Your handler forwards it:

```ts
import { axagHeaders, withoutEnvelope } from '@web-axag/webmcp';

const handler = input =>
  fetch('/api/users/deactivate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...axagHeaders(input) },
    body: JSON.stringify(withoutEnvelope(input)),
  });
```

Custom middleware still works the same way, and runs in the order given:

```ts
registerManifest(tools, { signal: route.signal, middleware: [async (ctx, next) => next()] });
```

:::warning
These run in the page. An agent with the page's credentials can call your API directly, so [`@web-axag/server`](../server) has to check the same things.
:::

## The draft it targets

`document.modelContext.registerTool(tool, { signal })`, falling back to `navigator.modelContext` (deprecated in Chromium 150). `provideContext`/`clearContext` were removed from the spec in March 2026 and are not used. Everything version-specific lives in `src/model-context.ts`; when the draft moves again, that file is what changes.

Where the browser has no WebMCP at all, `registerTool` reports through `onError` rather than throwing.
