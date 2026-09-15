import { load } from 'cheerio';
import type { Element } from 'domhandler';
import type { AnnotatedElement } from '../types.js';

/**
 * Find the 1-based line number of a substring offset in raw text.
 */
function lineFromOffset(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

/**
 * Parse an HTML string and extract elements that have axag-* attributes
 * or are interactive elements (button, a[href], input[type=submit], [onclick], [role=button]).
 */
export function parseHtml(html: string, filePath: string): AnnotatedElement[] {
  const $ = load(html, { xml: false });
  const elements: AnnotatedElement[] = [];

  const selector = [
    '[axag-intent]',
    '[axag-entity]',
    '[axag-action-type]',
    'button',
    'a[href]',
    'input[type="submit"]',
    'form',
    '[onclick]',
    '[role="button"]',
  ].join(', ');

  const seen = new Set<Element>();

  $(selector).each(function (this: unknown, _i: number, el: unknown) {
    const domEl = el as Element;
    if (seen.has(domEl)) return;
    seen.add(domEl);

    const allAttrs: Record<string, string> = {};
    const axagAttrs: Record<string, string> = {};

    if (domEl.attribs) {
      for (const [key, value] of Object.entries(domEl.attribs)) {
        allAttrs[key] = String(value ?? '');
        if (key.startsWith('axag-')) {
          axagAttrs[key] = String(value ?? '');
        }
      }
    }

    const outerHtml = $.html(domEl) || '';
    const offset = html.indexOf(outerHtml);
    const line = offset >= 0 ? lineFromOffset(html, offset) : 1;

    elements.push({
      tagName: domEl.tagName?.toLowerCase() || 'unknown',
      attributes: axagAttrs,
      allAttributes: allAttrs,
      filePath,
      line,
      column: 1,
      rawHtml: outerHtml.slice(0, 200),
    });
  });

  return elements;
}
