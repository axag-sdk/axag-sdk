/**
 * Baselines, for turning the linter on in a codebase that predates it.
 *
 * A baseline records the findings that already existed. Later runs report only
 * what is new, so a team can adopt a rule without a day spent on a mass fix —
 * and can't quietly add more of the same.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type { Diagnostic } from './types.js';
import type { LintResult } from './engine.js';

export const DEFAULT_BASELINE_PATH = '.axag-lint-baseline.json';

interface BaselineFile {
  /** What the findings were counted against, for a human reading the diff. */
  generatedAt: string;
  /** rule id → file → count. Line numbers are left out: they move for unrelated reasons. */
  findings: Record<string, Record<string, number>>;
}

function key(diagnostic: Diagnostic, root: string): [string, string] {
  const path = relative(root, diagnostic.filePath).split('\\').join('/');
  return [diagnostic.ruleId, path.startsWith('..') ? diagnostic.filePath : path];
}

export function createBaseline(result: LintResult, root: string): string {
  const findings: BaselineFile['findings'] = {};
  for (const diagnostic of result.diagnostics) {
    const [rule, file] = key(diagnostic, root);
    findings[rule] ??= {};
    findings[rule][file] = (findings[rule][file] ?? 0) + 1;
  }
  return JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2) + '\n';
}

export function writeBaseline(result: LintResult, root: string, path = DEFAULT_BASELINE_PATH): string {
  const target = resolve(root, path);
  writeFileSync(target, createBaseline(result, root));
  return target;
}

/**
 * Drop findings the baseline already accounted for. A rule that fires more
 * times in a file than the baseline recorded still reports the extras.
 */
export function applyBaseline(result: LintResult, root: string, path = DEFAULT_BASELINE_PATH): LintResult {
  const target = resolve(root, path);
  if (!existsSync(target)) return result;

  let allowance: BaselineFile['findings'];
  try {
    allowance = structuredClone((JSON.parse(readFileSync(target, 'utf-8')) as BaselineFile).findings ?? {});
  } catch {
    return result;
  }

  const kept: Diagnostic[] = [];
  for (const diagnostic of result.diagnostics) {
    const [rule, file] = key(diagnostic, root);
    const remaining = allowance[rule]?.[file] ?? 0;
    if (remaining > 0) allowance[rule][file] = remaining - 1;
    else kept.push(diagnostic);
  }

  return {
    ...result,
    diagnostics: kept,
    errorCount: kept.filter(d => d.severity === 'error').length,
    warningCount: kept.filter(d => d.severity === 'warning').length,
  };
}
