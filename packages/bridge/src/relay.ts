/**
 * The relay a tab connects to.
 *
 * Transport-agnostic on purpose: the WebSocket server hands it sockets, and
 * tests hand it fakes. One tab at a time — a second connection is refused
 * rather than silently replacing the first.
 */

import { randomUUID } from 'node:crypto';
import { parseMessage } from './protocol.js';
import type { BridgeToolInfo, RelayMessage, TabMessage } from './protocol.js';

/** The part of a WebSocket the relay uses. */
export interface RelaySocket {
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  on: (event: 'message' | 'close', listener: (data?: unknown) => void) => void;
}

export interface RelayOptions {
  /** Printed at startup; a tab must send it back. */
  pairingCode: string;
  /** Origins allowed to connect. Empty means any — only sensible for local development. */
  allowedOrigins?: string[];
  /** How long to wait for a tab to answer a call. Default 30s. */
  callTimeoutMs?: number;
  onStatus?: (status: RelayStatus) => void;
}

export interface RelayStatus {
  connected: boolean;
  origin?: string;
  title?: string;
  tools: number;
}

export interface Relay {
  /** Attach a socket that has just connected. */
  attach: (socket: RelaySocket, context: { origin?: string }) => void;
  listTools: () => BridgeToolInfo[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  status: () => RelayStatus;
  close: () => void;
}

export function createRelay(options: RelayOptions): Relay {
  const timeout = options.callTimeoutMs ?? 30_000;
  const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();

  let tab: RelaySocket | undefined;
  let tools: BridgeToolInfo[] = [];
  let status: RelayStatus = { connected: false, tools: 0 };

  const announce = (): void => options.onStatus?.(status);

  const send = (socket: RelaySocket, message: RelayMessage): void => socket.send(JSON.stringify(message));

  const dropTab = (reason: string): void => {
    tab = undefined;
    tools = [];
    status = { connected: false, tools: 0 };
    for (const [id, call] of pending) {
      clearTimeout(call.timer);
      call.reject(new Error(reason));
      pending.delete(id);
    }
    announce();
  };

  return {
    attach(socket, context) {
      const origin = context.origin;
      const allowed = options.allowedOrigins ?? [];
      if (allowed.length > 0 && (!origin || !allowed.includes(origin))) {
        send(socket, { type: 'refused', reason: `Origin ${origin ?? 'unknown'} is not allowed` });
        socket.close(1008, 'origin not allowed');
        return;
      }
      if (tab) {
        send(socket, { type: 'refused', reason: 'Another tab is already connected' });
        socket.close(1013, 'busy');
        return;
      }

      let greeted = false;
      socket.on('message', data => {
        const message = parseMessage<TabMessage>(String(data));
        if (!message) return;

        if (!greeted) {
          if (message.type !== 'hello' || message.pairing !== options.pairingCode) {
            send(socket, { type: 'refused', reason: 'Wrong or missing pairing code' });
            socket.close(1008, 'pairing failed');
            return;
          }
          greeted = true;
          tab = socket;
          tools = message.tools;
          status = { connected: true, origin: message.origin, title: message.title, tools: tools.length };
          announce();
          send(socket, { type: 'ready', tools: tools.length });
          return;
        }

        if (message.type === 'tools') {
          tools = message.tools;
          status = { ...status, tools: tools.length };
          announce();
          return;
        }
        if (message.type === 'result') {
          const call = pending.get(message.id);
          if (!call) return;
          clearTimeout(call.timer);
          pending.delete(message.id);
          if (message.ok) call.resolve(message.value);
          else call.reject(new Error(message.error));
        }
      });

      socket.on('close', () => {
        if (tab === socket) dropTab('The tab disconnected before answering');
      });
    },

    listTools: () => tools,

    callTool(name, args) {
      const socket = tab;
      if (!socket) return Promise.reject(new Error('No tab is connected to the bridge'));
      if (!tools.some(tool => tool.name === name)) {
        return Promise.reject(new Error(`The connected tab does not offer "${name}" right now`));
      }

      const id = randomUUID();
      return new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`"${name}" did not answer within ${timeout}ms`));
        }, timeout);
        // Don't hold the process open waiting for a call.
        timer.unref?.();
        pending.set(id, { resolve, reject, timer });
        send(socket, { type: 'call', id, name, arguments: args });
      });
    },

    status: () => status,

    close() {
      tab?.close(1001, 'relay closing');
      dropTab('The relay is closing');
    },
  };
}
