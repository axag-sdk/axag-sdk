/**
 * JSX/TSX Modifier — applies accepted AXAG annotations to JSX/TSX source files.
 *
 * Strategy: Use regex-based replacement to add axag-* attributes to JSX elements.
 * A production implementation would use babel/swc for AST manipulation.
 */

import type { InferredAnnotation } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Apply annotations to a JSX/TSX source string.
 */
export function applyAnnotationsToJsx(
  source: string,
  annotations: InferredAnnotation[],
): string {
  let modified = source;
  let applied = 0;

  for (const annotation of annotations) {
    if (annotation.status !== 'accepted' && annotation.status !== 'modified') {
      continue;
    }

    const attrs = annotation.userOverrides
      ? { ...annotation.attributes, ...annotation.userOverrides }
      : annotation.attributes;

    // Build the attributes string for JSX
    const attrString = Object.entries(attrs)
      .map(([key, value]) => `  ${key}="${value}"`)
      .join('\n');

    // Try to find the element by its text content
    const text = annotation.selector;

    // Look for the opening tag — simplified heuristic
    const tagPattern = buildJsxTagPattern(annotation);
    if (!tagPattern) continue;

    const match = modified.match(tagPattern);
    if (match && match.index !== undefined) {
      // Insert axag attributes before the closing >
      const openTag = match[0];
      const insertionPoint = openTag.lastIndexOf('>');
      if (insertionPoint >= 0) {
        const before = openTag.slice(0, insertionPoint);
        const after = openTag.slice(insertionPoint);
        const newTag = `${before}\n${attrString}\n${after}`;
        modified = modified.slice(0, match.index) + newTag + modified.slice(match.index + openTag.length);
        applied++;
      }
    } else {
      logger.debug(`Could not locate JSX element for: ${annotation.selector}`);
    }
  }

  logger.info(`Applied ${applied} annotations to JSX/TSX`);
  return modified;
}

/**
 * Build a regex pattern to find a JSX element matching the annotation selector.
 */
function buildJsxTagPattern(annotation: InferredAnnotation): RegExp | null {
  // Try matching by element text content
  const text = escapeRegex(annotation.selector);

  // Match <tag ... >text</tag> or <tag ... >{text}</tag>
  // This is intentionally loose — a real impl would use AST
  return new RegExp(`<\\w+[^>]*>[^<]*${text}[^<]*<\\/\\w+>`, 'i');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
