// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElementRef } from '@angular/core';
import { defineAction } from '@axag/core';
import { AxagDirective } from '../src/index.js';
import type { ModelContext, WebMcpToolDefinition } from '@axag/webmcp';

const registered = new Map<string, WebMcpToolDefinition>();
const modelContext: ModelContext = {
  registerTool(tool, options) {
    registered.set(tool.name, tool);
    options?.signal?.addEventListener('abort', () => registered.delete(tool.name), { once: true });
    return Promise.resolve();
  },
};

const invite = defineAction({
  intent: 'user.invite',
  actionType: 'write',
  riskLevel: 'medium',
  requiredParameters: [{ name: 'email', type: 'string', format: 'email' }],
});

function makeDirective(element: Element, platformId: unknown = 'browser') {
  return new AxagDirective(new ElementRef(element), platformId);
}

beforeEach(() => {
  registered.clear();
  document.body.innerHTML = '<button id="go">Invite</button>';
  (document as unknown as { modelContext: ModelContext }).modelContext = modelContext;
});

describe('AxagDirective', () => {
  it('registers on change and unregisters on destroy', async () => {
    const element = document.getElementById('go')!;
    const directive = makeDirective(element);
    directive.axag = invite;

    directive.ngOnChanges();
    await Promise.resolve();

    expect([...registered.keys()]).toEqual(['user_invite']);
    expect(element.getAttribute('axag-intent')).toBe('user.invite');
    expect(element.getAttribute('axag-risk-level')).toBe('medium');

    directive.ngOnDestroy();
    expect([...registered.keys()]).toEqual([]);
  });

  it('re-registers rather than duplicating when inputs change', async () => {
    const directive = makeDirective(document.getElementById('go')!);
    directive.axag = invite;
    directive.ngOnChanges();
    await Promise.resolve();

    directive.axag = { ...invite, riskLevel: 'high' };
    directive.ngOnChanges();
    await Promise.resolve();

    expect(registered.size).toBe(1);
    expect((registered.get('user_invite')!.annotations as { axag: { risk_level: string } }).axag.risk_level).toBe('high');
  });

  it('honours axagEnabled', async () => {
    const directive = makeDirective(document.getElementById('go')!);
    directive.axag = invite;
    directive.axagEnabled = false;
    directive.ngOnChanges();
    await Promise.resolve();
    expect(registered.size).toBe(0);

    directive.axagEnabled = true;
    directive.ngOnChanges();
    await Promise.resolve();
    expect([...registered.keys()]).toEqual(['user_invite']);
  });

  it('calls the handler an agent invokes', async () => {
    const handler = vi.fn();
    const directive = makeDirective(document.getElementById('go')!);
    directive.axag = invite;
    directive.axagHandler = handler;
    directive.ngOnChanges();
    await Promise.resolve();

    await registered.get('user_invite')!.execute({ email: 'a@example.com' });
    expect(handler).toHaveBeenCalledWith({ email: 'a@example.com' });
  });

  it('does nothing on the server', async () => {
    const directive = makeDirective(document.getElementById('go')!, 'server');
    directive.axag = invite;
    directive.ngOnChanges();
    await Promise.resolve();
    expect(registered.size).toBe(0);
  });
});
