/**
 * Element Extractor — finds interactive elements on a page and extracts metadata.
 */

import * as cheerio from 'cheerio';
import type { Element as DomElement } from 'domhandler';
import { INTERACTIVE_SELECTORS } from '../utils/constants.js';
import type { ScannedElement } from '../types/index.js';

let elementCounter = 0;

/** Reset the element counter (between scans). */
export function resetElementCounter(): void {
  elementCounter = 0;
}

/**
 * Extract all interactive elements from an HTML string.
 */
export function extractElements(
  html: string,
  pageUrl: string,
): ScannedElement[] {
  const $ = cheerio.load(html);
  const elements: ScannedElement[] = [];

  $(INTERACTIVE_SELECTORS).each((_i, el) => {
    const $el = $(el);

    // Skip hidden or aria-hidden elements
    if (
      $el.attr('aria-hidden') === 'true' ||
      $el.css('display') === 'none' ||
      $el.attr('hidden') !== undefined
    ) {
      return;
    }

    // Skip elements inside <noscript>, <script>, <style>
    if ($el.closest('noscript, script, style, template').length > 0) return;

    const tagName = (el as DomElement).tagName?.toLowerCase() ?? '';
    const attributes: Record<string, string> = (el as DomElement).attribs ?? {};

    // Extract ARIA attributes
    const ariaAttributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (key.startsWith('aria-')) {
        ariaAttributes[key] = String(value);
      }
    }

    // Extract existing axag-* annotations
    const existingAnnotations: Record<string, string> = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (key.startsWith('axag-')) {
        existingAnnotations[key] = String(value);
      }
    }

    // Build a reasonable CSS selector
    const selector = buildSelector($el, tagName, attributes);

    // Get parent context (nearest heading or landmark)
    const parentContext = getParentContext($el, $);

    elementCounter++;
    const id = `el-${elementCounter.toString().padStart(4, '0')}`;

    elements.push({
      id,
      selector,
      tagName,
      textContent: $el.text().trim().slice(0, 200),
      attributes: sanitizeAttributes(attributes),
      ariaAttributes,
      role: attributes.role || inferRole(tagName, attributes),
      pageUrl,
      xpath: '', // Populated during live scan if needed
      parentContext,
      hasExistingAnnotations: Object.keys(existingAnnotations).length > 0,
      existingAnnotations,
    });
  });

  return elements;
}

/** Build a human-readable CSS selector for an element. */
function buildSelector(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $el: cheerio.Cheerio<any>,
  tagName: string,
  attrs: Record<string, string>,
): string {
  if (attrs.id) return `#${attrs.id}`;
  if (attrs['data-testid']) return `[data-testid="${attrs['data-testid']}"]`;
  if (attrs.name) return `${tagName}[name="${attrs.name}"]`;

  const classes = (attrs.class || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join('.');
  if (classes) return `${tagName}.${classes}`;

  const text = $el.text().trim().slice(0, 30);
  if (text) return `${tagName}:contains("${text}")`;

  return tagName;
}

/** Get the nearest heading or landmark for context. */
function getParentContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $el: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI,
): string {
  // Walk up looking for a heading or landmark
  const landmarks = 'header, nav, main, aside, footer, section, article, form';
  const closest = $el.closest(landmarks);
  if (closest.length > 0) {
    const heading = closest.find('h1, h2, h3, h4, h5, h6').first().text().trim();
    if (heading) return heading;

    const landmark = (closest[0] as DomElement).tagName;
    const label = closest.attr('aria-label') || closest.attr('aria-labelledby');
    return label ? `${landmark}[${label}]` : landmark;
  }

  // Fallback: nearest preceding heading
  const prev = $el.prevAll('h1, h2, h3, h4, h5, h6').first().text().trim();
  if (prev) return prev;

  return 'page';
}

/** Infer a role for common elements. */
function inferRole(tagName: string, attrs: Record<string, string>): string | null {
  switch (tagName) {
    case 'button':
      return 'button';
    case 'a':
      return attrs.href ? 'link' : null;
    case 'input':
      return attrs.type === 'submit' ? 'button' : `input:${attrs.type || 'text'}`;
    case 'select':
      return 'combobox';
    case 'textarea':
      return 'textbox';
    case 'form':
      return 'form';
    default:
      return null;
  }
}

/** Remove axag-* and data-* clutter from attributes for display. */
function sanitizeAttributes(attrs: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class' || key === 'style') continue; // Too noisy
    result[key] = value;
  }
  return result;
}
