# @web-axag/react

React bindings for AXAG. An action is registered while its component is mounted and unregistered when it isn't.

```bash
npm install @web-axag/react
```

```tsx
import { defineAction, useAxag } from '@web-axag/react';

const deactivateUser = defineAction({
  intent: 'user.deactivate',
  actionType: 'write',
  riskLevel: 'critical',
  confirmationRequired: true,
  requiredParameters: [{ name: 'user_id', type: 'string', format: 'uuid' }],
});

export function DeactivateButton({ userId }: { userId: string }) {
  const axag = useAxag(deactivateUser, { handler: () => api.deactivate(userId) });
  return <button {...axag}>Deactivate</button>;
}
```

The returned props carry the `axag-*` attributes as well as a ref, so the annotation is in the DOM for anything else that reads it.

## Options

| Option | Description |
|--------|-------------|
| `handler` | What the tool does. Without one, the element's form is filled and the control is pressed |
| `middleware` | Wraps every call — confirmation, tenant scope, audit |
| `enabled` | `false` keeps the action off the agent's list, e.g. by role |
| `onError` | Called when registration fails, including on browsers with no WebMCP |

## Wrapping a component you don't own

```tsx
import { AxagAction } from '@web-axag/react';

<AxagAction spec={deactivateUser} handler={deactivate}>
  <Button variant="danger">Deactivate</Button>
</AxagAction>
```

`AxagAction` renders a `display: contents` span, so it adds no layout. Pass `as` to render something else.

## Notes

- Safe under StrictMode: each mount gets its own `AbortController`, and the double mount re-registers cleanly.
- Re-registers when the annotation itself changes, not on every render.
- Conditional rendering, route changes and unmounts all unregister, so the agent's tools match the screen.
