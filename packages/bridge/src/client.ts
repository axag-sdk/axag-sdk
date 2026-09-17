/**
 * The tab's side of the bridge.
 *
 * Offers whatever is registered right now, re-offers it when that changes, and
 * runs the calls the relay forwards. The page's own enforcers still wrap each
 * call: a bridged agent goes through the same confirmation and tenant checks
 * as one running in the browser.
 */

import { parseMessage } from './protocol.js';
import type { BridgeToolInfo, RelayMessage, TabMessage } from './protocol.js';

interface ToolSource {
  listTools: () => Array<BridgeToolInfo & { execute: (input: Record<string, unknown>) => unknown }>;
  subscribe: (listener: () => void) => () => void;
  callTool: (name: string, input?: Record<string, unknown>) => Promise<unknown>;
}

export interface BridgeConnection {
  disconnect: () => void;
  readonly connected: boolean;
}

export interface ConnectOptions {
  /** The relay's address. Loopback only: `ws://127.0.0.1:8787`. */
  url: string;
  /** The code the relay printed at startup. */
  pairingCode: string;
  /** Where the tools come from. Defaults to the shim registry on this page. */
  registry?: ToolSource;
  signal?: AbortSignal;
  onStatus?: (status: { connected: boolean; reason?: string }) => void;
  /** Injected in tests. */
  socketFactory?: (url: string) => WebSocketLike;
}

export interface WebSocketLike {
  send: (data: string) => void;
  close: () => void;
  addEventListener: (event: string, listener: (event: never) => void) => void;
  readyState: number;
}

const OPEN = 1;

export function connectBridge(options: ConnectOptions): BridgeConnection {
  const registry = options.registry ?? defaultRegistry();
  if (!registry) throw new Error('No tool registry on this page. Install @web-axag/shim, or pass one as `registry`.');

  const create = options.socketFactory ?? ((url: string) => new WebSocket(url) as unknown as WebSocketLike);
  const socket = create(options.url);
  let open = false;
  let unsubscribe: (() => void) | undefined;

  const describe = (): BridgeToolInfo[] =>
    registry.listTools().map(({ name, description, inputSchema, annotations }) => ({
      name,
      description,
      inputSchema,
      ...(annotations ? { annotations } : {}),
    }));

  const send = (message: TabMessage): void => {
    if (socket.readyState === OPEN) socket.send(JSON.stringify(message));
  };

  const disconnect = (reason?: string): void => {
    unsubscribe?.();
    unsubscribe = undefined;
    open = false;
    try {
      socket.close();
    } catch {
      /* already closing */
    }
    options.onStatus?.({ connected: false, ...(reason ? { reason } : {}) });
  };

  socket.addEventListener('open', () => {
    open = true;
    send({
      type: 'hello',
      pairing: options.pairingCode,
      origin: typeof location === 'undefined' ? 'unknown' : location.origin,
      title: typeof document === 'undefined' ? undefined : document.title,
      tools: describe(),
    });
    unsubscribe = registry.subscribe(() => send({ type: 'tools', tools: describe() }));
    options.onStatus?.({ connected: true });
  });

  socket.addEventListener('message', (event: { data?: unknown }) => {
    const message = parseMessage<RelayMessage>(String(event?.data ?? ''));
    if (!message) return;

    if (message.type === 'refused') {
      disconnect(message.reason);
      return;
    }
    if (message.type !== 'call') return;

    void Promise.resolve()
      .then(() => registry.callTool(message.name, message.arguments))
      .then(
        value => send({ type: 'result', id: message.id, ok: true, value }),
        error => send({ type: 'result', id: message.id, ok: false, error: String((error as Error)?.message ?? error) }),
      );
  });

  socket.addEventListener('close', () => disconnect());
  options.signal?.addEventListener('abort', () => disconnect('aborted'), { once: true });

  return {
    disconnect: () => disconnect(),
    get connected() {
      return open;
    },
  };
}

function defaultRegistry(): ToolSource | undefined {
  const candidate = (typeof document === 'undefined' ? undefined : (document as unknown as { modelContext?: unknown })
    .modelContext) as ToolSource & { isAxagShim?: boolean };
  return candidate?.isAxagShim ? candidate : undefined;
}
