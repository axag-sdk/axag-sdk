/**
 * DOM adapter — read elements from a live document (browser extensions, runtimes).
 */

import { hasIntent, normalizeAttributes } from '../annotation.js';
import type { AnnotatedElement, ElementFilter } from '../types.js';

export interface ExtractOptions {
  /** Defaults to elements that declare axag-intent. */
  filter?: ElementFilter;
  /** Recorded as `filePath`; defaults to the document URL. */
  source?: string;
}

const byIntent: ElementFilter = el => hasIntent(el.allAttributes);

export function extractDom(root: ParentNode, options: ExtractOptions = {}): AnnotatedElement[] {
  const filter = options.filter ?? byIntent;
  const doc = (root as Node).ownerDocument ?? (root as Document);
  const source = options.source ?? doc.URL ?? '';
  const elements: AnnotatedElement[] = [];

  for (const el of Array.from(root.querySelectorAll('*'))) {
    const allAttributes: Record<string, string> = {};
    for (const attr of Array.from(el.attributes)) allAttributes[attr.name] = attr.value;
    const tagName = el.tagName.toLowerCase();
    if (!filter({ tagName, allAttributes })) continue;

    elements.push({
      tagName,
      attributes: normalizeAttributes(allAttributes),
      allAttributes,
      filePath: source,
      // A live DOM has no source positions; the selector locates the element instead.
      line: 1,
      column: 1,
      rawHtml: el.outerHTML.slice(0, 200),
      selector: selectorFor(el),
    });
  }

  return elements;
}

/** Shortest id-anchored, nth-of-type CSS path to the element. */
export function selectorFor(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current.nodeType === 1) {
    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const sameTag = Array.from(parent.children).filter(c => c.tagName === current!.tagName);
    parts.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(current) + 1})` : tag);
    current = parent;
  }
  return parts.join(' > ');
}
