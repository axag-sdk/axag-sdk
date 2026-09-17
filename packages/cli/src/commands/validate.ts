/**
 * `axag validate [target]` command handler.
 *
 * Runs the same rules as `axag-lint`, limited to the conformance level asked
 * for, so a codebase gets one answer about its annotations rather than two.
 */

import path from 'node:path';
import chalk from 'chalk';
import { table } from 'table';
import { lint, rulesForLevel } from '@web-axag/lint';
import type { LintResult } from '@web-axag/lint';
import { toConformanceLevel } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

interface ValidateOptions {
  strict: boolean;
  level: string;
  manifest?: string;
}

export async function validateCommand(target: string | undefined, options: ValidateOptions): Promise<void> {
  logger.section('AXAG Validation');

  const resolvedPath = path.resolve(target ?? '.');
  if ((target ?? '').startsWith('http')) {
    logger.error('URL validation needs a running browser. Use `axag scan --no-interactive` instead.');
    process.exit(1);
  }

  const level = toConformanceLevel(options.level);
  logger.info(`Validating ${resolvedPath} at conformance level ${level}...`);
  logger.blank();

  let result: LintResult;
  try {
    result = await lint(resolvedPath, { manifest: options.manifest, rules: rulesForLevel(level) });
  } catch (error) {
    logger.error(`Could not read ${resolvedPath}: ${(error as Error).message}`);
    process.exit(1);
  }

  const errors = result.diagnostics.filter(d => d.severity === 'error');
  const warnings = result.diagnostics.filter(d => d.severity === 'warning');

  if (errors.length > 0) {
    logger.section('Errors');
    for (const diagnostic of errors) console.log(`  ${chalk.red('✖')} ${location(diagnostic, resolvedPath)} ${diagnostic.message} ${chalk.dim(diagnostic.ruleId)}`);
  }
  if (warnings.length > 0) {
    logger.section('Warnings');
    for (const diagnostic of warnings) console.log(`  ${chalk.yellow('⚠')} ${location(diagnostic, resolvedPath)} ${diagnostic.message} ${chalk.dim(diagnostic.ruleId)}`);
  }

  logger.section('Validation Summary');
  console.log(
    table([
      ['Metric', 'Count'],
      ['Files scanned', String(result.filesScanned)],
      ['Annotated elements', String(result.elementsFound)],
      ['Errors', errors.length > 0 ? chalk.red(String(errors.length)) : '0'],
      ['Warnings', warnings.length > 0 ? chalk.yellow(String(warnings.length)) : '0'],
    ]),
  );

  if (errors.length > 0) {
    logger.error(`Validation failed at conformance level ${level}.`);
    process.exit(1);
  }
  if (warnings.length > 0) {
    logger.warn('Validation passed with warnings.');
    if (options.strict) process.exit(1);
    return;
  }
  logger.success('All validations passed! ✨');
}

function location(diagnostic: { filePath: string; line: number; column: number }, root: string): string {
  const relative = path.relative(root, diagnostic.filePath) || path.basename(diagnostic.filePath);
  return chalk.dim(`${relative}:${diagnostic.line}:${diagnostic.column}`);
}
