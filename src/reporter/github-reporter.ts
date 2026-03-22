import type { LintResult } from '../engine.js';

export function githubReport(result: LintResult): string {
  const lines: string[] = [];

  for (const diag of result.diagnostics) {
    const level = diag.severity === 'error' ? 'error' : diag.severity === 'warning' ? 'warning' : 'notice';
    lines.push(`::${level} file=${diag.filePath},line=${diag.line},col=${diag.column}::${diag.message} (${diag.ruleId})`);
  }

  return lines.join('\n');
}
