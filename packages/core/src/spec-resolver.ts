/**
 * Static resolution of `axag={spec}` values.
 *
 * Node only: it reads the files a spec is imported from. Used by @web-axag/compiler
 * at build time and by axag-lint, so both agree on which specs are readable.
 *
 * A spec can be read at build time when it is a module-level `const` holding an
 * object literal or a `defineAction({...})` call, in this file or one it imports.
 * Anything else — a function call, a value built at runtime, a prop — stays
 * dynamic and is registered by the runtime instead.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import type {
  Expression,
  File,
  Node,
  ObjectExpression,
  Statement,
} from '@babel/types';
import { specToAttributes } from './spec.js';
import type { ActionSpec } from './spec.js';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

export class SpecResolver {
  private readonly asts = new Map<string, File | null>();

  /**
   * Hand the resolver source it already has, so the file being read isn't read
   * again from disk — and so a caller working on unsaved text still resolves.
   */
  provideSource(filePath: string, source: string): void {
    this.asts.set(filePath, parseSource(source));
  }

  /** Attributes for a statically readable spec, or undefined when it is dynamic. */
  resolve(expression: Expression, filePath: string): Record<string, string> | undefined {
    const spec = this.evaluateSpec(expression, filePath, new Set());
    if (!spec || typeof spec.intent !== 'string') return undefined;
    return specToAttributes(spec as unknown as ActionSpec);
  }

  private evaluateSpec(expression: Node, filePath: string, seen: Set<string>): Record<string, unknown> | undefined {
    if (expression.type === 'ObjectExpression') {
      const value = evaluateObject(expression);
      return value ?? undefined;
    }
    if (expression.type === 'CallExpression') {
      const callee = expression.callee;
      const isDefineAction = callee.type === 'Identifier' && callee.name === 'defineAction';
      const first = expression.arguments[0];
      if (isDefineAction && first && first.type === 'ObjectExpression') {
        return evaluateObject(first) ?? undefined;
      }
      return undefined;
    }
    if (expression.type === 'TSAsExpression' || expression.type === 'TSSatisfiesExpression') {
      return this.evaluateSpec(expression.expression, filePath, seen);
    }
    if (expression.type === 'Identifier') {
      const binding = this.findBinding(expression.name, filePath, seen);
      return binding ? this.evaluateSpec(binding.node, binding.filePath, seen) : undefined;
    }
    return undefined;
  }

  /** Follow a name to its `const` initialiser, crossing relative imports. */
  private findBinding(name: string, filePath: string, seen: Set<string>): { node: Expression; filePath: string } | undefined {
    const key = `${filePath}#${name}`;
    if (seen.has(key)) return undefined;
    seen.add(key);

    const ast = this.parseFile(filePath);
    if (!ast) return undefined;

    for (const statement of ast.program.body) {
      const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
      if (declaration?.type === 'VariableDeclaration') {
        for (const declarator of declaration.declarations) {
          if (declarator.id.type === 'Identifier' && declarator.id.name === name && declarator.init) {
            return { node: declarator.init, filePath };
          }
        }
      }
      const imported = importedFrom(statement, name);
      if (!imported) continue;

      const target = this.resolveImport(imported.source, filePath);
      if (!target) return undefined;
      return this.findBinding(imported.name, target, seen);
    }
    return undefined;
  }

  private parseFile(filePath: string): File | null {
    if (!this.asts.has(filePath)) {
      let source: string | undefined;
      try {
        source = fs.readFileSync(filePath, 'utf-8');
      } catch {
        source = undefined;
      }
      this.asts.set(filePath, source === undefined ? null : parseSource(source));
    }
    return this.asts.get(filePath) ?? null;
  }

  /** Relative imports only; a spec from a package is treated as dynamic. */
  private resolveImport(source: string, fromFile: string): string | undefined {
    if (!source.startsWith('.')) return undefined;
    const base = path.resolve(path.dirname(fromFile), source);
    const candidates = [
      base,
      ...EXTENSIONS.map(ext => base + ext),
      ...EXTENSIONS.map(ext => path.join(base, `index${ext}`)),
      // TypeScript source for a ".js" specifier.
      ...['.ts', '.tsx'].map(ext => base.replace(/\.js$/, ext)),
    ];
    return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  }
}

function parseSource(source: string): File | null {
  try {
    return parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'], errorRecovery: true });
  } catch {
    return null;
  }
}

function importedFrom(statement: Statement, name: string): { name: string; source: string } | undefined {
  if (statement.type !== 'ImportDeclaration') return undefined;
  for (const specifier of statement.specifiers) {
    if (specifier.local.name !== name) continue;
    if (specifier.type === 'ImportDefaultSpecifier') return { name: 'default', source: statement.source.value };
    if (specifier.type === 'ImportSpecifier') {
      const imported = specifier.imported;
      return { name: imported.type === 'Identifier' ? imported.name : imported.value, source: statement.source.value };
    }
  }
  return undefined;
}

/** Plain JSON-ish evaluation. Returns null when any part isn't a literal. */
function evaluateObject(node: ObjectExpression): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};
  for (const property of node.properties) {
    if (property.type !== 'ObjectProperty' || property.computed) return null;
    const key =
      property.key.type === 'Identifier' ? property.key.name :
      property.key.type === 'StringLiteral' ? property.key.value : undefined;
    if (key === undefined) return null;
    // A handler is expected to be a function; it plays no part in the manifest.
    if (key === 'handler') continue;

    const value = evaluate(property.value as Node);
    if (value === UNRESOLVED) return null;
    result[key] = value;
  }
  return result;
}

const UNRESOLVED = Symbol('unresolved');

function evaluate(node: Node): unknown {
  switch (node.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
      return node.value;
    case 'NullLiteral':
      return null;
    case 'TemplateLiteral':
      return node.expressions.length === 0 ? node.quasis[0].value.cooked : UNRESOLVED;
    case 'UnaryExpression':
      if (node.operator === '-') {
        const value = evaluate(node.argument);
        return typeof value === 'number' ? -value : UNRESOLVED;
      }
      return UNRESOLVED;
    case 'ArrayExpression': {
      const items: unknown[] = [];
      for (const element of node.elements) {
        if (!element || element.type === 'SpreadElement') return UNRESOLVED;
        const value = evaluate(element);
        if (value === UNRESOLVED) return UNRESOLVED;
        items.push(value);
      }
      return items;
    }
    case 'ObjectExpression': {
      const value = evaluateObject(node);
      return value ?? UNRESOLVED;
    }
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
      return evaluate(node.expression);
    default:
      return UNRESOLVED;
  }
}
