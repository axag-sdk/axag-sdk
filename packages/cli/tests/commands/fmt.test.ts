import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { formatFiles } from '../../src/commands/fmt.js';
import { scanFiles } from '../../src/scanner/file-scanner.js';
import { generateManifest } from '../../src/manifest/generator.js';

const SAMPLE_APP = path.resolve(import.meta.dirname, '../integration/sample-app');

async function copySampleApp(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'axag-fmt-'));
  await fs.cp(SAMPLE_APP, dir, { recursive: true });
  return dir;
}

const actionsOf = async (dir: string) =>
  generateManifest(await scanFiles(dir), { paths: ['.'] }).actions.map(
    ({ source_file: _f, source_line: _l, ...rest }) => rest,
  );

describe('axag fmt', () => {
  it('converts the sample app to macros and back without changing the manifest', async () => {
    const dir = await copySampleApp();
    const before = await actionsOf(dir);

    const toMacro = await formatFiles(dir, 'macro');
    expect(toMacro.reduce((n, r) => n + r.changed, 0)).toBeGreaterThan(0);
    for (const r of toMacro) await fs.writeFile(r.filePath, r.output);
    expect(await actionsOf(dir)).toEqual(before);
    expect((await formatFiles(dir, 'macro')).every(r => r.changed === 0)).toBe(true);

    for (const r of await formatFiles(dir, 'longhand')) await fs.writeFile(r.filePath, r.output);
    expect(await actionsOf(dir)).toEqual(before);
  });

  it('formats a single file', async () => {
    const dir = await copySampleApp();
    const [result] = await formatFiles(path.join(dir, 'public/index.html'), 'macro');
    expect(result.filePath.endsWith('index.html')).toBe(true);
  });
});
