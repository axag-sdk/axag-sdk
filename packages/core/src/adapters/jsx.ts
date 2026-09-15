/**
 * JSX adapter — extract elements from JSX/TSX source with Babel.
 * Requires the optional peer dependencies `@babel/parser` and `@babel/traverse`.
 */

import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { TraverseOptions } from '@babel/traverse';
import type { JSXAttribute, Node } from '@babel/types';
import { hasIntent, normalizeAttributes } from '../annotation.js';
import type { AnnotatedElement, ElementFilter } from '../types.js';

// @babel/traverse is CJS; its default export is nested under ESM interop.
type Traverse = (ast: Node, visitors: TraverseOptions) => void;
const traverse = ((_traverse as unknown as { default?: Traverse }).default ?? _traverse) as unknown as Traverse;

export interface ExtractOptions {
  /** Defaults to elements that declare axag-intent. */
  filter?: ElementFilter;
}

const byIntent: ElementFilter = el => hasIntent(el.allAttributes);

export function extractJsx(source: string, filePath: string, options: ExtractOptions = {}): AnnotatedElement[] {
  const filter = options.filter ?? byIntent;
  const elements: AnnotatedElement[] = [];

  let ast;
  try {
    ast = parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'], errorRecovery: true });
  } catch {
    return elements;
  }

  traverse(ast, {
    JSXOpeningElement(path) {
      const node = path.node;
      let tagName = 'unknown';
      if (node.name.type === 'JSXIdentifier') tagName = node.name.name.toLowerCase();
      else if (node.name.type === 'JSXMemberExpression') tagName = 'component';

      const allAttributes: Record<string, string> = {};
      for (const attr of node.attributes) {
        if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;
        allAttributes[attr.name.name] = staticValue(attr);
      }
      if (!filter({ tagName, allAttributes })) return;

      elements.push({
        tagName,
        attributes: normalizeAttributes(allAttributes),
        allAttributes,
        filePath,
        line: node.loc?.start.line ?? 1,
        // Babel columns are 0-based.
        column: (node.loc?.start.column ?? 0) + 1,
      });
    },
  });

  return elements;
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
