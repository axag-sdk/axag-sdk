// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { createRegistry, getShimRegistry, installShim } from '../src/index.js';

const tool = (name: string, execute: (input: Record<string, unknown>) => unknown = () => 'ran') => ({
  name,
  description: `Run ${name}`,
  inputSchema: { type: 'object', properties: {} },
  execute,
});

beforeEach(() => {
  delete (document as unknown as { modelContext?: unknown }).modelContext;
});

describe('registry', () => {
  it('registers, lists and runs tools', async () => {
    const registry = createRegistry();
    registry.registerTool(tool('product_search', input => `searched ${String(input.query)}`));

    expect(registry.listTools().map(t => t.name)).toEqual(['product_search']);
    expect(await registry.callTool('product_search', { query: 'socks' })).toBe('searched socks');
  });

  it('unregisters when the signal aborts, like the real API', () => {
    const registry = createRegistry();
    const controller = new AbortController();
    registry.registerTool(tool('cart_add_item'), { signal: controller.signal });
    expect(registry.listTools()).toHaveLength(1);

    controller.abort();
    expect(registry.listTools()).toEqual([]);
  });

  it('ignores a registration whose signal has already aborted', () => {
    const registry = createRegistry();
    registry.registerTool(tool('x'), { signal: AbortSignal.abort() });
    expect(registry.listTools()).toEqual([]);
  });

  it('keeps the newer registration when a name is re-registered', () => {
    const registry = createRegistry();
    const first = new AbortController();
    registry.registerTool(tool('user_invite', () => 'first'), { signal: first.signal });
    registry.registerTool(tool('user_invite', () => 'second'));

    // Aborting the replaced registration must not remove the live one.
    first.abort();
    expect(registry.listTools().map(t => t.name)).toEqual(['user_invite']);
  });

  it('tells subscribers when the set of tools changes', () => {
    const registry = createRegistry();
    const seen: number[] = [];
    const unsubscribe = registry.subscribe(tools => seen.push(tools.length));

    const controller = new AbortController();
    registry.registerTool(tool('a'), { signal: controller.signal });
    registry.registerTool(tool('b'));
    controller.abort();
    unsubscribe();
    registry.registerTool(tool('c'));

    expect(seen).toEqual([1, 2, 1]);
  });

  it('explains a call to a tool that is not registered', async () => {
    await expect(createRegistry().callTool('ghost')).rejects.toThrow('No tool named "ghost"');
  });
});

describe('installShim', () => {
  it('installs on document when the browser has no model context', () => {
    const registry = installShim()!;
    expect(getShimRegistry()).toBe(registry);
    expect((document as unknown as { modelContext: unknown }).modelContext).toBe(registry);
  });

  it('leaves a real browser implementation alone', () => {
    const native = { registerTool: vi.fn() };
    (document as unknown as { modelContext: unknown }).modelContext = native;

    expect(installShim()).toBeUndefined();
    expect((document as unknown as { modelContext: unknown }).modelContext).toBe(native);
    expect(getShimRegistry()).toBeUndefined();
  });

  it('is what @axag/webmcp then registers into', async () => {
    const registry = installShim()!;
    const { registerTool } = await import('@axag/webmcp');

    const controller = new AbortController();
    registerTool(
      {
        name: 'order_track',
        description: 'Track an order',
        inputSchema: { type: 'object', properties: {}, required: [] },
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, axag: {} as never },
      },
      { handler: () => 'tracked', signal: controller.signal },
    );
    await Promise.resolve();

    expect(registry.listTools().map(t => t.name)).toEqual(['order_track']);
    expect(await registry.callTool('order_track')).toBe('tracked');

    controller.abort();
    expect(registry.listTools()).toEqual([]);
  });
});

describe('size', () => {
  it('stays under the 2 KB budget a page pays for it', async () => {
    const result = await build({
      stdin: {
        contents: "import { installShim } from './src/index.js'; globalThis.axag = installShim();",
        resolveDir: path.resolve(import.meta.dirname, '..'),
        loader: 'ts',
      },
      bundle: true,
      minify: true,
      format: 'esm',
      platform: 'browser',
      write: false,
      logLevel: 'silent',
    });
    expect(gzipSync(result.outputFiles[0].contents).length).toBeLessThan(2_048);
  });
});
