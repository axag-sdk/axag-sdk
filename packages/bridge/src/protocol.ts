/**
 * The messages a tab and the local relay exchange.
 *
 * Deliberately small: the tab offers tools and answers calls; the relay asks.
 * Nothing here carries credentials — the tab runs the call itself, in the
 * session the person is already signed into.
 */

export interface BridgeToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

export type TabMessage =
  | { type: 'hello'; pairing: string; origin: string; title?: string; tools: BridgeToolInfo[] }
  | { type: 'tools'; tools: BridgeToolInfo[] }
  | { type: 'result'; id: string; ok: true; value: unknown }
  | { type: 'result'; id: string; ok: false; error: string };

export type RelayMessage =
  | { type: 'ready'; tools: number }
  | { type: 'call'; id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'refused'; reason: string };

export function parseMessage<T>(data: string): T | undefined {
  try {
    const parsed: unknown = JSON.parse(data);
    return parsed && typeof parsed === 'object' && 'type' in parsed ? (parsed as T) : undefined;
  } catch {
    return undefined;
  }
}
