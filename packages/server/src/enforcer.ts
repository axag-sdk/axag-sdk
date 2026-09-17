/**
 * Server-side enforcement of what an annotation promised.
 *
 * The page's middleware improves what a cooperative agent does; this is what
 * makes it true. An agent holding the page's credentials can call the API
 * directly, so every safety field an annotation declares — confirmation,
 * approval, roles, tenant boundary — is checked again here, against the
 * generated manifest rather than against anything the caller sent.
 */

import { AxagError, RISK_LEVELS } from '@web-axag/core';
import type { Manifest, ManifestAction, RiskLevel } from '@web-axag/core';
import { MemoryConfirmationStore, hashParameters } from './confirmations.js';
import type { ConfirmationStore } from './confirmations.js';

/** Who is calling, resolved from your session — never from the request body. */
export interface Actor {
  id: string;
  tenant?: string;
  roles?: string[];
}

export interface AxagRequest {
  intent: string;
  /** The agent's parameters. */
  parameters?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  actor: Actor;
}

export interface AuditRecord {
  intent: string;
  actorId: string;
  tenant?: string;
  riskLevel: string;
  outcome: 'allowed' | 'denied';
  /** The AXAG error code when denied. */
  reason?: string;
  /** Parameter names only; values may be personal data. */
  parameters: string[];
}

export interface EnforcerOptions {
  /** The manifest a build produced. Enforcement follows what it declares. */
  manifest: Manifest;
  /** Lowest risk level that needs a confirmation token. Default `high`. */
  confirmFrom?: RiskLevel;
  /** How long a confirmation token stays valid. Default 5 minutes. */
  confirmationTtlMs?: number;
  confirmations?: ConfirmationStore;
  /** Decide whether an approval exists for this call. Required by actions with `approval_required`. */
  approvals?: (request: AxagRequest & { action: ManifestAction }) => Promise<boolean> | boolean;
  /** The CSRF token this session expects. Omit to skip the check. */
  csrfOf?: (request: AxagRequest) => string | undefined;
  /** Parameter names that name a tenant, checked against the actor's tenant. */
  tenantParameters?: string[];
  audit?: (record: AuditRecord) => void;
  now?: () => number;
}

const DEFAULT_TENANT_PARAMETERS = ['tenant_id', 'tenant', 'org_id', 'organization_id', 'account_id', 'workspace_id'];

export interface Enforcer {
  /** Throws `AxagError` when the call must not proceed. */
  check: (request: AxagRequest) => Promise<void>;
  /** Issue a token after a person confirmed the action in the UI. */
  issueConfirmation: (request: { intent: string; parameters?: Record<string, unknown>; actor: Actor }) => Promise<string>;
  /** Intents this enforcer covers, for `axag-lint` to check against. */
  enforcedIntents: () => string[];
}

export function createEnforcer(options: EnforcerOptions): Enforcer {
  const now = options.now ?? (() => Date.now());
  const store = options.confirmations ?? new MemoryConfirmationStore(now);
  const ttl = options.confirmationTtlMs ?? 5 * 60_000;
  const confirmFrom = options.confirmFrom ?? 'high';
  const tenantParameters = options.tenantParameters ?? DEFAULT_TENANT_PARAMETERS;
  const actions = new Map(options.manifest.actions.map(action => [action.intent, action]));

  const actionFor = (intent: string): ManifestAction => {
    const action = actions.get(intent);
    if (!action) throw new AxagError('AXAG_INTENT_NOT_FOUND', `No action "${intent}" in the manifest`, { intent });
    return action;
  };

  return {
    enforcedIntents: () => [...actions.keys()],

    async issueConfirmation({ intent, parameters, actor }) {
      actionFor(intent);
      return store.issue({
        intent,
        parametersHash: hashParameters(parameters ?? {}),
        actorId: actor.id,
        expiresAt: now() + ttl,
      });
    },

    async check(request) {
      const action = actionFor(request.intent);
      const audit = (outcome: AuditRecord['outcome'], reason?: string): void =>
        options.audit?.({
          intent: request.intent,
          actorId: request.actor.id,
          tenant: request.actor.tenant,
          riskLevel: action.risk_level ?? 'none',
          outcome,
          ...(reason ? { reason } : {}),
          parameters: Object.keys(request.parameters ?? {}).filter(name => name !== '_axag'),
        });

      try {
        await checkCsrf(request, options);
        await checkConfirmation(request, action, { store, confirmFrom });
        checkRoles(request, action);
        await checkApproval(request, action, options);
        checkTenant(request, action, tenantParameters);
      } catch (error) {
        audit('denied', error instanceof AxagError ? error.code : String(error));
        throw error;
      }
      audit('allowed');
    },
  };
}

function header(request: AxagRequest, name: string): string | undefined {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function checkCsrf(request: AxagRequest, options: EnforcerOptions): void {
  if (!options.csrfOf) return;
  const expected = options.csrfOf(request);
  if (!expected) return;
  if (header(request, 'x-csrf-token') !== expected) {
    throw new AxagError('AXAG_SCOPE_VIOLATION', 'CSRF token missing or wrong', { intent: request.intent });
  }
}

async function checkConfirmation(
  request: AxagRequest,
  action: ManifestAction,
  context: { store: ConfirmationStore; confirmFrom: RiskLevel },
): Promise<void> {
  const risky = RISK_LEVELS.indexOf(action.risk_level ?? 'none') >= RISK_LEVELS.indexOf(context.confirmFrom);
  if (!action.confirmation_required && !risky) return;

  const token = header(request, 'x-axag-confirmation');
  if (!token) {
    throw new AxagError('AXAG_CONFIRMATION_MISSING', `"${action.intent}" needs a confirmation token`, {
      intent: action.intent,
    });
  }

  const record = await context.store.consume(token);
  const matches =
    record &&
    record.intent === action.intent &&
    record.actorId === request.actor.id &&
    record.parametersHash === hashParameters(request.parameters ?? {});
  if (!matches) {
    throw new AxagError('AXAG_CONFIRMATION_MISSING', 'Confirmation token is expired, already used, or for a different call', {
      intent: action.intent,
    });
  }
}

function checkRoles(request: AxagRequest, action: ManifestAction): void {
  const required = action.required_roles ?? [];
  if (required.length === 0) return;
  const held = new Set(request.actor.roles ?? []);
  if (!required.some(role => held.has(role))) {
    throw new AxagError('AXAG_ROLE_INSUFFICIENT', `"${action.intent}" requires one of: ${required.join(', ')}`, {
      intent: action.intent,
      details: { required_roles: required },
    });
  }
}

async function checkApproval(request: AxagRequest, action: ManifestAction, options: EnforcerOptions): Promise<void> {
  if (!action.approval_required) return;

  if (!options.approvals) {
    throw new AxagError('AXAG_APPROVAL_MISSING', `"${action.intent}" requires approval, but no approval source is configured`, {
      intent: action.intent,
      details: { approval_roles: action.approval_roles ?? [] },
    });
  }
  const granted = await options.approvals({ ...request, action });
  if (!granted) {
    throw new AxagError('AXAG_APPROVAL_MISSING', `"${action.intent}" has no approval yet`, {
      intent: action.intent,
      details: { approval_roles: action.approval_roles ?? [] },
    });
  }
}

/**
 * The tenant comes from the session. A tenant named in the parameters is only
 * accepted when it matches; under `tenant_boundary: "strict"` a mismatch is a
 * refusal rather than something to quietly override.
 */
function checkTenant(request: AxagRequest, action: ManifestAction, tenantParameters: string[]): void {
  if (action.scope !== 'tenant') return;

  const actorTenant = request.actor.tenant;
  if (!actorTenant) {
    throw new AxagError('AXAG_TENANT_BOUNDARY', `"${action.intent}" is tenant-scoped but the session has no tenant`, {
      intent: action.intent,
    });
  }

  const claimedHeader = header(request, 'x-axag-tenant');
  if (claimedHeader && claimedHeader !== actorTenant) {
    throw new AxagError('AXAG_TENANT_BOUNDARY', 'Request claims a different tenant than the session', {
      intent: action.intent,
    });
  }

  if (action.tenant_boundary === 'relaxed') return;
  for (const name of tenantParameters) {
    const value = request.parameters?.[name];
    if (value !== undefined && String(value) !== actorTenant) {
      throw new AxagError('AXAG_TENANT_BOUNDARY', `Parameter "${name}" points at another tenant`, {
        intent: action.intent,
        details: { parameter: name },
      });
    }
  }
}
