# @axag/server

Enforces, on the server, what an annotation promised. The page's middleware improves what a cooperative agent does; this is what makes it true.

```bash
npm install @axag/server
```

## Why both halves exist

An agent running in the page holds the page's credentials. It can skip your confirmation dialog and call the API directly. So every safety field an annotation declares is checked again here, against the generated manifest rather than against anything the caller sent.

```ts
import { createEnforcer } from '@axag/server';
import { axagGuard, axagConfirmRoute } from '@axag/server/express';
import manifest from './public/.well-known/axag-manifest.json' with { type: 'json' };

const enforcer = createEnforcer({
  manifest,
  approvals: async ({ action, actor }) => approvals.exists(action.intent, actor.id),
  csrfOf: request => request.session.csrfToken,
  audit: record => log.info(record),
});

const actorOf = req => ({ id: req.session.userId, tenant: req.session.tenant, roles: req.session.roles });

app.post('/axag/confirm', express.json(), axagConfirmRoute(enforcer, { actorOf }));
app.use('/api', express.json(), axagGuard(enforcer, { actorOf }));
```

`axagGuard` reads the `X-AXAG-Intent` header the page's enforcers send. Routing by path instead? Pass `intentOf`.

Not using Express? `enforcer.check({ intent, parameters, headers, actor })` is the whole API; it throws an `AxagError` carrying the code and HTTP status.

## What it checks

| Declared in the annotation | Checked here |
|---------------------------|--------------|
| `risk_level` at or above `high`, or `confirmation_required` | A confirmation token bound to this intent, these parameters and this person, used once, not expired |
| `approval_required` | Your `approvals` hook grants it; the roles come from `approval_roles` |
| `required_roles` | The actor holds one of them |
| `scope: "tenant"` | The session has a tenant; a claimed tenant matches it; under `tenant_boundary: "strict"` no parameter points elsewhere |
| — | CSRF token, when `csrfOf` is set |

Every check produces the error code the specification defines — `AXAG_CONFIRMATION_MISSING` (428), `AXAG_TENANT_BOUNDARY` (403), `AXAG_ROLE_INSUFFICIENT` (403), `AXAG_INTENT_NOT_FOUND` (404) — so a refusal means the same thing on the client, in the manifest and in your logs.

## Confirmation tokens

A token proves a person saw *this* action with *these* parameters and agreed. It is bound to the intent, a hash of the parameters (key order doesn't matter) and the actor; it works once and expires after five minutes.

```ts
const confirmation = await enforcer.issueConfirmation({ intent, parameters, actor });
```

`MemoryConfirmationStore` is the default and fine for one process. Running more than one? Implement `ConfirmationStore` over Redis or your database — two methods, `issue` and `consume`.

## Audit

```ts
createEnforcer({ manifest, audit: record => log.info(record) });
```

Each record carries the intent, actor, tenant, risk level, outcome, the refusal code when denied, and **parameter names only** — values can be personal data.

## Keeping the linter honest

```ts
writeFileSync('axag-enforced.json', JSON.stringify({ intents: enforcer.enforcedIntents() }, null, 2));
```

Point `enforcedIntentsPath` at that file in `.axaglintrc.json` and **AXAG-LINT-037** warns about any high-risk action your server isn't enforcing.
