# @axag/angular

An Angular directive that registers an AXAG action while the element is in the view.

```bash
npm install @axag/angular
```

```ts
import { AxagDirective } from '@axag/angular';
import { defineAction } from '@axag/core';

@Component({
  standalone: true,
  imports: [AxagDirective],
  template: `<button [axag]="deactivateUser" [axagHandler]="deactivate">Deactivate</button>`,
})
export class UserRow {
  deactivateUser = defineAction({
    intent: 'user.deactivate',
    actionType: 'write',
    riskLevel: 'critical',
    requiredParameters: [{ name: 'user_id', type: 'string', format: 'uuid' }],
  });

  deactivate = ({ user_id }: { user_id: string }) => this.api.deactivate(user_id);
}
```

## Inputs

| Input | Description |
|-------|-------------|
| `axag` | The action spec (required) |
| `axagHandler` | What the tool does; defaults to filling the form and pressing the control |
| `axagMiddleware` | Wraps every call — confirmation, tenant scope, audit |
| `axagEnabled` | `false` keeps the action off the agent's list |

## Notes

- Routing and `@if` unregister the action, because destroying the directive aborts its signal.
- Changing an input re-registers rather than duplicating.
- Server-side rendering is a no-op: there is no model context to register with.
- The directive is standalone and works with Angular 16+.
