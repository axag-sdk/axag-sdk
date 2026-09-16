import { extractJsx } from '@axag/core/jsx';
import { SpecResolver } from '@axag/core/spec-resolver';
import type { AnnotatedElement, ElementFilter } from '@axag/core';

const INTERACTIVE_TAGS = ['button', 'a', 'input', 'form'];

/** Annotated elements, plus interactive elements that rules may flag as unannotated. */
const lintTargets: ElementFilter = ({ tagName, allAttributes: a }) =>
  Object.keys(a).some(name => name === 'axag' || name.startsWith('axag-')) ||
  INTERACTIVE_TAGS.includes(tagName) ||
  'onClick' in a ||
  'onclick' in a ||
  a.role === 'button' ||
  a.type === 'submit';

/**
 * Parse a JSX/TSX string and extract elements with axag-* attributes.
 *
 * `axag={spec}` values are resolved the way @axag/compiler resolves them, so a
 * spec the build can read is linted like any other annotation, and only a value
 * neither can read is reported as runtime-only.
 */
export function parseJsx(source: string, filePath: string, resolver = new SpecResolver()): AnnotatedElement[] {
  resolver.provideSource(filePath, source);
  return extractJsx(source, filePath, {
    filter: lintTargets,
    resolveSpec: expression => resolver.resolve(expression, filePath),
  });
}
