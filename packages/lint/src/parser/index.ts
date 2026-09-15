import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { AnnotatedElement } from '../types.js';
import { parseHtml } from './html-parser.js';
import { parseJsx } from './jsx-parser.js';

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
      return parseHtml(source, filePath);
    case '.jsx':
    case '.tsx':
      return parseJsx(source, filePath);
    default:
      return [];
  }
}

export { parseHtml } from './html-parser.js';
export { parseJsx } from './jsx-parser.js';
