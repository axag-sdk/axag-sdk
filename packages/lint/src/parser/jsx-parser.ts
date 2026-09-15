import { extractJsx } from '@axag/core/jsx';
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
 */
export function parseJsx(source: string, filePath: string): AnnotatedElement[] {
  return extractJsx(source, filePath, { filter: lintTargets });
}
