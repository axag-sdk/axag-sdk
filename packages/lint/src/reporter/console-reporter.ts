import chalk from 'chalk';
import type { LintResult } from '../engine.js';

export function consoleReport(result: LintResult, quiet: boolean = false): string {
  const lines: string[] = [];
  let currentFile = '';

  for (const diag of result.diagnostics) {
    if (quiet && diag.severity !== 'error') continue;

    if (diag.filePath !== currentFile) {
      currentFile = diag.filePath;
      if (lines.length > 0) lines.push('');
      lines.push(chalk.underline(currentFile));
    }

    const loc = chalk.dim(`${diag.line}:${diag.column}`);
    const sev = diag.severity === 'error'
      ? chalk.red('error')
      : diag.severity === 'warning'
        ? chalk.yellow('warning')
        : chalk.blue('info');
    const id = chalk.dim(diag.ruleId);

    lines.push(`  ${loc}  ${sev}  ${diag.message}  ${id}`);
  }

  if (lines.length > 0) {
    lines.push('');
  }

  // Summary
  if (result.errorCount === 0 && result.warningCount === 0) {
    lines.push(chalk.green(`✓ No issues found (${result.filesScanned} files, ${result.elementsFound} elements)`));
  } else {
    const parts: string[] = [];
    if (result.errorCount > 0) parts.push(chalk.red(`${result.errorCount} error${result.errorCount > 1 ? 's' : ''}`));
    if (result.warningCount > 0 && !quiet) parts.push(chalk.yellow(`${result.warningCount} warning${result.warningCount > 1 ? 's' : ''}`));
    lines.push(chalk.bold(`✗ ${parts.join(', ')} in ${result.filesScanned} file${result.filesScanned > 1 ? 's' : ''}`));
  }

  return lines.join('\n');
}
