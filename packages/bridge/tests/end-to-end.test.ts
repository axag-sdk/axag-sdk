/**
 * A tab and an MCP client, over a real WebSocket and the real MCP server:
 * the path an agent actually takes to reach a page's tools.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createRegistry } from '@web-axag/shim';
import { connectBridge } from '../src/client.js';
import { startBridgeServer } from '../src/server.js';

const closers: Array<() => Promise<void> | void> = [];
afterEach(async () => {
  for (const close of closers.splice(0).reverse()) await close();
});

function tool(name: string, execute: (input: Record<string, unknown>) => unknown) {
  return {
    name,
    description: `Run ${name}`,
    inputSchema: { type: 'object', properties: { id: { type: 'string' } } },
    annotations: { axag: { risk_level: 'none', source_intent: name.replace('_', '.') } },
    execute,
  };
}

async function setup() {
  const server = await startBridgeServer({ allowedOrigins: [] });
  closers.push(() => server.close());

  const registry = createRegistry();
  const connected = new Promise<void>(resolve => {
    connectBridge({
      url: `ws://127.0.0.1:${server.port}`,
      pairingCode: server.pairingCode,
      registry,
      socketFactory: url => new WebSocket(url) as never,
      onStatus: status => status.connected && resolve(),
    });
  });
  await connected;

  const client = new Client({ name: 'test-agent', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.mcp.connect(serverTransport)]);
  closers.push(() => client.close());

  return { server, registry, client };
}

/** The tab pushes its tool list asynchronously; wait for the relay to catch up. */
async function settle(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 30));
}

describe('an agent reaching a tab through the bridge', () => {
  it('lists the tools the page has registered', async () => {
    const { registry, client } = await setup();
    registry.registerTool(tool('order_track', () => ({ status: 'shipped' })));
    await settle();

    const { tools } = await client.listTools();
    expect(tools.map(t => t.name)).toEqual(['order_track']);
    expect(tools[0].description).toBe('Run order_track');
    expect(tools[0].inputSchema).toMatchObject({ type: 'object' });
  });

  it('runs a call in the page and returns its result', async () => {
    const { registry, client } = await setup();
    const calls: unknown[] = [];
    registry.registerTool(
      tool('order_track', input => {
        calls.push(input);
        return { status: 'shipped', id: input.id };
      }),
    );
    await settle();

    const result = await client.callTool({ name: 'order_track', arguments: { id: 'o1' } });
    expect(calls).toEqual([{ id: 'o1' }]);
    expect(JSON.parse((result.content as Array<{ text: string }>)[0].text)).toEqual({ status: 'shipped', id: 'o1' });
  });

  it('reports a refusal from the page as a tool error, not a transport failure', async () => {
    const { registry, client } = await setup();
    registry.registerTool(
      tool('user_deactivate', () => {
        throw new Error('the person declined this action');
      }),
    );
    await settle();

    const result = await client.callTool({ name: 'user_deactivate', arguments: {} });
    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toContain('declined');
  });

  it('follows the page: tools appear and disappear as the UI changes', async () => {
    const { registry, client } = await setup();
    const route = new AbortController();
    registry.registerTool(tool('order_track', () => 'ok'), { signal: route.signal });
    registry.registerTool(tool('cart_add_item', () => 'ok'));
    await settle();
    expect((await client.listTools()).tools.map(t => t.name).sort()).toEqual(['cart_add_item', 'order_track']);

    // Leaving the route unregisters what belonged to it.
    route.abort();
    await settle();
    expect((await client.listTools()).tools.map(t => t.name)).toEqual(['cart_add_item']);

    const refused = await client.callTool({ name: 'order_track', arguments: {} });
    expect(refused.isError).toBe(true);
    expect((refused.content as Array<{ text: string }>)[0].text).toContain('does not offer "order_track"');
  });

  it('refuses a tab that pairs with the wrong code', async () => {
    const server = await startBridgeServer();
    closers.push(() => server.close());

    const registry = createRegistry();
    const refusal = new Promise<string | undefined>(resolve => {
      connectBridge({
        url: `ws://127.0.0.1:${server.port}`,
        pairingCode: 'not-the-code',
        registry,
        socketFactory: url => new WebSocket(url) as never,
        onStatus: status => !status.connected && resolve(status.reason),
      });
    });

    expect(await refusal).toBe('Wrong or missing pairing code');
    expect(server.relay.status().connected).toBe(false);
  });
});
