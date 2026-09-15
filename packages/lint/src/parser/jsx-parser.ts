import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { AnnotatedElement } from '../types.js';

// Handle both ESM default and CJS interop
const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as { default: typeof _traverse }).default) as typeof _traverse;

/**
 * Parse a JSX/TSX string and extract elements with axag-* attributes.
 */
export function parseJsx(source: string, filePath: string): AnnotatedElement[] {
  const elements: AnnotatedElement[] = [];

  let ast;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });
  } catch {
    // If parsing fails, return empty — file might not be valid JSX/TSX
    return elements;
  }

  traverse(ast, {
    JSXOpeningElement(path) {
      const node = path.node;
      const allAttrs: Record<string, string> = {};
      const axagAttrs: Record<string, string> = {};
      let hasAxag = false;
      let isInteractive = false;

      // Get tag name
      let tagName = 'unknown';
      if (node.name.type === 'JSXIdentifier') {
        tagName = node.name.name.toLowerCase();
      } else if (node.name.type === 'JSXMemberExpression') {
        tagName = 'component';
      }

      // Check if interactive
      if (['button', 'a', 'input', 'form'].includes(tagName)) {
        isInteractive = true;
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
              } else if (attr.value.expression.type === 'TemplateLiteral' && attr.value.expression.quasis.length === 1) {
                value = attr.value.expression.quasis[0].value.raw;
              }
            }
          } else {
            // Boolean attribute (e.g., <button disabled>)
            value = 'true';
          }

          allAttrs[name] = value;
          if (name.startsWith('axag-')) {
            axagAttrs[name] = value;
            hasAxag = true;
          }
          if (name === 'onClick' || name === 'onclick') {
            isInteractive = true;
          }
          if (name === 'role' && value === 'button') {
            isInteractive = true;
          }
          if (name === 'type' && value === 'submit') {
            isInteractive = true;
          }
        }
      }

      if (hasAxag || isInteractive) {
        elements.push({
          tagName,
          attributes: axagAttrs,
          allAttributes: allAttrs,
          filePath,
          line: node.loc?.start.line ?? 1,
          column: node.loc?.start.column ?? 0,
        });
      }
    },
  });

  return elements;
}
