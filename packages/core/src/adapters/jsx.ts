/**
 * JSX adapter — read JSX/TSX source with Babel.
 * Requires the optional peer dependencies `@babel/parser` and `@babel/traverse`.
 */

import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { NodePath, TraverseOptions } from '@babel/traverse';
import type { JSXAttribute, JSXElement, Node } from '@babel/types';
import { hasIntent } from '../annotation.js';
import { appendChild, createNode, selectElements } from '../tree.js';
import type { ElementNode, ElementTree } from '../tree.js';
import type { AnnotatedElement, ElementFilter } from '../types.js';

// @babel/traverse is CJS; its default export is nested under ESM interop.
type Traverse = (ast: Node, visitors: TraverseOptions) => void;
const traverse = ((_traverse as unknown as { default?: Traverse }).default ?? _traverse) as unknown as Traverse;

export interface ExtractOptions {
  /** Defaults to elements that declare axag-intent. */
  filter?: ElementFilter;
}

const byIntent: ElementFilter = el => hasIntent(el.allAttributes);

/**
 * Every JSX element becomes a node. Fragments are transparent, and JSX nested
 * inside expressions (`{open && <Dialog/>}`, `.map(...)`) attaches to the
 * nearest enclosing JSX element. Unparseable source yields an empty tree.
 */
export function parseJsxTree(source: string, filePath: string): ElementTree {
  const tree: ElementTree = { filePath, roots: [] };

  let ast;
  try {
    ast = parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'], errorRecovery: true });
  } catch {
    return tree;
  }

  const nodes = new Map<JSXElement, ElementNode>();
  const enclosing = (path: NodePath): ElementNode | undefined => {
    const parent = path.findParent(p => p.isJSXElement());
    return parent ? nodes.get(parent.node as JSXElement) : undefined;
  };

  traverse(ast, {
    JSXElement(path) {
      const opening = path.node.openingElement;
      let tagName = 'unknown';
      if (opening.name.type === 'JSXIdentifier') tagName = opening.name.name.toLowerCase();
      else if (opening.name.type === 'JSXMemberExpression') tagName = 'component';

      const attributes: Record<string, string> = {};
      for (const attr of opening.attributes) {
        if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;
        attributes[attr.name.name] = staticValue(attr);
      }

      const node = createNode({
        tagName,
        attributes,
        line: opening.loc?.start.line ?? 1,
        // Babel columns are 0-based.
        column: (opening.loc?.start.column ?? 0) + 1,
      });
      nodes.set(path.node, node);

      const parent = enclosing(path);
      if (parent) appendChild(parent, node);
      else tree.roots.push(node);
    },
    JSXText(path) {
      const parent = enclosing(path);
      if (parent) parent.ownText += path.node.value;
    },
  });

  return tree;
}

export function extractJsx(source: string, filePath: string, options: ExtractOptions = {}): AnnotatedElement[] {
  return selectElements(parseJsxTree(source, filePath), options.filter ?? byIntent);
}

/** Statically known attribute value; dynamic expressions read as an empty string. */
function staticValue(attr: JSXAttribute): string {
  const value = attr.value;
  if (!value) return 'true'; // <button disabled>
  if (value.type === 'StringLiteral') return value.value;
  if (value.type === 'JSXExpressionContainer') {
    const expr = value.expression;
    if (expr.type === 'StringLiteral') return expr.value;
    if (expr.type === 'BooleanLiteral') return String(expr.value);
    if (expr.type === 'TemplateLiteral' && expr.quasis.length === 1) return expr.quasis[0].value.raw;
  }
  return '';
}
