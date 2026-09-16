/**
 * Register every annotated element on the page.
 *
 * This reads the live DOM, which costs a scan and pulls the reader into the
 * bundle. Prefer `registerManifest` with the tools a build produced; use this
 * for pages without a build step, or ones whose annotations only exist at runtime.
 */

import { actionToTool, buildManifest, hasIntent, readAttributes, toAnnotatedElement, toWebMcpTool, walk } from '@axag/core';
import { readDomTree } from '@axag/core/dom';
import { registerTool } from './register.js';
import type { Registration, RegisterOptions, ToolHandler } from './register.js';

export interface RegisterDocumentOptions extends Omit<RegisterOptions, 'element'> {
  /** Defaults to `document`. */
  root?: ParentNode;
  /** Handlers by intent; anything without one falls back to driving the control. */
  handlers?: Record<string, ToolHandler>;
}

export function registerDocument(options: RegisterDocumentOptions = {}): Registration {
  const root = options.root ?? (typeof document !== 'undefined' ? document : undefined);
  if (!root) return { unregister: () => undefined, active: false };

  const tree = readDomTree(root);
  const registrations: Registration[] = [];

  for (const node of walk(tree)) {
    if (!hasIntent(readAttributes(node.attributes).attributes)) continue;
    const element = node.element;
    if (!element) continue;

    const annotated = toAnnotatedElement(node, tree);
    const { manifest } = buildManifest([annotated], { paths: [] });
    const [action] = manifest.actions;
    if (!action) continue;

    registrations.push(
      registerTool(toWebMcpTool(actionToTool(action)), {
        ...options,
        element,
        handler: options.handlers?.[action.intent] ?? options.handler,
      }),
    );
  }

  return {
    unregister: () => registrations.forEach(registration => registration.unregister()),
    get active() {
      return registrations.some(registration => registration.active);
    },
  };
}
