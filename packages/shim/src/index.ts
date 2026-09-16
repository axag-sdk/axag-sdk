/**
 * @axag/shim — a `document.modelContext` for browsers that don't have one.
 *
 * It implements the part of the WebMCP draft that pages call — `registerTool`
 * with an `AbortSignal` — and keeps the registered tools somewhere a bridge or
 * an inspector can reach them. No agent is connected by installing this; it is
 * the socket a connection plugs into.
 *
 * Dependency-free on purpose: this is the one piece that ships to every page.
 */

export interface ShimTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => unknown;
  annotations?: Record<string, unknown>;
}

export interface RegisterToolOptions {
  signal?: AbortSignal;
}

export type RegistryListener = (tools: ShimTool[]) => void;

export interface ShimRegistry {
  /** The WebMCP entry point a page calls. */
  registerTool: (tool: ShimTool, options?: RegisterToolOptions) => void;
  /** Tools registered right now. */
  listTools: () => ShimTool[];
  /** Run one, by name. */
  callTool: (name: string, input?: Record<string, unknown>) => Promise<unknown>;
  /** Called whenever the set of tools changes. Returns an unsubscribe function. */
  subscribe: (listener: RegistryListener) => () => void;
  /** Marks this as the shim rather than a browser implementation. */
  readonly isAxagShim: true;
}

interface ModelContextHost {
  modelContext?: unknown;
}

export function createRegistry(): ShimRegistry {
  const tools = new Map<string, ShimTool>();
  const listeners = new Set<RegistryListener>();

  const notify = (): void => {
    const snapshot = [...tools.values()];
    for (const listener of [...listeners]) listener(snapshot);
  };

  return {
    isAxagShim: true,

    registerTool(tool, options) {
      if (options?.signal?.aborted) return;
      tools.set(tool.name, tool);
      notify();

      options?.signal?.addEventListener(
        'abort',
        () => {
          // Only remove this registration, not a later one under the same name.
          if (tools.get(tool.name) === tool) {
            tools.delete(tool.name);
            notify();
          }
        },
        { once: true },
      );
    },

    listTools: () => [...tools.values()],

    async callTool(name, input) {
      const tool = tools.get(name);
      if (!tool) throw new Error(`No tool named "${name}" is registered`);
      return tool.execute(input ?? {});
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export interface InstallOptions {
  /** Where to install. Defaults to `document`. */
  target?: object;
  /** Install even when the browser has its own implementation. Default false. */
  force?: boolean;
}

/**
 * Install the shim if the browser has no model context of its own.
 * Returns the registry, or the existing one when the browser already has WebMCP.
 */
export function installShim(options: InstallOptions = {}): ShimRegistry | undefined {
  const target = (options.target ?? (typeof document === 'undefined' ? undefined : document)) as
    | ModelContextHost
    | undefined;
  if (!target) return undefined;

  const existing = target.modelContext as ShimRegistry | undefined;
  if (existing && !options.force) return existing.isAxagShim ? existing : undefined;

  const registry = createRegistry();
  Object.defineProperty(target, 'modelContext', { value: registry, configurable: true, writable: true });
  return registry;
}

/** The shim's registry, if this page installed one. */
export function getShimRegistry(target?: object): ShimRegistry | undefined {
  const host = (target ?? (typeof document === 'undefined' ? undefined : document)) as ModelContextHost | undefined;
  const candidate = host?.modelContext as ShimRegistry | undefined;
  return candidate?.isAxagShim ? candidate : undefined;
}
