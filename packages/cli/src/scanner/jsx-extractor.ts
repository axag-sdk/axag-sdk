/**
 * JSX Extractor — extract elements with axag-* attributes from JSX/TSX files.
 */

import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { AnnotatedElement } from './html-extractor.js';

// Handle ESM/CJS interop
const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as { default: typeof _traverse }).default) as typeof _traverse;

/**
 * Extract elements with axag-* attributes from a JSX/TSX string.
 */
export function extractJsxAnnotations(source: string, filePath: string): AnnotatedElement[] {
  const elements: AnnotatedElement[] = [];

  let ast;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });
  } catch {
    return elements;
  }

  traverse(ast, {
    JSXOpeningElement(path) {
      const node = path.node;
      const attrs: Record<string, string> = {};
      let hasAxagIntent = false;

      // Get tag name
      let tagName = 'unknown';
      if (node.name.type === 'JSXIdentifier') {
        tagName = node.name.name.toLowerCase();
      } else if (node.name.type === 'JSXMemberExpression') {
        tagName = 'component';
      }

      for (const attr of node.attributes) {
        if (attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier') {
          const name = attr.name.name;
          let value = '';

          if (attr.value) {
            if (attr.value.type === 'StringLiteral') {
              value = attr.value.value;
            } else if (attr.value.type === 'JSXExpressionContainer') {
              if (attr.value.expression.type === 'StringLiteral') {
                value = attr.value.expression.value;
              } else if (attr.value.expression.type === 'BooleanLiteral') {
                value = String(attr.value.expression.value);
              }
            }
          } else {
            value = 'true';
          }

          attrs[name] = value;
          if (name === 'axag-intent') {
            hasAxagIntent = true;
          }
        }
      }

      if (hasAxagIntent) {
        elements.push({
          tagName,
          attributes: attrs,
          filePath,
          line: node.loc?.start.line ?? 1,
          column: node.loc?.start.column ?? 0,
        });
      }
    },
  });

  return elements;
}
