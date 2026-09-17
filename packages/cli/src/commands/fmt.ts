/**
 * `axag fmt [target]` command handler — convert annotations between macro and longhand form.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import fg from 'fast-glob';
import { formatHtml } from '@web-axag/core/html';
import { formatJsx } from '@web-axag/core/jsx';
import type { FormatMode, FormatResult } from '@web-axag/core';
import { logger } from '../utils/logger.js';

interface FmtOptions {
  to: string;
  check: boolean;
}

export interface FileFormatResult extends FormatResult {
  filePath: string;
}

const SOURCE_GLOB = '**/*.{html,htm,jsx,tsx}';
const IGNORE = ['node_modules/**', 'dist/**', 'build/**', '.git/**', '.next/**'];

/** Format every HTML/JSX/TSX file under `target` (a file or directory). Writes nothing. */
export async function formatFiles(target: string, mode: FormatMode): Promise<FileFormatResult[]> {
  const resolved = path.resolve(target);
  const stat = await fs.stat(resolved);
  const files = stat.isFile() ? [resolved] : await fg(SOURCE_GLOB, { cwd: resolved, ignore: IGNORE, absolute: true });

  const results: FileFormatResult[] = [];
  for (const filePath of files.sort()) {
    const source = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    const format = ext === '.jsx' || ext === '.tsx' ? formatJsx : formatHtml;
    results.push({ filePath, ...format(source, filePath, mode) });
  }
  return results;
}

export async function fmtCommand(target: string | undefined, options: FmtOptions): Promise<void> {
  if (options.to !== 'macro' && options.to !== 'longhand') {
    logger.error(`--to must be "macro" or "longhand", got "${options.to}"`);
    process.exit(1);
  }
  const mode = options.to as FormatMode;
  const root = target ?? '.';
  const results = await formatFiles(root, mode);

  let changedFiles = 0;
  for (const result of results) {
    const relative = path.relative(process.cwd(), result.filePath);
    const rel = relative.startsWith('..') ? result.filePath : relative;
    const count = chalk.dim(`(${result.changed} ${result.changed === 1 ? 'element' : 'elements'})`);
    for (const skip of result.skipped) {
      logger.warn(`${rel}:${skip.line} left unchanged — ${skip.reason}`);
    }
    if (result.changed === 0) continue;

    changedFiles++;
    if (options.check) {
      console.log(`  ${chalk.yellow('✎')} ${rel} ${count}`);
    } else {
      await fs.writeFile(result.filePath, result.output, 'utf-8');
      console.log(`  ${chalk.green('✔')} ${rel} ${count}`);
    }
  }

  logger.blank();
  if (changedFiles === 0) {
    logger.success(`All annotations in ${results.length} files are already in ${mode} form.`);
  } else if (options.check) {
    logger.error(`${changedFiles} of ${results.length} files need \`axag fmt --to ${mode}\`.`);
    process.exit(1);
  } else {
    logger.success(`Rewrote ${changedFiles} of ${results.length} files to ${mode} form.`);
  }
}
