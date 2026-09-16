import { useCallback, useEffect, useMemo, useState } from 'react';
import { specToAttributes } from '@axag/core';
import type { ActionSpec } from '@axag/core';
import { registerAction } from '@axag/webmcp';
import type { Middleware, ToolHandler } from '@axag/webmcp';

export interface UseAxagOptions {
  /** What the tool does. Defaults to the spec's `handler`, then to driving the element. */
  handler?: ToolHandler;
  middleware?: Middleware[];
  /** Skip registration entirely, e.g. while the user lacks the role for it. */
  enabled?: boolean;
  onError?: (error: unknown) => void;
}

export interface AxagProps {
  ref: (element: Element | null) => void;
  [attribute: string]: unknown;
}

/**
 * Register `spec` while the element it is spread onto is mounted.
 *
 * ```tsx
 * const props = useAxag(deactivateUser, { handler: deactivate });
 * return <button {...props}>Deactivate</button>;
 * ```
 *
 * The returned props carry the axag-* attributes too, so the annotation is
 * visible in the DOM to anything else that reads it.
 */
export function useAxag(spec: ActionSpec, options: UseAxagOptions = {}): AxagProps {
  const [element, setElement] = useState<Element | null>(null);
  const attributes = useMemo(() => specToAttributes(spec), [spec]);
  // Re-register only when the annotation itself changes, not on every render.
  const identity = useMemo(() => JSON.stringify(attributes), [attributes]);
  const { handler, middleware, enabled = true, onError } = options;

  useEffect(() => {
    if (!element || !enabled) return undefined;

    // A fresh controller per mount keeps StrictMode's double mount honest.
    const controller = new AbortController();
    registerAction(spec, {
      element,
      handler,
      middleware,
      onError,
      signal: controller.signal,
    });
    return () => controller.abort();
    // `spec` is covered by `identity`; the rest are the caller's own values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element, identity, enabled, handler, middleware, onError]);

  const ref = useCallback((node: Element | null) => setElement(node), []);
  return { ...attributes, ref };
}
