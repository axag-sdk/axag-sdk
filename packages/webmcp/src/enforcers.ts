/**
 * Safety enforcers — the standard middleware high-risk actions need, so no app
 * writes its own glue for confirmation, tenant scope, CSRF and audit.
 *
 * These run in the page. They stop a cooperative agent from doing the wrong
 * thing and give a person the chance to refuse — but an agent with the page's
 * credentials can call your API directly, so the server must check the same
 * things. @web-axag/server is the other half.
 */

import { AxagError, RISK_LEVELS, refusal } from '@web-axag/core';
import type { AxagRefusal, RiskLevel, WebMcpTool } from '@web-axag/core';
import { confirmInShadowRoot } from './confirm-dialog.js';
import type { ConfirmationRequest } from './confirm-dialog.js';
import type { ExecutionContext, Middleware } from './register.js';

/** Reserved key carrying what the enforcers added, alongside the agent's own parameters. */
export const AXAG_ENVELOPE = '_axag';

export interface AxagEnvelope {
  intent?: string;
  /** Single-use token proving a person confirmed this exact call. */
  confirmation?: string;
  tenant?: string;
  csrf?: string;
}

export interface AuditEvent {
  intent: string;
  tool: string;
  riskLevel: string;
  outcome: 'completed' | 'refused' | 'failed';
  /** Set when the call was refused or failed. */
  reason?: string;
  durationMs: number;
  /** Parameter names only: values may be personal data. */
  parameters: string[];
}

export interface EnforcerOptions {
  confirm?: {
    /** Lowest risk level that needs confirmation. Default `high`. */
    from?: RiskLevel;
    /** Where to get a single-use confirmation token. Without it, the server can't verify the answer. */
    endpoint?: string;
    /** Replace the built-in dialog. */
    render?: (request: ConfirmationRequest) => Promise<boolean>;
  };
  tenant?: {
    /** The tenant the person is working in. Never taken from the agent. */
    id: () => string | Promise<string>;
    /** Parameter names to remove from the agent-facing schema. */
    parameters?: string[];
  };
  csrf?: {
    /** `<meta name="csrf-token" content="…">`. Default `csrf-token`. */
    metaName?: string;
    token?: () => string | undefined;
  };
  audit?: (event: AuditEvent) => void;
  /** Injected for tests. */
  fetch?: typeof globalThis.fetch;
  now?: () => number;
}

export interface Enforcers {
  middleware: Middleware[];
  /** Removes tenant parameters, so an agent cannot choose a tenant. */
  transformTool: (tool: WebMcpTool) => WebMcpTool;
}

const DEFAULT_TENANT_PARAMETERS = ['tenant_id', 'tenant', 'org_id', 'organization_id', 'account_id', 'workspace_id'];

/**
 * ```ts
 * registerManifest(tools, { signal, ...createEnforcers({ tenant: { id: () => session.tenant } }) });
 * ```
 */
export function createEnforcers(options: EnforcerOptions = {}): Enforcers {
  const tenantParameters = options.tenant?.parameters ?? DEFAULT_TENANT_PARAMETERS;
  const middleware: Middleware[] = [];

  if (options.audit) middleware.push(auditMiddleware(options.audit, options.now ?? (() => Date.now())));
  if (options.confirm !== undefined) middleware.push(confirmationMiddleware(options));
  if (options.tenant) middleware.push(tenantMiddleware(options.tenant.id));
  if (options.csrf !== undefined) middleware.push(csrfMiddleware(options.csrf));

  return {
    middleware,
    transformTool: tool => (options.tenant ? withoutParameters(tool, tenantParameters) : tool),
  };
}

/** Everything the enforcers added, ready to send as headers. */
export function axagHeaders(input: Record<string, unknown>): Record<string, string> {
  const envelope = (input?.[AXAG_ENVELOPE] ?? {}) as AxagEnvelope;
  const headers: Record<string, string> = {};
  if (envelope.intent) headers['X-AXAG-Intent'] = envelope.intent;
  if (envelope.confirmation) headers['X-AXAG-Confirmation'] = envelope.confirmation;
  if (envelope.tenant) headers['X-AXAG-Tenant'] = envelope.tenant;
  if (envelope.csrf) headers['X-CSRF-Token'] = envelope.csrf;
  return headers;
}

/** The agent's own parameters, without the enforcers' envelope. */
export function withoutEnvelope(input: Record<string, unknown>): Record<string, unknown> {
  const { [AXAG_ENVELOPE]: _envelope, ...rest } = input ?? {};
  return rest;
}

function envelopeOf(context: ExecutionContext): AxagEnvelope {
  const existing = context.input[AXAG_ENVELOPE] as AxagEnvelope | undefined;
  if (existing) return existing;
  const envelope: AxagEnvelope = { intent: context.tool.annotations?.axag?.source_intent };
  context.input[AXAG_ENVELOPE] = envelope;
  return envelope;
}

function confirmationMiddleware(options: EnforcerOptions): Middleware {
  const from = options.confirm?.from ?? 'high';
  const render = options.confirm?.render ?? confirmInShadowRoot;
  const request = options.fetch ?? globalThis.fetch?.bind(globalThis);

  return async (context, next) => {
    if (!needsConfirmation(context.tool, from)) return next();

    const answer = await render({ tool: context.tool, input: withoutEnvelope(context.input), element: context.element });
    if (!answer) {
      return refusal('AXAG_CONFIRMATION_MISSING', 'The person declined this action.', {
        intent: context.tool.annotations?.axag?.source_intent,
      });
    }

    const endpoint = options.confirm?.endpoint;
    if (endpoint && request) {
      try {
        const response = await request(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent: context.tool.annotations?.axag?.source_intent,
            parameters: withoutEnvelope(context.input),
          }),
        });
        if (!response.ok) throw new AxagError('AXAG_CONFIRMATION_MISSING', `Confirmation endpoint answered ${response.status}`);
        const body = (await response.json()) as { confirmation?: string };
        if (!body.confirmation) throw new AxagError('AXAG_CONFIRMATION_MISSING', 'Confirmation endpoint returned no token');
        envelopeOf(context).confirmation = body.confirmation;
      } catch (error) {
        return error instanceof AxagError
          ? error.toRefusal()
          : refusal('AXAG_CONFIRMATION_MISSING', `Could not get a confirmation token: ${String(error)}`);
      }
    }
    return next();
  };
}

function tenantMiddleware(tenantId: () => string | Promise<string>): Middleware {
  return async (context, next) => {
    const tenant = await tenantId();
    if (!tenant) {
      return refusal('AXAG_TENANT_BOUNDARY', 'No tenant in the current session.', {
        intent: context.tool.annotations?.axag?.source_intent,
      });
    }
    envelopeOf(context).tenant = tenant;
    return next();
  };
}

function csrfMiddleware(csrf: NonNullable<EnforcerOptions['csrf']>): Middleware {
  const metaName = csrf.metaName ?? 'csrf-token';
  return async (context, next) => {
    const token = csrf.token?.() ?? readMeta(metaName);
    if (token) envelopeOf(context).csrf = token;
    return next();
  };
}

function auditMiddleware(audit: (event: AuditEvent) => void, now: () => number): Middleware {
  return async (context, next) => {
    const started = now();
    const base = {
      intent: context.tool.annotations?.axag?.source_intent ?? context.tool.name,
      tool: context.tool.name,
      riskLevel: String(context.tool.annotations?.axag?.risk_level ?? 'none'),
      parameters: Object.keys(withoutEnvelope(context.input)),
    };
    try {
      const result = await next();
      const refused = (result as AxagRefusal | undefined)?.error;
      audit({
        ...base,
        outcome: refused ? 'refused' : 'completed',
        ...(refused ? { reason: refused } : {}),
        durationMs: now() - started,
      });
      return result;
    } catch (error) {
      audit({ ...base, outcome: 'failed', reason: String(error), durationMs: now() - started });
      throw error;
    }
  };
}

function needsConfirmation(tool: WebMcpTool, from: RiskLevel): boolean {
  const metadata = tool.annotations?.axag;
  if (metadata?.confirmation_required) return true;
  const level = metadata?.risk_level as RiskLevel | undefined;
  if (!level) return false;
  return RISK_LEVELS.indexOf(level) >= RISK_LEVELS.indexOf(from);
}

function withoutParameters(tool: WebMcpTool, names: string[]): WebMcpTool {
  const properties = { ...(tool.inputSchema.properties ?? {}) };
  let changed = false;
  for (const name of names) {
    if (name in properties) {
      delete properties[name];
      changed = true;
    }
  }
  if (!changed) return tool;

  return {
    ...tool,
    inputSchema: {
      ...tool.inputSchema,
      properties,
      required: (tool.inputSchema.required ?? []).filter(name => !names.includes(name)),
    },
  };
}

function readMeta(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content || undefined;
}
