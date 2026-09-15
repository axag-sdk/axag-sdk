import { extractHtml } from '@axag/core/html';
import type { AnnotatedElement, ElementFilter } from '@axag/core';

const IDENTITY_ATTRIBUTES = ['axag-intent', 'axag-entity', 'axag-action-type'];

/** Annotated elements, plus interactive elements that rules may flag as unannotated. */
const lintTargets: ElementFilter = ({ tagName, allAttributes: a }) =>
  IDENTITY_ATTRIBUTES.some(name => name in a) ||
  tagName === 'button' ||
  tagName === 'form' ||
  (tagName === 'a' && 'href' in a) ||
  (tagName === 'input' && a.type === 'submit') ||
  'onclick' in a ||
  a.role === 'button';

/**
 * Parse an HTML string and extract elements that have axag-* attributes
 * or are interactive elements (button, a[href], input[type=submit], [onclick], [role=button]).
 */
export function parseHtml(html: string, filePath: string): AnnotatedElement[] {
  return extractHtml(html, filePath, { filter: lintTargets });
}
