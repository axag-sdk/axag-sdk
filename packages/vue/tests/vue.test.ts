// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref, withDirectives } from 'vue';
import { defineAction } from '@web-axag/core';
import { AxagPlugin, useAxag, vAxag } from '../src/index.js';
import type { ModelContext, WebMcpToolDefinition } from '@web-axag/webmcp';

const registered = new Map<string, WebMcpToolDefinition>();
const modelContext: ModelContext = {
  registerTool(tool, options) {
    registered.set(tool.name, tool);
    options?.signal?.addEventListener('abort', () => registered.delete(tool.name), { once: true });
    return Promise.resolve();
  },
};

beforeEach(() => {
  registered.clear();
  document.body.innerHTML = '<div id="app"></div>';
  (document as unknown as { modelContext: ModelContext }).modelContext = modelContext;
});

const addItem = defineAction({
  intent: 'cart.add_item',
  actionType: 'write',
  riskLevel: 'low',
  requiredParameters: [{ name: 'product_id', type: 'string' }],
});

function mount(component: ReturnType<typeof defineComponent>) {
  const app = createApp(component);
  app.use(AxagPlugin);
  app.mount('#app');
  return app;
}

describe('useAxag', () => {
  it('registers while mounted and annotates the element', async () => {
    const app = mount(
      defineComponent({
        setup() {
          const { el, attrs } = useAxag(addItem);
          return () => h('button', { ref: el, ...attrs.value }, 'Add');
        },
      }),
    );
    await nextTick();
    await Promise.resolve();

    expect([...registered.keys()]).toEqual(['cart_add_item']);
    expect(document.querySelector('button')!.getAttribute('axag-intent')).toBe('cart.add_item');

    app.unmount();
    expect([...registered.keys()]).toEqual([]);
  });

  it('runs the handler an agent calls', async () => {
    const handler = vi.fn();
    mount(
      defineComponent({
        setup() {
          const { el } = useAxag(addItem, { handler });
          return () => h('button', { ref: el }, 'Add');
        },
      }),
    );
    await nextTick();
    await Promise.resolve();

    await registered.get('cart_add_item')!.execute({ product_id: 'p1' });
    expect(handler).toHaveBeenCalledWith({ product_id: 'p1' });
  });

  it('follows a reactive enabled flag', async () => {
    const enabled = ref(false);
    mount(
      defineComponent({
        setup() {
          const { el } = useAxag(addItem, { enabled });
          return () => h('button', { ref: el }, 'Add');
        },
      }),
    );
    await nextTick();
    expect(registered.size).toBe(0);

    enabled.value = true;
    await nextTick();
    await Promise.resolve();
    expect([...registered.keys()]).toEqual(['cart_add_item']);
  });
});

describe('v-axag', () => {
  it('annotates and registers the element it is placed on', async () => {
    const app = createApp({
      render: () => withDirectives(h('button', 'Add'), [[vAxag, addItem]]),
    });
    app.use(AxagPlugin);
    app.mount('#app');
    await nextTick();
    await Promise.resolve();

    const button = document.querySelector('button')!;
    expect([...registered.keys()]).toEqual(['cart_add_item']);
    expect(button.getAttribute('axag-intent')).toBe('cart.add_item');
    expect(button.getAttribute('axag-risk-level')).toBe('low');

    app.unmount();
    expect([...registered.keys()]).toEqual([]);
  });

  it('takes a handler alongside the spec', async () => {
    const handler = vi.fn();
    const app = createApp({
      render: () => withDirectives(h('button', 'Add'), [[vAxag, { spec: addItem, handler }]]),
    });
    app.mount('#app');
    await nextTick();
    await Promise.resolve();

    await registered.get('cart_add_item')!.execute({ product_id: 'p2' });
    expect(handler).toHaveBeenCalledWith({ product_id: 'p2' });
    app.unmount();
  });
});
