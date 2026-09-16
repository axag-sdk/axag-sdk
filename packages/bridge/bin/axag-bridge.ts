#!/usr/bin/env node

/**
 * `npx axag-bridge` — expose the tools a browser tab has registered to any MCP client.
 *
 * The relay listens on loopback and speaks MCP over stdio, so a desktop agent
 * configures it like any other MCP server.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { startBridgeServer } from '../src/server.js';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

if (args.includes('--help')) {
  // Usage goes to stderr: stdout belongs to the MCP transport.
  console.error(`axag-bridge — expose a browser tab's AXAG tools over MCP

  --port <n>        Port for the tab to connect to (default: random free port)
  --origin <url>    Origin allowed to connect; repeatable. Default: any (local development only)
  --pairing <code>  Use a fixed pairing code instead of a fresh one
`);
  process.exit(0);
}

const origins = args.reduce<string[]>((found, arg, index) => {
  if (arg === '--origin' && args[index + 1]) found.push(args[index + 1]);
  return found;
}, []);

const server = await startBridgeServer({
  port: flag('port') ? Number(flag('port')) : undefined,
  pairingCode: flag('pairing'),
  allowedOrigins: origins,
  onStatus: status =>
    console.error(
      status.connected
        ? `[axag-bridge] ${status.title ?? 'tab'} at ${status.origin ?? 'unknown origin'} — ${status.tools} tools`
        : '[axag-bridge] no tab connected',
    ),
});

console.error(`[axag-bridge] listening on ws://127.0.0.1:${server.port}`);
console.error(`[axag-bridge] pairing code: ${server.pairingCode}`);
console.error(`[axag-bridge] in the page: connectBridge({ url: 'ws://127.0.0.1:${server.port}', pairingCode: '${server.pairingCode}' })`);

await server.mcp.connect(new StdioServerTransport());

const shutdown = (): void => {
  void server.close().then(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
