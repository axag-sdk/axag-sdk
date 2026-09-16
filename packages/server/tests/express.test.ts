import { describe, it, expect, vi } from 'vitest';
import { buildManifest } from '@axag/core';
import { extractHtml } from '@axag/core/html';
import { createEnforcer } from '../src/index.js';
import { axagConfirmRoute, axagGuard } from '../src/express.js';

const manifest = buildManifest(
  extractHtml(
    `<button axag="write:user.deactivate!critical?confirm&scope=tenant&tenant=strict">Deactivate</button>
     <button axag="read:order.track!none?idempotent">Track</button>`,
    'p.html',
  ),
  { paths: ['.'] },
).manifest;

const actor = { id: 'alice', tenant: 'acme', roles: ['security_admin'] };
const enforcer = createEnforcer({ manifest, approvals: () => true });
const guard = axagGuard(enforcer, { actorOf: () => actor });
const confirmRoute = axagConfirmRoute(enforcer, { actorOf: () => actor });

function fakeResponse() {
  const sent: { status: number; body: unknown } = { status: 200, body: undefined };
  const response = {
    status(code: number) {
      sent.status = code;
      return response;
    },
    json(body: unknown) {
      sent.body = body;
      return body;
    },
  };
  return { response, sent };
}

describe('axagGuard', () => {
  it('refuses a direct call to a critical action, the way an agent would make it', async () => {
    const { response, sent } = fakeResponse();
    const next = vi.fn();

    await guard(
      { body: { user_id: 'u1' }, headers: { 'x-axag-intent': 'user.deactivate' } },
      response,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(sent.status).toBe(428);
    expect(sent.body).toMatchObject({ error: 'AXAG_CONFIRMATION_MISSING', intent: 'user.deactivate' });
  });

  it('lets the request through once a person has confirmed it', async () => {
    const { response: confirmResponse, sent: confirmSent } = fakeResponse();
    await confirmRoute({ body: { intent: 'user.deactivate', parameters: { user_id: 'u1' } } }, confirmResponse);
    const { confirmation } = confirmSent.body as { confirmation: string };

    const { response, sent } = fakeResponse();
    const next = vi.fn();
    await guard(
      {
        body: { user_id: 'u1' },
        headers: { 'x-axag-intent': 'user.deactivate', 'x-axag-confirmation': confirmation, 'x-axag-tenant': 'acme' },
      },
      response,
      next,
    );

    expect(next).toHaveBeenCalledWith();
    expect(sent.body).toBeUndefined();
  });

  it('passes ordinary traffic through untouched', async () => {
    const next = vi.fn();
    await guard({ body: {}, headers: {} }, fakeResponse().response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('can require an intent on every request it guards', async () => {
    const strict = axagGuard(enforcer, { actorOf: () => actor, ignoreUnannotated: false });
    const { response, sent } = fakeResponse();
    const next = vi.fn();

    await strict({ body: {}, headers: {} }, response, next);
    expect(next).not.toHaveBeenCalled();
    expect(sent.status).toBe(400);
  });

  it('answers with the status the error code carries', async () => {
    const { response, sent } = fakeResponse();
    await guard({ body: {}, headers: { 'x-axag-intent': 'ghost.action' } }, response, vi.fn());
    expect(sent.status).toBe(404);
    expect(sent.body).toMatchObject({ error: 'AXAG_INTENT_NOT_FOUND' });
  });

  it('routes by path when the app prefers that to the header', async () => {
    const byPath = axagGuard(enforcer, {
      actorOf: () => actor,
      intentOf: request => (request.path === '/api/orders/track' ? 'order.track' : undefined),
    });
    const next = vi.fn();
    await byPath({ path: '/api/orders/track', body: {}, headers: {} }, fakeResponse().response, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('axagConfirmRoute', () => {
  it('needs an intent', async () => {
    const { response, sent } = fakeResponse();
    await confirmRoute({ body: {} }, response);
    expect(sent.status).toBe(400);
  });

  it('refuses to issue a token for an unknown action', async () => {
    const { response, sent } = fakeResponse();
    await confirmRoute({ body: { intent: 'ghost.action' } }, response);
    expect(sent.status).toBe(404);
  });
});
