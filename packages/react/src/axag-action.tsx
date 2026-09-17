import { createElement } from 'react';
import type { ElementType, ReactNode } from 'react';
import type { ActionSpec } from '@web-axag/core';
import { useAxag } from './use-axag.js';
import type { UseAxagOptions } from './use-axag.js';

export interface AxagActionProps extends UseAxagOptions {
  spec: ActionSpec;
  children?: ReactNode;
  /** The element to render. Defaults to a `display: contents` span that wraps the children. */
  as?: ElementType;
  [prop: string]: unknown;
}

/**
 * Annotate something you can't put props on — a component from a library, a
 * subtree. The wrapper renders with `display: contents`, so it adds no layout.
 *
 * ```tsx
 * <AxagAction spec={deactivateUser}><Button>Deactivate</Button></AxagAction>
 * ```
 */
export function AxagAction({ spec, children, as, handler, middleware, enabled, onError, ...rest }: AxagActionProps) {
  const axag = useAxag(spec, { handler, middleware, enabled, onError });
  const Component = as ?? 'span';
  const style = as ? undefined : { display: 'contents' };
  return createElement(Component, { ...rest, ...axag, style: (rest.style as object) ?? style }, children);
}
