/**
 * Element tree — the adapter-neutral structure every source is read into.
 * Rules that need context (labels, form controls, ancestors) work against
 * this instead of cheerio, Babel or the DOM directly.
 */

import { readAttributes } from './annotation.js';
import { accessibleName, coveringIntent, harvestParameters } from './harvest.js';
import type { AnnotatedElement, ElementFilter } from './types.js';

export interface ElementNode {
  /** Lower-cased tag name, or `component` for JSX member expressions. */
  tagName: string;
  /** Every attribute as written; dynamic JSX expressions read as ''. */
  attributes: Record<string, string>;
  children: ElementNode[];
  parent: ElementNode | null;
  /** Text directly inside this element, excluding descendants. */
  ownText: string;
  /** 1-based. */
  line: number;
  /** 1-based. */
  column: number;
  /** CSS selector path, when the source is a live DOM. */
  selector?: string;
  /** Truncated outer HTML, computed on demand. */
  rawHtml?: () => string;
  /** Source offsets of each attribute (`name="value"`), when read from source text. */
  spans?: Record<string, AttributeSpan>;
}

export interface AttributeSpan {
  start: number;
  end: number;
  /** False for JSX expressions (`axag={spec}`), which can't be rewritten as text. */
  static: boolean;
}

export interface ElementTree {
  /** Source file path, or page URL. */
  filePath: string;
  /** Top-level elements in document order. */
  roots: ElementNode[];
}

export function createNode(
  init: Pick<ElementNode, 'tagName' | 'attributes' | 'line' | 'column'> & Partial<ElementNode>,
): ElementNode {
  return { children: [], parent: null, ownText: '', ...init };
}

export function appendChild(parent: ElementNode, child: ElementNode): void {
  child.parent = parent;
  parent.children.push(child);
}

/** Depth-first, document order. */
export function* walk(from: ElementTree | ElementNode): Generator<ElementNode> {
  const stack = 'roots' in from ? [...from.roots].reverse() : [from];
  while (stack.length > 0) {
    const node = stack.pop()!;
    yield node;
    for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
  }
}

export function* ancestors(node: ElementNode): Generator<ElementNode> {
  for (let current = node.parent; current; current = current.parent) yield current;
}

/** Whitespace-collapsed text of the element and its descendants. */
export function textContent(node: ElementNode): string {
  const parts: string[] = [];
  for (const n of walk(node)) parts.push(n.ownText);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function findById(tree: ElementTree, id: string): ElementNode | undefined {
  for (const node of walk(tree)) if (node.attributes.id === id) return node;
  return undefined;
}

export function toAnnotatedElement(node: ElementNode, tree: ElementTree): AnnotatedElement {
  const { attributes, diagnostics } = readAttributes(node.attributes);
  const el: AnnotatedElement = {
    tagName: node.tagName,
    attributes,
    allAttributes: node.attributes,
    filePath: tree.filePath,
    line: node.line,
    column: node.column,
  };
  if (node.rawHtml) el.rawHtml = node.rawHtml();
  if (node.selector) el.selector = node.selector;
  if (diagnostics.length > 0) el.diagnostics = diagnostics;
  if (attributes['axag-intent']) {
    const harvested = harvestParameters(node, tree);
    if (harvested) el.harvested = harvested;
    const name = accessibleName(node, tree);
    if (name) el.accessibleName = name;
  } else if (node.tagName === 'form' || node.tagName === 'button' || node.tagName === 'input') {
    const covered = coveringIntent(node, tree);
    if (covered) el.coveredBy = covered;
  }
  return el;
}

/** Flatten a tree to the elements a caller cares about. */
export function selectElements(tree: ElementTree, filter: ElementFilter): AnnotatedElement[] {
  const out: AnnotatedElement[] = [];
  for (const node of walk(tree)) {
    if (filter({ tagName: node.tagName, allAttributes: node.attributes })) {
      out.push(toAnnotatedElement(node, tree));
    }
  }
  return out;
}
