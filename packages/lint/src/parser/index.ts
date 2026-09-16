import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { AnnotatedElement } from '../types.js';
import { SpecResolver } from '@axag/core/spec-resolver';
import { parseHtml } from './html-parser.js';
import { parseJsx } from './jsx-parser.js';

/** Shared across a lint run so a spec module is read once, not once per importer. */
const resolver = new SpecResolver();

/**
 * Parse a file and extract annotated elements based on its extension.
 */
export function parseFile(filePath: string): AnnotatedElement[] {
  const ext = extname(filePath).toLowerCase();
  let source: string;

  try {
    source = readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  switch (ext) {
    case '.html':
    case '.htm':
    // A Vue SFC's <template> block parses as HTML; `:axag` bindings read as dynamic.
    case '.vue':
      return parseHtml(source, filePath);
    case '.jsx':
    case '.tsx':
      return parseJsx(source, filePath, resolver);
    default:
      return [];
  }
}

export { parseHtml } from './html-parser.js';
export { parseJsx } from './jsx-parser.js';
