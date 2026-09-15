/**
 * HTML Modifier — applies accepted AXAG annotations to HTML source files.
 */

import * as cheerio from 'cheerio';
import type { InferredAnnotation } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Apply annotations to an HTML string, returning the modified HTML.
 */
export function applyAnnotationsToHtml(
  html: string,
  annotations: InferredAnnotation[],
): string {
  const $ = cheerio.load(html, { xml: false });

  let applied = 0;

  for (const annotation of annotations) {
    if (annotation.status !== 'accepted' && annotation.status !== 'modified') {
      continue;
    }

    const attrs = annotation.userOverrides
      ? { ...annotation.attributes, ...annotation.userOverrides }
      : annotation.attributes;

    try {
      const $el = $(annotation.selector).first();
      if ($el.length === 0) {
        logger.warn(`Selector not found: ${annotation.selector}`);
        continue;
      }

      // Apply all axag-* attributes
      for (const [key, value] of Object.entries(attrs)) {
        $el.attr(key, value);
      }

      applied++;
    } catch (err) {
      logger.warn(`Failed to apply to ${annotation.selector}: ${(err as Error).message}`);
    }
  }

  logger.info(`Applied ${applied} annotations to HTML`);
  return $.html();
}
