/**
 * HTML Extractor — extract elements with axag-* attributes from HTML files.
 */

import { extractHtml } from '@web-axag/core/html';
import type { AnnotatedElement } from '@web-axag/core';

export type { AnnotatedElement };

/** Extract elements that declare axag-intent from an HTML string. */
export function extractHtmlAnnotations(html: string, filePath: string): AnnotatedElement[] {
  return extractHtml(html, filePath);
}
