/**
 * Registering AXAG actions as WebMCP tools.
 *
 * Registration is tied to the lifetime of the UI: pass an `AbortSignal` from the
 * component, route or page section that owns the action, and the tool disappears
 * with it. When the action belongs to an element, the element's operability is
 * watched too, so an agent is never offered a disabled or hidden control.
 */

import { actionToTool, buildManifest, readAttributes, toWebMcpTool } from '@web-axag/core';
import type { ActionSpec, MCPToolDefinition, WebMcpTool } from '@web-axag/core';
import { specToAttributes } from '@web-axag/core';
import { createDefaultHandler } from './handler.js';
import { getModelContext, registerWith } from './model-context.js';
import type { ModelContext, WebMcpToolDefinition } from './model-context.js';
import { isOperable, operabilityWatcher } from './operability.js';

export type ToolHandler = (input: Record<string, unknown>) => unknown;

export interface ExecutionContext {
  tool: WebMcpTool;
  input: Record<string, unknown>;
  element?: Element;
}

/** Wraps execution. P5's safety enforcers are middleware. */
export type Middleware = (context: ExecutionContext, next: () => Promise<unknown>) => Promise<unknown>;

export interface RegisterOptions {
  /** Unregisters the tool when aborted. */
  signal?: AbortSignal;
  /** The control this action drives. Enables the default handler and the operability guard. */
  element?: Element;
  /** What the tool does. Defaults to filling the form and pressing the control. */
  handler?: ToolHandler;
  middleware?: Middleware[];
  /** Override the browser's model context (tests, or the fallback shim). */
  modelContext?: ModelContext;
  /** Adjust the tool before it is registered, e.g. to remove tenant parameters. */
  transformTool?: (tool: WebMcpTool) => WebMcpTool;
  /** Re-register when the element's operability changes. Default true when an element is given. */
  watchOperability?: boolean;
  onError?: (error: unknown) => void;
}

export interface Registration {
  /** Same as aborting the signal. */
  unregister: () => void;
  /** Whether the tool is registered right now. */
  readonly active: boolean;
}

const NOOP: Registration = { unregister: () => undefined, active: false };

export function registerTool(input: WebMcpTool, options: RegisterOptions = {}): Registration {
  const tool = options.transformTool ? options.transformTool(input) : input;
  const context = getModelContext(options.modelContext);
  if (!context) {
    options.onError?.(new Error('This browser has no WebMCP support (document.modelContext). Load @web-axag/shim to bridge instead.'));
    return NOOP;
  }
  if (options.signal?.aborted) return NOOP;

  const element = options.element;
  const watch = options.watchOperability ?? Boolean(element);
  const handler = options.handler ?? (element ? createDefaultHandler(element) : undefined);
  if (!handler) {
    options.onError?.(new Error(`Tool "${tool.name}" needs a handler or an element to act on`));
    return NOOP;
  }

  const definition: WebMcpToolDefinition = {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema as unknown as Record<string, unknown>,
    annotations: tool.annotations as unknown as Record<string, unknown>,
    execute: input => runMiddleware(options.middleware ?? [], { tool, input: input ?? {}, element }, handler),
  };

  let current: AbortController | undefined;
  let unsubscribe: (() => void) | undefined;

  const sync = (): void => {
    const wanted = !element || isOperable(element);
    if (wanted === Boolean(current)) return;

    if (!wanted) {
      current?.abort();
      current = undefined;
      return;
    }
    const controller = new AbortController();
    current = controller;
    void registerWith(context, definition, controller.signal).catch(error => {
      if (current === controller) current = undefined;
      options.onError?.(error);
    });
  };

  const stop = (): void => {
    unsubscribe?.();
    unsubscribe = undefined;
    current?.abort();
    current = undefined;
  };

  sync();
  if (watch && element) unsubscribe = operabilityWatcher.subscribe(sync);
  options.signal?.addEventListener('abort', stop, { once: true });

  return {
    unregister: stop,
    get active() {
      return current !== undefined;
    },
  };
}

/** Register an action written as a spec object, as `defineAction({...})` produces. */
export function registerAction(spec: ActionSpec, options: RegisterOptions = {}): Registration {
  const tool = toolFromAttributes(specToAttributes(spec));
  if (!tool) {
    options.onError?.(new Error(`Action spec needs an intent: ${JSON.stringify(spec)}`));
    return NOOP;
  }
  return registerTool(tool, { handler: spec.handler as ToolHandler | undefined, ...options });
}

/** Register the tools a build produced, e.g. `import { tools } from 'virtual:axag/tools'`. */
export function registerManifest(
  tools: WebMcpTool[] | { tools: WebMcpTool[] },
  options: RegisterOptions & { handlers?: Record<string, ToolHandler> } = {},
): Registration {
  const list = Array.isArray(tools) ? tools : tools.tools;
  const registrations = list.map(tool => registerTool(tool, { ...options, handler: handlerFor(tool, options) }));
  return {
    unregister: () => registrations.forEach(registration => registration.unregister()),
    get active() {
      return registrations.some(registration => registration.active);
    },
  };
}

/** Read one annotated element and register it. */
export function registerElement(element: Element, options: RegisterOptions = {}): Registration {
  const attributes: Record<string, string> = {};
  for (const attribute of Array.from(element.attributes)) attributes[attribute.name] = attribute.value;

  const tool = toolFromAttributes(readAttributes(attributes).attributes);
  if (!tool) {
    options.onError?.(new Error('Element has no axag annotation'));
    return NOOP;
  }
  return registerTool(tool, { element, ...options });
}

function toolFromAttributes(attributes: Record<string, string>): WebMcpTool | undefined {
  const { manifest } = buildManifest([{ attributes, filePath: '', line: 1 }], { paths: [] });
  const [action] = manifest.actions;
  return action ? toWebMcpTool(actionToTool(action) as MCPToolDefinition) : undefined;
}

/** Handlers may be keyed by tool name (`user_deactivate`) or by intent (`user.deactivate`). */
export function handlerFor(
  tool: WebMcpTool,
  options: { handlers?: Record<string, ToolHandler>; handler?: ToolHandler },
): ToolHandler | undefined {
  const intent = tool.annotations?.axag?.source_intent;
  return options.handlers?.[tool.name] ?? (intent ? options.handlers?.[intent] : undefined) ?? options.handler;
}

async function runMiddleware(middleware: Middleware[], context: ExecutionContext, handler: ToolHandler): Promise<unknown> {
  let index = -1;
  const dispatch = async (i: number): Promise<unknown> => {
    if (i <= index) throw new Error('next() called twice in AXAG middleware');
    index = i;
    const step = middleware[i];
    return step ? step(context, () => dispatch(i + 1)) : handler(context.input);
  };
  return dispatch(0);
}
