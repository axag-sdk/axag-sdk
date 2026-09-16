/**
 * SARIF 2.1.0 — the format GitHub code scanning reads, so findings appear on
 * the Security tab and inline on a pull request without a custom step.
 */

import { relative } from 'node:path';
import { ALL_RULES } from '../rules/index.js';
import type { LintResult } from '../engine.js';
import type { Diagnostic } from '../types.js';

const LEVELS: Record<Diagnostic['severity'], string> = { error: 'error', warning: 'warning', info: 'note' };

export interface SarifOptions {
  /** Paths are reported relative to this. Defaults to the working directory. */
  root?: string;
  version?: string;
}

export function sarifReport(result: LintResult, options: SarifOptions = {}): string {
  const root = options.root ?? process.cwd();
  const used = new Set(result.diagnostics.map(diagnostic => diagnostic.ruleId));

  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'axag-lint',
            informationUri: 'https://axag.org/docs/validation/ci-linting',
            version: options.version ?? '1.0.1',
            rules: ALL_RULES.filter(rule => used.has(rule.id)).map(rule => ({
              id: rule.id,
              name: rule.id.replace(/-/g, ''),
              shortDescription: { text: rule.description },
              helpUri: `https://axag.org/docs/validation/ci-linting#${rule.id.toLowerCase()}`,
              properties: { category: rule.category, problem: { severity: LEVELS[rule.defaultSeverity] } },
            })),
          },
        },
        results: result.diagnostics.map(diagnostic => ({
          ruleId: diagnostic.ruleId,
          level: LEVELS[diagnostic.severity],
          message: { text: diagnostic.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: toUri(diagnostic.filePath, root) },
                region: { startLine: Math.max(diagnostic.line, 1), startColumn: Math.max(diagnostic.column, 1) },
              },
            },
          ],
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

/** SARIF wants forward slashes, relative to the repository root. */
function toUri(filePath: string, root: string): string {
  const relativePath = relative(root, filePath);
  return (relativePath.startsWith('..') ? filePath : relativePath).split('\\').join('/');
}
