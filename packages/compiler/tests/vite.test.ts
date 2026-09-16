import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build } from 'vite';
import axag from '../src/vite.js';

const APP = path.resolve(import.meta.dirname, 'fixtures/app');
let outDir: string;

async function read(file: string): Promise<string> {
  return fs.readFile(path.join(outDir, file), 'utf-8');
}

describe('vite plugin', () => {
  beforeAll(async () => {
    outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axag-vite-'));
    await build({
      root: APP,
      logLevel: 'silent',
      plugins: [axag({ generatedAt: 'fixed' })],
      build: { outDir, emptyOutDir: true },
    });
  }, 120_000);

  it('writes the manifest to the build output', async () => {
    const manifest = JSON.parse(await read('.well-known/axag-manifest.json'));
    expect(manifest.version).toBe('1.1.0');
    expect(manifest.actions.map((a: { intent: string }) => a.intent)).toContain('user.deactivate');
    expect(manifest.dynamic_actions).toHaveLength(3);
  });

  it('writes WebMCP tools', async () => {
    const { tools } = JSON.parse(await read('axag-tools.webmcp.json'));
    const deactivate = tools.find((t: { name: string }) => t.name === 'user_deactivate');
    expect(deactivate.inputSchema.required).toEqual(['user_id']);
    expect(deactivate.annotations.axag.risk_level).toBe('critical');
  });

  it('serves the tools through virtual:axag/tools', async () => {
    const assets = path.join(outDir, 'assets');
    const bundles = await fs.readdir(assets);
    const code = await Promise.all(bundles.filter(f => f.endsWith('.js')).map(f => fs.readFile(path.join(assets, f), 'utf-8')));
    const joined = code.join('\n');

    expect(joined).toContain('user_deactivate');
    expect(joined).toContain('agent tools');
  });

  it('ships no build-time parser code in the bundle', async () => {
    const assets = path.join(outDir, 'assets');
    const bundles = await fs.readdir(assets);
    const joined = (
      await Promise.all(bundles.filter(f => f.endsWith('.js')).map(f => fs.readFile(path.join(assets, f), 'utf-8')))
    ).join('\n');

    for (const parser of ['@babel/parser', 'cheerio', 'fast-glob', '@vue/compiler-sfc']) {
      expect(joined).not.toContain(parser);
    }
  });
});
