/**
 * The local relay process: a WebSocket server for the tab, and an MCP server
 * for the agent.
 *
 * Loopback only, one tab at a time, a pairing code the person copies from the
 * terminal into the page, and an origin allowlist. The tab runs every call in
 * the session the person is already signed into; no credentials pass through here.
 */

import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createRelay } from './relay.js';
import type { Relay, RelayStatus } from './relay.js';

export interface BridgeServerOptions {
  port?: number;
  /** Defaults to a fresh code each run. */
  pairingCode?: string;
  allowedOrigins?: string[];
  host?: string;
  onStatus?: (status: RelayStatus) => void;
}

export interface BridgeServer {
  relay: Relay;
  /** The MCP server exposing the tab's tools. Connect it to a transport. */
  mcp: Server;
  pairingCode: string;
  port: number;
  close: () => Promise<void>;
}

export async function startBridgeServer(options: BridgeServerOptions = {}): Promise<BridgeServer> {
  const pairingCode = options.pairingCode ?? randomUUID().slice(0, 8);
  const host = options.host ?? '127.0.0.1';
  const relay = createRelay({
    pairingCode,
    allowedOrigins: options.allowedOrigins,
    onStatus: options.onStatus,
  });

  const wss = new WebSocketServer({ host, port: options.port ?? 0 });
  wss.on('connection', (socket, request) => {
    relay.attach(
      {
        send: data => socket.send(data),
        close: (code, reason) => socket.close(code, reason),
        on: (event, listener) => socket.on(event, listener as (data?: unknown) => void),
      },
      { origin: request.headers.origin },
    );
  });
  await new Promise<void>(resolve => wss.once('listening', resolve));

  const mcp = new Server({ name: 'axag-bridge', version: '0.1.0' }, { capabilities: { tools: {} } });

  mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: relay.listTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      ...(tool.annotations ? { annotations: tool.annotations } : {}),
    })),
  }));

  mcp.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      const result = await relay.callTool(request.params.name, (request.params.arguments ?? {}) as Record<string, unknown>);
      return { content: [{ type: 'text' as const, text: typeof result === 'string' ? result : JSON.stringify(result ?? null) }] };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: String((error as Error)?.message ?? error) }],
      };
    }
  });

  const address = wss.address();
  const port = typeof address === 'object' && address ? address.port : (options.port ?? 0);

  return {
    relay,
    mcp,
    pairingCode,
    port,
    async close() {
      relay.close();
      await new Promise<void>(resolve => wss.close(() => resolve()));
      await mcp.close();
    },
  };
}
