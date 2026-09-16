import { describe, it, expect, vi } from 'vitest';
import { buildManifest, AxagError } from '@axag/core';
import { extractHtml } from '@axag/core/html';
import { createEnforcer, MemoryConfirmationStore } from '../src/index.js';
import type { AuditRecord } from '../src/index.js';

const page = `
  <button axag="write:user.deactivate!critical?confirm&approval&roles=security_admin&scope=tenant&tenant=strict">Deactivate</button>
  <button axag="write:report.share!medium?scope=tenant&tenant=relaxed">Share</button>
  <button axag="read:order.track!none?idempotent">Track</button>
  <button axag="delete:audit_log.purge!high" axag-required-roles='["auditor"]'>Purge</button>`;
const manifest = buildManifest(extractHtml(page, 'p.html'), { paths: ['.'] }).manifest;

const alice = { id: 'alice', tenant: 'acme', roles: ['security_admin', 'auditor'] };

function setup(overrides: Parameters<typeof createEnforcer>[0] extends infer O ? Partial<O> : never = {}) {
  const audit: AuditRecord[] = [];
  const enforcer = createEnforcer({
    manifest,
    audit: record => audit.push(record),
    approvals: () => true,
    ...overrides,
  } as Parameters<typeof createEnforcer>[0]);
  return { enforcer, audit };
}

async function denial(promise: Promise<unknown>): Promise<AxagError> {
  try {
    await promise;
    throw new Error('expected a refusal');
  } catch (error) {
    if (!(error instanceof AxagError)) throw error;
    return error;
  }
}

describe('confirmation', () => {
  it('refuses a critical action with no token', async () => {
    const { enforcer } = setup();
    const error = await denial(enforcer.check({ intent: 'user.deactivate', parameters: { user_id: 'u1' }, actor: alice }));
    expect(error.code).toBe('AXAG_CONFIRMATION_MISSING');
    expect(error.status).toBe(428);
  });

  it('accepts a token issued for the same call', async () => {
    const { enforcer } = setup();
    const confirmation = await enforcer.issueConfirmation({ intent: 'user.deactivate', parameters: { user_id: 'u1' }, actor: alice });

    await expect(
      enforcer.check({
        intent: 'user.deactivate',
        parameters: { user_id: 'u1' },
        headers: { 'x-axag-confirmation': confirmation, 'x-axag-tenant': 'acme' },
        actor: alice,
      }),
    ).resolves.toBeUndefined();
  });

  it('refuses a token reused, issued for other parameters, or for another person', async () => {
    const { enforcer } = setup();
    const issue = () => enforcer.issueConfirmation({ intent: 'user.deactivate', parameters: { user_id: 'u1' }, actor: alice });
    const call = (confirmation: string, parameters: Record<string, unknown>, actor = alice) =>
      enforcer.check({ intent: 'user.deactivate', parameters, headers: { 'x-axag-confirmation': confirmation }, actor });

    const once = await issue();
    await call(once, { user_id: 'u1' });
    expect((await denial(call(once, { user_id: 'u1' }))).code).toBe('AXAG_CONFIRMATION_MISSING');

    expect((await denial(call(await issue(), { user_id: 'someone_else' }))).code).toBe('AXAG_CONFIRMATION_MISSING');

    const bob = { id: 'bob', tenant: 'acme', roles: ['security_admin'] };
    expect((await denial(call(await issue(), { user_id: 'u1' }, bob))).code).toBe('AXAG_CONFIRMATION_MISSING');
  });

  it('refuses an expired token', async () => {
    let clock = 0;
    const store = new MemoryConfirmationStore(() => clock);
    const { enforcer } = setup({ confirmations: store, confirmationTtlMs: 1_000, now: () => clock });
    const confirmation = await enforcer.issueConfirmation({ intent: 'user.deactivate', parameters: {}, actor: alice });

    clock = 5_000;
    const error = await denial(
      enforcer.check({ intent: 'user.deactivate', parameters: {}, headers: { 'x-axag-confirmation': confirmation }, actor: alice }),
    );
    expect(error.code).toBe('AXAG_CONFIRMATION_MISSING');
  });

  it('asks for nothing on a low-risk action', async () => {
    const { enforcer } = setup();
    await expect(enforcer.check({ intent: 'order.track', parameters: {}, actor: alice })).resolves.toBeUndefined();
  });
});

describe('tenant boundary', () => {
  const confirmed = async (enforcer: ReturnType<typeof createEnforcer>, parameters: Record<string, unknown>) => ({
    'x-axag-confirmation': await enforcer.issueConfirmation({ intent: 'user.deactivate', parameters, actor: alice }),
  });

  it('refuses a parameter pointing at another tenant', async () => {
    const { enforcer } = setup();
    const parameters = { user_id: 'u1', tenant_id: 'other' };
    const error = await denial(
      enforcer.check({ intent: 'user.deactivate', parameters, headers: await confirmed(enforcer, parameters), actor: alice }),
    );
    expect(error.code).toBe('AXAG_TENANT_BOUNDARY');
    expect(error.status).toBe(403);
  });

  it('refuses a header claiming another tenant than the session', async () => {
    const { enforcer } = setup();
    const parameters = { user_id: 'u1' };
    const headers = { ...(await confirmed(enforcer, parameters)), 'x-axag-tenant': 'other' };
    expect((await denial(enforcer.check({ intent: 'user.deactivate', parameters, headers, actor: alice }))).code).toBe(
      'AXAG_TENANT_BOUNDARY',
    );
  });

  it('refuses when the session has no tenant at all', async () => {
    const { enforcer } = setup();
    const parameters = { user_id: 'u1' };
    const headers = await confirmed(enforcer, parameters);
    const stranger = { id: 'alice', roles: ['security_admin'] };
    expect((await denial(enforcer.check({ intent: 'user.deactivate', parameters, headers, actor: stranger }))).code).toBe(
      'AXAG_TENANT_BOUNDARY',
    );
  });

  it('allows a cross-tenant parameter only where the annotation says relaxed', async () => {
    const { enforcer } = setup();
    await expect(
      enforcer.check({ intent: 'report.share', parameters: { tenant_id: 'other' }, actor: alice }),
    ).resolves.toBeUndefined();
  });
});

describe('roles and approval', () => {
  it('refuses a caller without a required role', async () => {
    const { enforcer } = setup();
    const outsider = { id: 'bob', tenant: 'acme', roles: ['support'] };
    const headers = {
      'x-axag-confirmation': await enforcer.issueConfirmation({ intent: 'audit_log.purge', parameters: {}, actor: outsider }),
    };
    const error = await denial(enforcer.check({ intent: 'audit_log.purge', parameters: {}, headers, actor: outsider }));
    expect(error.code).toBe('AXAG_ROLE_INSUFFICIENT');
    expect(error.details).toEqual({ required_roles: ['auditor'] });
  });

  it('refuses when approval is required and none is granted', async () => {
    const { enforcer } = setup({ approvals: () => false });
    const parameters = { user_id: 'u1' };
    const headers = {
      'x-axag-confirmation': await enforcer.issueConfirmation({ intent: 'user.deactivate', parameters, actor: alice }),
      'x-axag-tenant': 'acme',
    };
    const error = await denial(enforcer.check({ intent: 'user.deactivate', parameters, headers, actor: alice }));
    expect(error.code).toBe('AXAG_APPROVAL_MISSING');
    expect(error.details).toEqual({ approval_roles: ['security_admin'] });
  });

  it('refuses when approval is required and nothing is configured to grant it', async () => {
    const { enforcer } = setup({ approvals: undefined });
    const parameters = { user_id: 'u1' };
    const headers = {
      'x-axag-confirmation': await enforcer.issueConfirmation({ intent: 'user.deactivate', parameters, actor: alice }),
    };
    const error = await denial(enforcer.check({ intent: 'user.deactivate', parameters, headers, actor: alice }));
    expect(error.message).toContain('no approval source is configured');
  });
});

describe('csrf and unknown intents', () => {
  it('refuses a missing or wrong CSRF token', async () => {
    const { enforcer } = setup({ csrfOf: () => 'expected' });
    expect((await denial(enforcer.check({ intent: 'order.track', parameters: {}, actor: alice }))).code).toBe(
      'AXAG_SCOPE_VIOLATION',
    );
    await expect(
      enforcer.check({ intent: 'order.track', parameters: {}, headers: { 'x-csrf-token': 'expected' }, actor: alice }),
    ).resolves.toBeUndefined();
  });

  it('refuses an intent the manifest does not have', async () => {
    const { enforcer } = setup();
    const error = await denial(enforcer.check({ intent: 'ghost.action', actor: alice }));
    expect(error.code).toBe('AXAG_INTENT_NOT_FOUND');
    expect(error.status).toBe(404);
  });
});

describe('audit', () => {
  it('records allowed and denied calls with parameter names only', async () => {
    const { enforcer, audit } = setup();
    await enforcer.check({ intent: 'order.track', parameters: { order_id: 'o1' }, actor: alice });
    await denial(enforcer.check({ intent: 'user.deactivate', parameters: { user_id: 'u1' }, actor: alice }));

    expect(audit).toEqual([
      { intent: 'order.track', actorId: 'alice', tenant: 'acme', riskLevel: 'none', outcome: 'allowed', parameters: ['order_id'] },
      {
        intent: 'user.deactivate',
        actorId: 'alice',
        tenant: 'acme',
        riskLevel: 'critical',
        outcome: 'denied',
        reason: 'AXAG_CONFIRMATION_MISSING',
        parameters: ['user_id'],
      },
    ]);
  });

  it('lists the intents it enforces', () => {
    const { enforcer } = setup();
    expect(enforcer.enforcedIntents().sort()).toEqual(['audit_log.purge', 'order.track', 'report.share', 'user.deactivate']);
  });
});
