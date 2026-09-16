import { describe, it, expect, vi } from 'vitest';
import { createRelay } from '../src/relay.js';
import type { RelaySocket } from '../src/relay.js';
import type { TabMessage } from '../src/protocol.js';

/** A socket the test drives directly, standing in for the tab's WebSocket. */
function fakeSocket() {
  const sent: unknown[] = [];
  const listeners: Record<string, ((data?: unknown) => void)[]> = {};
  const socket: RelaySocket = {
    send: data => sent.push(JSON.parse(data)),
    close: vi.fn(),
    on: (event, listener) => {
      (listeners[event] ??= []).push(listener);
    },
  };
  return {
    socket,
    sent,
    closed: socket.close as ReturnType<typeof vi.fn>,
    receive: (message: TabMessage) => listeners.message?.forEach(l => l(JSON.stringify(message))),
    hangUp: () => listeners.close?.forEach(l => l()),
  };
}

const tool = { name: 'order_track', description: 'Track an order', inputSchema: { type: 'object', properties: {} } };

function connected(options: Parameters<typeof createRelay>[0] = { pairingCode: 'code' }) {
  const relay = createRelay(options);
  const tab = fakeSocket();
  relay.attach(tab.socket, { origin: 'https://shop.test' });
  tab.receive({ type: 'hello', pairing: options.pairingCode, origin: 'https://shop.test', title: 'Shop', tools: [tool] });
  return { relay, tab };
}

describe('pairing and origin', () => {
  it('accepts a tab with the right code and reports what it offers', () => {
    const statuses: unknown[] = [];
    const { relay, tab } = connected({ pairingCode: 'code', onStatus: s => statuses.push(s) });

    expect(tab.sent).toEqual([{ type: 'ready', tools: 1 }]);
    expect(relay.listTools()).toEqual([tool]);
    expect(relay.status()).toEqual({ connected: true, origin: 'https://shop.test', title: 'Shop', tools: 1 });
    expect(statuses).toHaveLength(1);
  });

  it('refuses a wrong pairing code', () => {
    const relay = createRelay({ pairingCode: 'code' });
    const tab = fakeSocket();
    relay.attach(tab.socket, { origin: 'https://shop.test' });
    tab.receive({ type: 'hello', pairing: 'guess', origin: 'https://shop.test', tools: [tool] });

    expect(tab.sent).toEqual([{ type: 'refused', reason: 'Wrong or missing pairing code' }]);
    expect(tab.closed).toHaveBeenCalledWith(1008, 'pairing failed');
    expect(relay.status().connected).toBe(false);
  });

  it('refuses an origin that is not on the list', () => {
    const relay = createRelay({ pairingCode: 'code', allowedOrigins: ['https://shop.test'] });
    const tab = fakeSocket();
    relay.attach(tab.socket, { origin: 'https://evil.test' });

    expect(tab.sent[0]).toMatchObject({ type: 'refused' });
    expect(tab.closed).toHaveBeenCalledWith(1008, 'origin not allowed');
  });

  it('refuses a second tab rather than replacing the first', () => {
    const { relay } = connected();
    const second = fakeSocket();
    relay.attach(second.socket, { origin: 'https://shop.test' });

    expect(second.sent[0]).toMatchObject({ type: 'refused', reason: 'Another tab is already connected' });
    expect(relay.status().connected).toBe(true);
  });
});

describe('tools and calls', () => {
  it('follows the tab as its tools change', () => {
    const { relay, tab } = connected();
    tab.receive({ type: 'tools', tools: [] });
    expect(relay.listTools()).toEqual([]);
    expect(relay.status().tools).toBe(0);
  });

  it('forwards a call and resolves with the answer the tab sends back', async () => {
    const { relay, tab } = connected();
    const call = relay.callTool('order_track', { order_id: 'o1' });

    const forwarded = tab.sent.at(-1) as { type: string; id: string; name: string; arguments: unknown };
    expect(forwarded).toMatchObject({ type: 'call', name: 'order_track', arguments: { order_id: 'o1' } });

    tab.receive({ type: 'result', id: forwarded.id, ok: true, value: { status: 'shipped' } });
    expect(await call).toEqual({ status: 'shipped' });
  });

  it('rejects when the tab reports an error', async () => {
    const { relay, tab } = connected();
    const call = relay.callTool('order_track', {});
    const { id } = tab.sent.at(-1) as { id: string };
    tab.receive({ type: 'result', id, ok: false, error: 'the person declined' });

    await expect(call).rejects.toThrow('the person declined');
  });

  it('refuses a tool the tab is not offering right now', async () => {
    const { relay } = connected();
    await expect(relay.callTool('user_deactivate', {})).rejects.toThrow('does not offer "user_deactivate"');
  });

  it('refuses everything when no tab is connected', async () => {
    const relay = createRelay({ pairingCode: 'code' });
    await expect(relay.callTool('order_track', {})).rejects.toThrow('No tab is connected');
  });

  it('gives up on a call the tab never answers', async () => {
    const { relay } = connected({ pairingCode: 'code', callTimeoutMs: 10 });
    await expect(relay.callTool('order_track', {})).rejects.toThrow('did not answer within 10ms');
  });

  it('fails pending calls when the tab goes away', async () => {
    const { relay, tab } = connected();
    const call = relay.callTool('order_track', {});
    tab.hangUp();

    await expect(call).rejects.toThrow('disconnected');
    expect(relay.status()).toEqual({ connected: false, tools: 0 });
  });
});
