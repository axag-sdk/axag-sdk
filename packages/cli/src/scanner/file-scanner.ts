/**
 * File Scanner — scan a directory for HTML/JSX/TSX files and extract axag-* annotated elements.
 */

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import fg from 'fast-glob';
import { extractHtmlAnnotations, type AnnotatedElement } from './html-extractor.js';
import { extractJsxAnnotations } from './jsx-extractor.js';

export type { AnnotatedElement };

/**
 * Scan a directory for annotated elements in HTML, JSX, TSX files.
 */
export async function scanFiles(targetPath: string): Promise<AnnotatedElement[]> {
  const files = await fg(['**/*.{html,htm,jsx,tsx}'], {
    cwd: targetPath,
    ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**', '.next/**'],
    absolute: true,
  });

  const allElements: AnnotatedElement[] = [];

  for (const filePath of files) {
    let source: string;
    try {
      source = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const ext = extname(filePath).toLowerCase();
    let elements: AnnotatedElement[];

    switch (ext) {
      case '.html':
      case '.htm':
        elements = extractHtmlAnnotations(source, filePath);
        break;
      case '.jsx':
      case '.tsx':
        elements = extractJsxAnnotations(source, filePath);
        break;
      default:
        continue;
    }

    allElements.push(...elements);
  }

  return allElements;
}
