/**
 * JSX adapter — read JSX/TSX source with Babel.
 * Requires the optional peer dependencies `@babel/parser` and `@babel/traverse`.
 */

import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { NodePath, TraverseOptions } from '@babel/traverse';
import type { Expression, JSXAttribute, JSXElement, Node } from '@babel/types';
import { hasIntent } from '../annotation.js';
import { MACRO_ATTRIBUTE } from '../macro.js';
import { formatTree } from '../format.js';
import type { FormatMode, FormatResult } from '../format.js';
import { appendChild, createNode, selectElements } from '../tree.js';
import type { AttributeSpan, ElementNode, ElementTree } from '../tree.js';
import type { AnnotatedElement, ElementFilter } from '../types.js';

// @babel/traverse is CJS; its default export is nested under ESM interop.
type Traverse = (ast: Node, visitors: TraverseOptions) => void;
const traverse = ((_traverse as unknown as { default?: Traverse }).default ?? _traverse) as unknown as Traverse;

export interface ParseOptions {
  /**
   * Expand a dynamic `axag={spec}` value into attributes. @web-axag/compiler passes
   * this to resolve `defineAction({...})` objects at build time; without it a
   * dynamic value stays empty and the element is registered at runtime instead.
   */
  resolveSpec?: (expression: Expression, filePath: string) => Record<string, string> | undefined;
}

export interface ExtractOptions extends ParseOptions {
  /** Defaults to elements that declare axag-intent. */
  filter?: ElementFilter;
}

const byIntent: ElementFilter = el => hasIntent(el.allAttributes);

/**
 * Every JSX element becomes a node. Fragments are transparent, and JSX nested
 * inside expressions (`{open && <Dialog/>}`, `.map(...)`) attaches to the
 * nearest enclosing JSX element. Unparseable source yields an empty tree.
 */
export function parseJsxTree(source: string, filePath: string, options: ParseOptions = {}): ElementTree {
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
      const spans: Record<string, AttributeSpan> = {};
      let resolved: Record<string, string> | undefined;
      for (const attr of opening.attributes) {
        if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;
        attributes[attr.name.name] = staticValue(attr);
        spans[attr.name.name] = { start: attr.start ?? 0, end: attr.end ?? 0, static: isStringLiteral(attr) };

        const expression = attr.name.name === MACRO_ATTRIBUTE && attr.value?.type === 'JSXExpressionContainer'
          ? attr.value.expression
          : undefined;
        if (options.resolveSpec && expression && expression.type !== 'JSXEmptyExpression') {
          resolved = options.resolveSpec(expression, filePath);
        }
      }
      // A resolved spec stands in for the attributes an author would have written.
      if (resolved) {
        delete attributes[MACRO_ATTRIBUTE];
        delete spans[MACRO_ATTRIBUTE];
        Object.assign(attributes, resolved);
      }

      const node = createNode({
        tagName,
        attributes,
        line: opening.loc?.start.line ?? 1,
        // Babel columns are 0-based.
        column: (opening.loc?.start.column ?? 0) + 1,
        spans,
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
  return selectElements(parseJsxTree(source, filePath, options), options.filter ?? byIntent);
}

/** Rewrite every annotated element in JSX/TSX source to macro or longhand form. */
export function formatJsx(source: string, filePath: string, mode: FormatMode): FormatResult {
  return formatTree(source, parseJsxTree(source, filePath), mode);
}

/** Only plain string attributes (`name="..."`, `name='...'`) can be rewritten as text. */
function isStringLiteral(attr: JSXAttribute): boolean {
  return attr.value?.type === 'StringLiteral';
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
