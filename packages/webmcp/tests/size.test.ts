import { describe, it, expect } from 'vitest';
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

async function bundleSize(code: string): Promise<number> {
  const result = await build({
    stdin: { contents: code, resolveDir: ROOT, loader: 'ts' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    logLevel: 'silent',
  });
  return gzipSync(result.outputFiles[0].contents).length;
}

describe('bundle size', () => {
  it('stays small for an app registering tools from its build', async () => {
    const size = await bundleSize(`
      import { registerManifest } from './src/index.js';
      globalThis.register = tools => registerManifest(tools, { signal: new AbortController().signal });
    `);
    // Budget: the registration path an app ships when the build produced its tools.
    expect(size).toBeLessThan(2_048);
  });

  it('stays within budget when the page is read at runtime', async () => {
    const size = await bundleSize(`
      import { registerDocument } from './src/index.js';
      globalThis.register = () => registerDocument();
    `);
    // Reading the live DOM pulls in the annotation reader and harvesting.
    expect(size).toBeLessThan(8_192);
  });
});
