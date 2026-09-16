// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineAction } from '@axag/core';
import { registerAction, registerElement, registerManifest, registerTool } from '../src/index.js';
import { registerDocument } from '../src/document.js';
import type { ModelContext, WebMcpToolDefinition } from '../src/model-context.js';

/** Stands in for the browser's model context, tracking what is registered right now. */
function fakeModelContext() {
  const registered = new Map<string, WebMcpToolDefinition>();
  const context: ModelContext = {
    registerTool(tool, options) {
      registered.set(tool.name, tool);
      options?.signal?.addEventListener('abort', () => registered.delete(tool.name), { once: true });
      return Promise.resolve();
    },
  };
  return { context, registered, names: () => [...registered.keys()].sort() };
}

const searchTool = {
  name: 'product_search',
  description: 'Search products',
  inputSchema: { type: 'object' as const, properties: { query: { type: 'string' } }, required: ['query'] },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    axag: {
      action_type: 'read',
      risk_level: 'none',
      idempotent: true,
      confirmation_required: false,
      approval_required: false,
      source_intent: 'product.search',
      source_entity: 'product',
    },
  },
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('registerTool', () => {
  it('registers, and unregisters when the signal aborts', async () => {
    const { context, names } = fakeModelContext();
    const controller = new AbortController();

    const registration = registerTool(searchTool, {
      modelContext: context,
      signal: controller.signal,
      handler: () => 'ran',
    });
    await Promise.resolve();

    expect(names()).toEqual(['product_search']);
    expect(registration.active).toBe(true);

    controller.abort();
    expect(names()).toEqual([]);
    expect(registration.active).toBe(false);
  });

  it('does nothing when the signal is already aborted', () => {
    const { context, names } = fakeModelContext();
    registerTool(searchTool, { modelContext: context, signal: AbortSignal.abort(), handler: () => 1 });
    expect(names()).toEqual([]);
  });

  it('reports a browser without WebMCP instead of throwing', () => {
    const onError = vi.fn();
    const registration = registerTool(searchTool, { handler: () => 1, onError });
    expect(registration.active).toBe(false);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(String(onError.mock.calls[0][0])).toContain('no WebMCP support');
  });

  it('runs middleware around the handler, in order', async () => {
    const { context, registered } = fakeModelContext();
    const order: string[] = [];
    registerTool(searchTool, {
      modelContext: context,
      handler: input => {
        order.push(`handler:${String(input.query)}`);
        return 'results';
      },
      middleware: [
        async (_ctx, next) => {
          order.push('outer-before');
          const result = await next();
          order.push('outer-after');
          return result;
        },
        async (ctx, next) => {
          order.push(`inner:${ctx.tool.name}`);
          return next();
        },
      ],
    });
    await Promise.resolve();

    const result = await registered.get('product_search')!.execute({ query: 'socks' });
    expect(result).toBe('results');
    expect(order).toEqual(['outer-before', 'inner:product_search', 'handler:socks', 'outer-after']);
  });

  it('lets middleware refuse a call', async () => {
    const { context, registered } = fakeModelContext();
    const handler = vi.fn();
    registerTool(searchTool, {
      modelContext: context,
      handler,
      middleware: [async () => ({ error: 'confirmation required' })],
    });
    await Promise.resolve();

    expect(await registered.get('product_search')!.execute({})).toEqual({ error: 'confirmation required' });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('operability', () => {
  it('unregisters while the element is disabled and registers again after', async () => {
    const { context, names } = fakeModelContext();
    document.body.innerHTML = '<button id="go">Search</button>';
    const button = document.getElementById('go')!;

    const registration = registerTool(searchTool, { modelContext: context, element: button });
    await Promise.resolve();
    expect(names()).toEqual(['product_search']);

    button.setAttribute('disabled', '');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(names()).toEqual([]);

    button.removeAttribute('disabled');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(names()).toEqual(['product_search']);

    registration.unregister();
    expect(names()).toEqual([]);
  });

  it.each([
    ['hidden', '<button id="go" hidden>x</button>'],
    ['aria-hidden', '<div aria-hidden="true"><button id="go">x</button></div>'],
    ['inert ancestor', '<div inert><button id="go">x</button></div>'],
    ['disabled fieldset', '<fieldset disabled><button id="go">x</button></fieldset>'],
  ])('does not register a control hidden by %s', async (_name, html) => {
    const { context, names } = fakeModelContext();
    document.body.innerHTML = html;
    registerTool(searchTool, { modelContext: context, element: document.getElementById('go')! });
    await Promise.resolve();
    expect(names()).toEqual([]);
  });

  it('unregisters when the element leaves the page', async () => {
    const { context, names } = fakeModelContext();
    document.body.innerHTML = '<button id="go">x</button>';
    const button = document.getElementById('go')!;
    registerTool(searchTool, { modelContext: context, element: button });
    await Promise.resolve();
    expect(names()).toEqual(['product_search']);

    button.remove();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(names()).toEqual([]);
  });
});

describe('registerAction', () => {
  it('builds the tool from a spec and uses its handler', async () => {
    const { context, registered } = fakeModelContext();
    const handler = vi.fn(() => ({ ok: true }));
    const spec = defineAction({
      intent: 'user.deactivate',
      actionType: 'write',
      riskLevel: 'critical',
      requiredParameters: [{ name: 'user_id', type: 'string' }],
      handler,
    });

    registerAction(spec, { modelContext: context });
    await Promise.resolve();

    const tool = registered.get('user_deactivate')!;
    expect(tool.inputSchema).toEqual({ type: 'object', properties: { user_id: { type: 'string' } }, required: ['user_id'] });
    expect((tool.annotations as { axag: { risk_level: string } }).axag.risk_level).toBe('critical');

    await tool.execute({ user_id: 'u1' });
    expect(handler).toHaveBeenCalledWith({ user_id: 'u1' });
  });
});

describe('registerManifest', () => {
  it('registers every tool from a build and takes handlers by name', async () => {
    const { context, names, registered } = fakeModelContext();
    const handler = vi.fn();
    const registration = registerManifest([searchTool, { ...searchTool, name: 'cart_add_item' }], {
      modelContext: context,
      handlers: { cart_add_item: handler },
      handler: () => 'default',
    });
    await Promise.resolve();

    expect(names()).toEqual(['cart_add_item', 'product_search']);
    await registered.get('cart_add_item')!.execute({});
    expect(handler).toHaveBeenCalled();

    registration.unregister();
    expect(names()).toEqual([]);
  });
});

describe('registerElement and registerDocument', () => {
  it('reads the annotation from the element', async () => {
    const { context, registered } = fakeModelContext();
    document.body.innerHTML = '<button id="go" axag="read:order.track!none?idempotent">Track</button>';
    registerElement(document.getElementById('go')!, { modelContext: context });
    await Promise.resolve();

    expect([...registered.keys()]).toEqual(['order_track']);
    expect((registered.get('order_track')!.annotations as { idempotentHint: boolean }).idempotentHint).toBe(true);
  });

  it('registers every annotated element on the page, with harvested parameters', async () => {
    const { context, names, registered } = fakeModelContext();
    document.body.innerHTML = `
      <form axag="read:product.search!none?idempotent">
        <label for="q">Search</label><input id="q" name="q" required>
        <button type="submit">Go</button>
      </form>
      <button axag="write:cart.clear!low">Clear</button>`;

    const registration = registerDocument({ modelContext: context });
    await Promise.resolve();

    expect(names()).toEqual(['cart_clear', 'product_search']);
    expect(registered.get('product_search')!.inputSchema).toEqual({
      type: 'object',
      properties: { q: { type: 'string', description: 'Search' } },
      required: ['q'],
    });

    registration.unregister();
    expect(names()).toEqual([]);
  });
});
