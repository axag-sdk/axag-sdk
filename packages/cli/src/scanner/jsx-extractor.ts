/**
 * JSX Extractor — extract elements with axag-* attributes from JSX/TSX files.
 */

import { extractJsx } from '@axag/core/jsx';
import type { AnnotatedElement } from '@axag/core';

/** Extract elements that declare axag-intent from a JSX/TSX string. */
export function extractJsxAnnotations(source: string, filePath: string): AnnotatedElement[] {
  return extractJsx(source, filePath);
}
