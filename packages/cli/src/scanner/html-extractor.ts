/**
 * HTML Extractor — extract elements with axag-* attributes from HTML files.
 */

import { load } from 'cheerio';
import type { Element } from 'domhandler';

export interface AnnotatedElement {
  tagName: string;
  attributes: Record<string, string>;
  filePath: string;
  line: number;
  column: number;
}

function lineFromOffset(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

/**
 * Extract elements with axag-* attributes from an HTML string.
 */
export function extractHtmlAnnotations(html: string, filePath: string): AnnotatedElement[] {
  const $ = load(html, { xml: false });
  const elements: AnnotatedElement[] = [];

  const selector = [
    '[axag-intent]',
    '[axag-entity]',
    '[axag-action-type]',
  ].join(', ');

  const seen = new Set<Element>();

  $(selector).each(function (this: unknown, _i: number, el: unknown) {
    const domEl = el as Element;
    if (seen.has(domEl)) return;
    seen.add(domEl);

    const attrs: Record<string, string> = {};
    if (domEl.attribs) {
      for (const [key, value] of Object.entries(domEl.attribs)) {
        attrs[key] = String(value ?? '');
      }
    }

    // Only include elements that have at least axag-intent
    if (!attrs['axag-intent']) return;

    const outerHtml = $.html(domEl) || '';
    const offset = html.indexOf(outerHtml);
    const line = offset >= 0 ? lineFromOffset(html, offset) : 1;

    elements.push({
      tagName: domEl.tagName?.toLowerCase() || 'unknown',
      attributes: attrs,
      filePath,
      line,
      column: 1,
    });
  });

  return elements;
}
