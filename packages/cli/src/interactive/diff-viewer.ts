/**
 * Diff Viewer — shows before/after preview of an annotation.
 */

import chalk from 'chalk';
import type { InferredAnnotation } from '../types/index.js';

/**
 * Pretty-print an annotation diff to the console.
 */
export function showAnnotationDiff(annotation: InferredAnnotation): void {
  console.log();
  console.log(chalk.bold(`  Element: `) + chalk.cyan(annotation.selector));
  console.log(chalk.bold(`  Page:    `) + chalk.dim(annotation.pageUrl));
  console.log();

  // Show the before state
  console.log(chalk.dim('  Before (no AXAG):'));
  console.log(chalk.red(`    <${tagFromSelector(annotation.selector)}>`));
  console.log();

  // Show the after state
  console.log(chalk.dim('  After (with AXAG):'));
  const tag = tagFromSelector(annotation.selector);
  const attrLines = Object.entries(annotation.attributes)
    .map(([key, value]) => chalk.green(`    ${key}="${value}"`))
    .join('\n');
  console.log(chalk.green(`    <${tag}`));
  console.log(attrLines);
  console.log(chalk.green(`    >`));
  console.log();

  // Show reasoning
  console.log(chalk.dim('  Reasoning: ') + annotation.reasoning);
  console.log();
}

/**
 * Show a side-by-side diff of original vs modified annotation.
 */
export function showModificationDiff(
  original: InferredAnnotation,
  modified: InferredAnnotation,
): void {
  console.log();
  console.log(chalk.bold('  Changes:'));

  for (const [key, newValue] of Object.entries(modified.attributes)) {
    const oldValue = original.attributes[key];
    if (oldValue !== newValue) {
      console.log(
        `    ${chalk.dim(key)}: ${chalk.red(oldValue || '(none)')} → ${chalk.green(newValue)}`,
      );
    }
  }
  console.log();
}

function tagFromSelector(selector: string): string {
  // Extract tag name from selector
  const match = selector.match(/^(\w+)/);
  return match ? match[1] : 'element';
}
