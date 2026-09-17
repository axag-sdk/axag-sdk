/**
 * The path axag-cli takes: glob files, read them with the core adapters, build a
 * manifest. Used to check the compiler produces the same thing.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { buildManifest } from '@web-axag/core';
import { extractHtml } from '@web-axag/core/html';
import { extractJsx } from '@web-axag/core/jsx';
import type { Manifest } from '@web-axag/core';

export async function scanFilesLikeCli(root: string): Promise<Manifest> {
  const files = (await fg(['**/*.{html,htm,jsx,tsx}'], { cwd: root, absolute: true, ignore: ['**/node_modules/**'] })).sort();
  const elements = [];
  for (const file of files) {
    const source = await fs.readFile(file, 'utf-8');
    const relative = path.relative(root, file);
    const extension = path.extname(file);
    elements.push(...(extension === '.tsx' || extension === '.jsx'
      ? extractJsx(source, relative)
      : extractHtml(source, relative)));
  }
  return buildManifest(elements, { paths: [root], tool: '@web-axag/compiler', toolVersion: '0.1.0', generatedAt: 'fixed' }).manifest;
}
