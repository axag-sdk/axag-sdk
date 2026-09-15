/**
 * HTML adapter — read an HTML string with cheerio (parse5).
 * Requires the optional peer dependency `cheerio`.
 */

import { load } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { hasIntent } from '../annotation.js';
import { appendChild, createNode, selectElements } from '../tree.js';
import type { ElementNode, ElementTree } from '../tree.js';
import type { AnnotatedElement, ElementFilter } from '../types.js';

export interface ExtractOptions {
  /** Defaults to elements that declare axag-intent. */
  filter?: ElementFilter;
}

const byIntent: ElementFilter = el => hasIntent(el.allAttributes);

export function parseHtmlTree(html: string, filePath: string): ElementTree {
  const $ = load(html, { sourceCodeLocationInfo: true });
  const tree: ElementTree = { filePath, roots: [] };

  const visit = (domNodes: AnyNode[], parent: ElementNode | null): void => {
    for (const domNode of domNodes) {
      if (domNode.type === 'text') {
        if (parent) parent.ownText += domNode.data;
        continue;
      }
      if (domNode.type !== 'tag' && domNode.type !== 'script' && domNode.type !== 'style') continue;

      const el = domNode as Element;
      const attributes: Record<string, string> = {};
      for (const [key, value] of Object.entries(el.attribs ?? {})) attributes[key] = String(value ?? '');

      // parse5 locations are 1-based; synthesized <html>/<head>/<body> have none.
      const loc = el.sourceCodeLocation;
      const node = createNode({
        tagName: el.tagName.toLowerCase(),
        attributes,
        line: loc?.startLine ?? 1,
        column: loc?.startCol ?? 1,
        rawHtml: () => ($.html(el) || '').slice(0, 200),
      });
      if (parent) appendChild(parent, node);
      else tree.roots.push(node);
      visit(el.children, node);
    }
  };

  visit($.root().children().toArray() as AnyNode[], null);
  return tree;
}

export function extractHtml(html: string, filePath: string, options: ExtractOptions = {}): AnnotatedElement[] {
  return selectElements(parseHtmlTree(html, filePath), options.filter ?? byIntent);
}
