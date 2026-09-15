/**
 * HTML adapter — extract elements from an HTML string with cheerio (parse5).
 * Requires the optional peer dependency `cheerio`.
 */

import { load } from 'cheerio';
import type { Element } from 'domhandler';
import { hasIntent, normalizeAttributes } from '../annotation.js';
import type { AnnotatedElement, ElementFilter } from '../types.js';

export interface ExtractOptions {
  /** Defaults to elements that declare axag-intent. */
  filter?: ElementFilter;
}

const byIntent: ElementFilter = el => hasIntent(el.allAttributes);

export function extractHtml(html: string, filePath: string, options: ExtractOptions = {}): AnnotatedElement[] {
  const filter = options.filter ?? byIntent;
  const $ = load(html, { sourceCodeLocationInfo: true });
  const elements: AnnotatedElement[] = [];

  $('*').each((_i, node) => {
    const el = node as Element;
    const allAttributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(el.attribs ?? {})) {
      allAttributes[key] = String(value ?? '');
    }
    const tagName = el.tagName?.toLowerCase() || 'unknown';
    if (!filter({ tagName, allAttributes })) return;

    // parse5 locations are 1-based; synthesized <html>/<body> have none.
    const loc = el.sourceCodeLocation;
    elements.push({
      tagName,
      attributes: normalizeAttributes(allAttributes),
      allAttributes,
      filePath,
      line: loc?.startLine ?? 1,
      column: loc?.startCol ?? 1,
      rawHtml: ($.html(el) || '').slice(0, 200),
    });
  });

  return elements;
}
