/**
 * @web-axag/bridge — give MCP clients access to the tools a browser tab has registered.
 */

export { connectBridge } from './client.js';
export type { BridgeConnection, ConnectOptions } from './client.js';
export { createRelay } from './relay.js';
export type { Relay, RelayOptions, RelaySocket, RelayStatus } from './relay.js';
export { startBridgeServer } from './server.js';
export type { BridgeServer, BridgeServerOptions } from './server.js';
export type { BridgeToolInfo, RelayMessage, TabMessage } from './protocol.js';
