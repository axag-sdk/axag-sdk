import { describe, it, expect } from 'vitest';
import { lint } from '../../src/engine.js';
import { resolve } from 'node:path';

const fixturesDir = resolve(import.meta.dirname, '../fixtures');

describe('CLI integration: lint engine', () => {
  it('finds no errors in valid-full.html', async () => {
    const result = await lint(resolve(fixturesDir, 'valid-full.html'));
    expect(result.errorCount).toBe(0);
    expect(result.elementsFound).toBeGreaterThan(0);
  });

  it('finds errors in errors-structural.html', async () => {
    const result = await lint(resolve(fixturesDir, 'errors-structural.html'));
    expect(result.errorCount).toBeGreaterThan(0);
    // Should find AXAG-LINT-001, 002, 003, 004, 005
    const ruleIds = new Set(result.diagnostics.map(d => d.ruleId));
    expect(ruleIds.has('AXAG-LINT-001')).toBe(true);
    expect(ruleIds.has('AXAG-LINT-002')).toBe(true);
    expect(ruleIds.has('AXAG-LINT-003')).toBe(true);
    expect(ruleIds.has('AXAG-LINT-004')).toBe(true);
    expect(ruleIds.has('AXAG-LINT-005')).toBe(true);
  });

  it('finds errors in errors-safety.html', async () => {
    const result = await lint(resolve(fixturesDir, 'errors-safety.html'));
    expect(result.diagnostics.length).toBeGreaterThan(0);
    const ruleIds = new Set(result.diagnostics.map(d => d.ruleId));
    expect(ruleIds.has('AXAG-LINT-006')).toBe(true);
    expect(ruleIds.has('AXAG-LINT-007')).toBe(true);
    expect(ruleIds.has('AXAG-LINT-023')).toBe(true);
  });

  it('finds errors in errors-contradictions.html', async () => {
    const result = await lint(resolve(fixturesDir, 'errors-contradictions.html'));
    expect(result.diagnostics.length).toBeGreaterThan(0);
    const ruleIds = new Set(result.diagnostics.map(d => d.ruleId));
    expect(ruleIds.has('AXAG-LINT-012')).toBe(true);
    expect(ruleIds.has('AXAG-LINT-013')).toBe(true);
    expect(ruleIds.has('AXAG-LINT-015')).toBe(true);
  });

  it('parses valid TSX component', async () => {
    const result = await lint(resolve(fixturesDir, 'component.tsx'));
    // Valid component should have no errors
    expect(result.errorCount).toBe(0);
    expect(result.elementsFound).toBeGreaterThan(0);
  });

  it('finds errors in TSX component with errors', async () => {
    const result = await lint(resolve(fixturesDir, 'component-errors.tsx'));
    expect(result.errorCount).toBeGreaterThan(0);
    const ruleIds = new Set(result.diagnostics.map(d => d.ruleId));
    expect(ruleIds.has('AXAG-LINT-001')).toBe(true);
  });

  it('produces valid JSON output', async () => {
    const result = await lint(resolve(fixturesDir, 'errors-structural.html'));
    const { jsonReport } = await import('../../src/reporter/json-reporter.js');
    const output = jsonReport(result);
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('results');
    expect(parsed).toHaveProperty('summary');
    expect(parsed.summary.errors).toBeGreaterThan(0);
  });

  it('produces GitHub Actions annotations', async () => {
    const result = await lint(resolve(fixturesDir, 'errors-structural.html'));
    const { githubReport } = await import('../../src/reporter/github-reporter.js');
    const output = githubReport(result);
    expect(output).toContain('::error');
  });

  it('scans a directory', async () => {
    const result = await lint(fixturesDir);
    expect(result.filesScanned).toBeGreaterThan(1);
    expect(result.elementsFound).toBeGreaterThan(5);
  });
});
