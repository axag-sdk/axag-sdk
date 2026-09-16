// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { axagHeaders, createEnforcers, registerManifest, withoutEnvelope } from '../src/index.js';
import type { AuditEvent } from '../src/index.js';
import type { ModelContext, WebMcpToolDefinition } from '../src/model-context.js';

const registered = new Map<string, WebMcpToolDefinition>();
const modelContext: ModelContext = {
  registerTool(tool, options) {
    registered.set(tool.name, tool);
    options?.signal?.addEventListener('abort', () => registered.delete(tool.name), { once: true });
    return Promise.resolve();
  },
};

const deactivate = {
  name: 'user_deactivate',
  description: 'Deactivate a user',
  inputSchema: {
    type: 'object' as const,
    properties: { user_id: { type: 'string' }, tenant_id: { type: 'string' }, reason: { type: 'string' } },
    required: ['user_id', 'tenant_id'],
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    axag: {
      action_type: 'write',
      risk_level: 'critical',
      idempotent: true,
      confirmation_required: true,
      approval_required: false,
      source_intent: 'user.deactivate',
      source_entity: 'user',
    },
  },
};

const lowRisk = {
  ...deactivate,
  name: 'cart_add_item',
  annotations: {
    ...deactivate.annotations,
    axag: { ...deactivate.annotations.axag, risk_level: 'low', confirmation_required: false, source_intent: 'cart.add_item' },
  },
};

function register(tool: typeof deactivate, enforcers: ReturnType<typeof createEnforcers>, handler = vi.fn()) {
  registerManifest([tool], { modelContext, handler, ...enforcers });
  return handler;
}

beforeEach(() => {
  registered.clear();
  document.head.innerHTML = '';
});

describe('tenant scope', () => {
  it('removes tenant parameters from the agent-facing schema', async () => {
    register(deactivate, createEnforcers({ tenant: { id: () => 'acme' } }));
    await Promise.resolve();

    const tool = registered.get('user_deactivate')!;
    expect(Object.keys(tool.inputSchema.properties as object)).toEqual(['user_id', 'reason']);
    expect((tool.inputSchema as { required: string[] }).required).toEqual(['user_id']);
  });

  it('injects the tenant from the session, not from the agent', async () => {
    const handler = register(deactivate, createEnforcers({ tenant: { id: () => 'acme' }, confirm: { render: async () => true } }));
    await Promise.resolve();

    await registered.get('user_deactivate')!.execute({ user_id: 'u1', tenant_id: 'other-tenant' });
    const [input] = handler.mock.calls[0] as [Record<string, unknown>];
    expect(axagHeaders(input)['X-AXAG-Tenant']).toBe('acme');
    // The agent's own value is still visible to the handler, but the server trusts the header.
    expect(withoutEnvelope(input)).toEqual({ user_id: 'u1', tenant_id: 'other-tenant' });
  });

  it('refuses when the session has no tenant', async () => {
    const handler = register(deactivate, createEnforcers({ tenant: { id: () => '' }, confirm: { render: async () => true } }));
    await Promise.resolve();

    const result = await registered.get('user_deactivate')!.execute({ user_id: 'u1' });
    expect(result).toMatchObject({ error: 'AXAG_TENANT_BOUNDARY', status: 403 });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('confirmation', () => {
  it('refuses when the person declines', async () => {
    const handler = register(deactivate, createEnforcers({ confirm: { render: async () => false } }));
    await Promise.resolve();

    const result = await registered.get('user_deactivate')!.execute({ user_id: 'u1' });
    expect(result).toMatchObject({ error: 'AXAG_CONFIRMATION_MISSING', status: 428, intent: 'user.deactivate' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not ask for a low-risk action', async () => {
    const render = vi.fn(async () => true);
    const handler = register(lowRisk, createEnforcers({ confirm: { render } }));
    await Promise.resolve();

    await registered.get('cart_add_item')!.execute({ user_id: 'u1' });
    expect(render).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
  });

  it('fetches a single-use token the server can check', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ confirmation: 'nonce-1' }), { status: 200 }));
    const handler = register(
      deactivate,
      createEnforcers({ confirm: { render: async () => true, endpoint: '/axag/confirm' }, fetch: fetchMock as never }),
    );
    await Promise.resolve();

    await registered.get('user_deactivate')!.execute({ user_id: 'u1' });
    const [input] = handler.mock.calls[0] as [Record<string, unknown>];
    expect(axagHeaders(input)['X-AXAG-Confirmation']).toBe('nonce-1');

    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toEqual({ intent: 'user.deactivate', parameters: { user_id: 'u1' } });
  });

  it('refuses when the token cannot be obtained', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 500 }));
    const handler = register(
      deactivate,
      createEnforcers({ confirm: { render: async () => true, endpoint: '/axag/confirm' }, fetch: fetchMock as never }),
    );
    await Promise.resolve();

    expect(await registered.get('user_deactivate')!.execute({ user_id: 'u1' })).toMatchObject({
      error: 'AXAG_CONFIRMATION_MISSING',
    });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('csrf', () => {
  it('sends the token from the page', async () => {
    document.head.innerHTML = '<meta name="csrf-token" content="tok-42">';
    const handler = register(lowRisk, createEnforcers({ csrf: {} }));
    await Promise.resolve();

    await registered.get('cart_add_item')!.execute({ user_id: 'u1' });
    const [input] = handler.mock.calls[0] as [Record<string, unknown>];
    expect(axagHeaders(input)['X-CSRF-Token']).toBe('tok-42');
  });
});

describe('audit', () => {
  it('records completed and refused calls with parameter names only', async () => {
    const events: AuditEvent[] = [];
    let clock = 1000;
    const enforcers = createEnforcers({
      audit: event => events.push(event),
      confirm: { render: async () => events.length === 0 },
      now: () => (clock += 5),
    });
    register(deactivate, enforcers);
    await Promise.resolve();

    await registered.get('user_deactivate')!.execute({ user_id: 'u1', reason: 'left the company' });
    await registered.get('user_deactivate')!.execute({ user_id: 'u2' });

    expect(events).toEqual([
      { intent: 'user.deactivate', tool: 'user_deactivate', riskLevel: 'critical', outcome: 'completed', durationMs: 5, parameters: ['user_id', 'reason'] },
      { intent: 'user.deactivate', tool: 'user_deactivate', riskLevel: 'critical', outcome: 'refused', reason: 'AXAG_CONFIRMATION_MISSING', durationMs: 5, parameters: ['user_id'] },
    ]);
  });
});

describe('the built-in dialog', () => {
  it('renders in a closed shadow root the page cannot reach', async () => {
    register(deactivate, createEnforcers({ confirm: {} }));
    await Promise.resolve();

    const call = registered.get('user_deactivate')!.execute({ user_id: 'u1' });
    await new Promise(resolve => setTimeout(resolve, 0));

    const host = document.body.lastElementChild!;
    expect(host.shadowRoot).toBeNull();
    // Nothing of the dialog is reachable from the page's own DOM.
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(await call).toMatchObject({ error: 'AXAG_CONFIRMATION_MISSING' });
    expect(document.body.contains(host)).toBe(false);
  });
});
