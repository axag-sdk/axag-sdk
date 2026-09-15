/**
 * DOM adapter — read a live document (browser extensions, runtimes).
 */

import { hasIntent } from '../annotation.js';
import { appendChild, createNode, selectElements } from '../tree.js';
import type { ElementNode, ElementTree } from '../tree.js';
import type { AnnotatedElement, ElementFilter } from '../types.js';

export interface ExtractOptions {
  /** Defaults to elements that declare axag-intent. */
  filter?: ElementFilter;
  /** Recorded as `filePath`; defaults to the document URL. */
  source?: string;
}

const byIntent: ElementFilter = el => hasIntent(el.allAttributes);
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/** Build a tree from `root`'s descendants (a document yields its `<html>`). */
export function readDomTree(root: ParentNode, source?: string): ElementTree {
  const doc = (root as Node).ownerDocument ?? (root as Document);
  const tree: ElementTree = { filePath: source ?? doc.URL ?? '', roots: [] };

  const visit = (el: Element, parent: ElementNode | null): void => {
    const attributes: Record<string, string> = {};
    for (const attr of Array.from(el.attributes)) attributes[attr.name] = attr.value;

    const node = createNode({
      tagName: el.tagName.toLowerCase(),
      attributes,
      // A live DOM has no source positions; the selector locates the element instead.
      line: 1,
      column: 1,
      selector: selectorFor(el),
      rawHtml: () => el.outerHTML.slice(0, 200),
    });
    if (parent) appendChild(parent, node);
    else tree.roots.push(node);

    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === TEXT_NODE) node.ownText += child.textContent ?? '';
      else if (child.nodeType === ELEMENT_NODE) visit(child as Element, node);
    }
  };

  for (const child of Array.from(root.children)) visit(child, null);
  return tree;
}

export function extractDom(root: ParentNode, options: ExtractOptions = {}): AnnotatedElement[] {
  return selectElements(readDomTree(root, options.source), options.filter ?? byIntent);
}

/** Shortest id-anchored, nth-of-type CSS path to the element. */
export function selectorFor(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current.nodeType === ELEMENT_NODE) {
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
