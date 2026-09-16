/**
 * The browser's WebMCP entry point, behind one adapter.
 *
 * The API is a Web Machine Learning CG draft and has moved: `document.modelContext`
 * is current, `navigator.modelContext` is the deprecated alias, and registration
 * is undone by aborting the signal passed to `registerTool` — there is no
 * `unregisterTool`. Everything that touches the draft lives in this file.
 */

export interface WebMcpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => unknown;
  annotations?: Record<string, unknown>;
}

export interface ModelContext {
  registerTool: (tool: WebMcpToolDefinition, options?: { signal?: AbortSignal }) => unknown;
}

interface ModelContextHost {
  modelContext?: ModelContext;
}

/** The page's model context, or undefined when the browser has no WebMCP support. */
export function getModelContext(override?: ModelContext): ModelContext | undefined {
  if (override) return override;
  if (typeof document !== 'undefined' && (document as unknown as ModelContextHost).modelContext) {
    return (document as unknown as ModelContextHost).modelContext;
  }
  if (typeof navigator !== 'undefined' && (navigator as unknown as ModelContextHost).modelContext) {
    // Deprecated in Chromium 150; kept for browsers that shipped the earlier draft.
    return (navigator as unknown as ModelContextHost).modelContext;
  }
  return undefined;
}

export function hasWebMcp(): boolean {
  return getModelContext() !== undefined;
}

/**
 * Register one tool, unregistered when `signal` aborts.
 * Registration is async in the draft; failures are reported through the promise.
 */
export async function registerWith(
  context: ModelContext,
  tool: WebMcpToolDefinition,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return;
  await context.registerTool(tool, { signal });
}
