import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { lint } from '../src/engine.js';
import { sarifReport } from '../src/reporter/sarif-reporter.js';
import { applyBaseline, createBaseline, writeBaseline } from '../src/baseline.js';

async function project(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'axag-lint-'));
  await fs.writeFile(
    path.join(dir, 'page.html'),
    `<button axag-intent="cart.add_item" axag-entity="cart">Add</button>
     <button>Unannotated</button>`,
  );
  return dir;
}

describe('sarif', () => {
  it('describes each finding where GitHub code scanning expects it', async () => {
    const dir = await project();
    const result = await lint(dir);
    const sarif = JSON.parse(sarifReport(result, { root: dir }));

    expect(sarif.version).toBe('2.1.0');
    const [run] = sarif.runs;
    expect(run.tool.driver.name).toBe('axag-lint');

    // Only the rules that fired are described, and each has help.
    const described = run.tool.driver.rules.map((rule: { id: string }) => rule.id);
    expect(described).toContain('AXAG-LINT-003');
    expect(run.tool.driver.rules[0].helpUri).toContain('axag.org');

    const [finding] = run.results;
    expect(finding.level).toMatch(/error|warning|note/);
    // Paths are relative to the repository root, with forward slashes.
    expect(finding.locations[0].physicalLocation.artifactLocation.uri).toBe('page.html');
    expect(finding.locations[0].physicalLocation.region.startLine).toBeGreaterThan(0);
  });
});

describe('baseline', () => {
  it('hides findings that already existed, and reports new ones', async () => {
    const dir = await project();
    const before = await lint(dir);
    expect(before.diagnostics.length).toBeGreaterThan(0);

    writeBaseline(before, dir);
    expect(applyBaseline(before, dir).diagnostics).toEqual([]);
    expect(applyBaseline(before, dir).errorCount).toBe(0);

    // A new problem of the same kind in the same file is still reported.
    await fs.appendFile(path.join(dir, 'page.html'), '\n<button>Another unannotated</button>');
    const after = await lint(dir);
    const remaining = applyBaseline(after, dir);
    expect(remaining.diagnostics).toHaveLength(1);
    expect(remaining.diagnostics[0].ruleId).toBe('AXAG-LINT-001');
  });

  it('records rule and file, not line numbers, so unrelated edits do not reset it', async () => {
    const dir = await project();
    const baseline = JSON.parse(createBaseline(await lint(dir), dir));
    expect(Object.keys(baseline.findings)).toContain('AXAG-LINT-001');
    expect(baseline.findings['AXAG-LINT-001']).toEqual({ 'page.html': 1 });
    expect(JSON.stringify(baseline)).not.toContain('"line"');
  });

  it('passes everything through when there is no baseline file', async () => {
    const dir = await project();
    const result = await lint(dir);
    expect(applyBaseline(result, dir).diagnostics).toHaveLength(result.diagnostics.length);
  });
});

describe('changed-since', () => {
  it('lints everything when the directory is not a git repository', async () => {
    const dir = await project();
    const result = await lint(dir, { changedSince: 'origin/main' });
    expect(result.filesScanned).toBe(1);
  });
});

describe('conformance levels', () => {
  it('runs more rules as the level rises', async () => {
    const { rulesForLevel, categoriesFor } = await import('../src/levels.js');

    expect(categoriesFor('basic').has('identity')).toBe(true);
    expect(categoriesFor('basic').has('safety')).toBe(false);
    expect(categoriesFor('intermediate').has('safety')).toBe(true);
    expect(categoriesFor('intermediate').has('enforcement')).toBe(false);
    expect(categoriesFor('full').has('enforcement')).toBe(true);

    // What's switched off shrinks as the level rises.
    const off = (level: Parameters<typeof rulesForLevel>[0]) => Object.keys(rulesForLevel(level)).length;
    expect(off('basic')).toBeGreaterThan(off('intermediate'));
    expect(off('intermediate')).toBeGreaterThan(off('full'));
    expect(off('full')).toBe(0);
  });

  it('applies the overrides a caller passes', async () => {
    const dir = await project();
    // A write action that trips a safety rule, which `basic` leaves out.
    await fs.writeFile(
      path.join(dir, 'admin.html'),
      '<button axag="write:user.deactivate!critical">Deactivate</button>',
    );
    const all = await lint(dir);
    const basic = await lint(dir, { rules: (await import('../src/levels.js')).rulesForLevel('basic') });

    expect(all.diagnostics.length).toBeGreaterThan(basic.diagnostics.length);
    expect(basic.diagnostics.every(d => d.ruleId !== 'AXAG-LINT-007')).toBe(true);
  });
});
