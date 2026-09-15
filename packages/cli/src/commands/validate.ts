/**
 * `axag validate [target]` command handler.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import * as cheerio from 'cheerio';
import type { Element as DomElement } from 'domhandler';
import { table } from 'table';
import { AXAG_ATTRIBUTES, INTERACTIVE_SELECTORS, RISK_LEVELS, ACTION_TYPES } from '../utils/constants.js';
import type { ValidationRuleResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface ValidateOptions {
  strict: boolean;
  level: string;
}

/**
 * Validation rules inspired by the AXAG specification.
 */
const VALIDATION_RULES: Array<{
  id: string;
  name: string;
  severity: 'error' | 'warning';
  level: 'A' | 'AA' | 'AAA';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check: (el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI) => string | null;
}> = [
  {
    id: 'AX-001',
    name: 'axag-intent required',
    severity: 'error',
    level: 'A',
    check: (el) => {
      if (!el.attr(AXAG_ATTRIBUTES.INTENT)) {
        return 'Missing required axag-intent attribute';
      }
      const intent = el.attr(AXAG_ATTRIBUTES.INTENT)!;
      if (!intent.includes('.')) {
        return `axag-intent "${intent}" must use entity.action format`;
      }
      return null;
    },
  },
  {
    id: 'AX-002',
    name: 'axag-entity required',
    severity: 'error',
    level: 'A',
    check: (el) => !el.attr(AXAG_ATTRIBUTES.ENTITY) ? 'Missing required axag-entity attribute' : null,
  },
  {
    id: 'AX-003',
    name: 'axag-action-type valid',
    severity: 'error',
    level: 'A',
    check: (el) => {
      const action = el.attr(AXAG_ATTRIBUTES.ACTION_TYPE);
      if (!action) return 'Missing required axag-action-type attribute';
      if (!ACTION_TYPES.includes(action as typeof ACTION_TYPES[number])) {
        return `Invalid axag-action-type "${action}". Must be: ${ACTION_TYPES.join(', ')}`;
      }
      return null;
    },
  },
  {
    id: 'AX-004',
    name: 'axag-description present',
    severity: 'warning',
    level: 'AA',
    check: (el) => !el.attr(AXAG_ATTRIBUTES.DESCRIPTION) ? 'Missing axag-description (recommended)' : null,
  },
  {
    id: 'AX-005',
    name: 'axag-risk-level valid',
    severity: 'error',
    level: 'A',
    check: (el) => {
      const risk = el.attr(AXAG_ATTRIBUTES.RISK_LEVEL);
      if (!risk) return null; // Optional
      if (!RISK_LEVELS.includes(risk as typeof RISK_LEVELS[number])) {
        return `Invalid axag-risk-level "${risk}". Must be: ${RISK_LEVELS.join(', ')}`;
      }
      return null;
    },
  },
  {
    id: 'AX-006',
    name: 'High-risk actions require confirmation',
    severity: 'warning',
    level: 'AA',
    check: (el) => {
      const risk = el.attr(AXAG_ATTRIBUTES.RISK_LEVEL);
      if (risk === 'high' || risk === 'critical') {
        if (!el.attr(AXAG_ATTRIBUTES.CONFIRMATION_REQUIRED)) {
          return `High/critical risk action should set axag-confirmation-required="true"`;
        }
      }
      return null;
    },
  },
  {
    id: 'AX-007',
    name: 'Write/delete actions specify risk',
    severity: 'warning',
    level: 'AA',
    check: (el) => {
      const action = el.attr(AXAG_ATTRIBUTES.ACTION_TYPE);
      if (action === 'write' || action === 'delete') {
        if (!el.attr(AXAG_ATTRIBUTES.RISK_LEVEL)) {
          return `${action} actions should specify axag-risk-level`;
        }
      }
      return null;
    },
  },
  {
    id: 'AX-008',
    name: 'JSON parameters are valid',
    severity: 'error',
    level: 'A',
    check: (el) => {
      for (const attr of [AXAG_ATTRIBUTES.REQUIRED_PARAMETERS, AXAG_ATTRIBUTES.OPTIONAL_PARAMETERS]) {
        const value = el.attr(attr);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) return `${attr} must be a JSON array`;
          } catch {
            return `${attr} contains invalid JSON: ${value}`;
          }
        }
      }
      return null;
    },
  },
  {
    id: 'AX-009',
    name: 'Boolean attributes are valid',
    severity: 'error',
    level: 'A',
    check: (el) => {
      const boolAttrs = [
        AXAG_ATTRIBUTES.IDEMPOTENT,
        AXAG_ATTRIBUTES.CONFIRMATION_REQUIRED,
        AXAG_ATTRIBUTES.APPROVAL_REQUIRED,
        AXAG_ATTRIBUTES.ASYNC,
        AXAG_ATTRIBUTES.UNDO_SUPPORTED,
        AXAG_ATTRIBUTES.AUTH_REQUIRED,
      ];
      for (const attr of boolAttrs) {
        const val = el.attr(attr);
        if (val && val !== 'true' && val !== 'false') {
          return `${attr}="${val}" must be "true" or "false"`;
        }
      }
      return null;
    },
  },
];

export async function validateCommand(
  target: string | undefined,
  options: ValidateOptions,
): Promise<void> {
  logger.section('AXAG Validation');

  if (!target) {
    // Validate current directory
    target = '.';
  }

  // Check if target is a URL or directory
  if (target.startsWith('http://') || target.startsWith('https://')) {
    logger.error('URL validation requires a running browser. Use `axag scan --no-interactive` instead.');
    process.exit(1);
  }

  const resolvedPath = path.resolve(target);

  // Find all HTML files
  const files = await findHtmlFiles(resolvedPath);
  if (files.length === 0) {
    logger.warn(`No HTML files found in ${resolvedPath}`);
    return;
  }

  logger.info(`Validating ${files.length} files at conformance level ${options.level}...`);
  logger.blank();

  const allResults: ValidationRuleResult[] = [];
  let totalAnnotatedElements = 0;

  for (const file of files) {
    const html = await fs.readFile(file, 'utf-8');
    const $ = cheerio.load(html);
    const relPath = path.relative(resolvedPath, file);

    // Find elements with any axag-* attribute
    const annotatedElements = $('[axag-intent]');
    totalAnnotatedElements += annotatedElements.length;

    annotatedElements.each((_i: number, el: DomElement) => {
      const $el = $(el);
      const selector = buildSelector($el, el);

      for (const rule of VALIDATION_RULES) {
        // Skip rules above requested level
        if (!isLevelIncluded(rule.level, options.level)) continue;

        const message = rule.check($el, $);
        if (message) {
          allResults.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            passed: false,
            message: `${relPath}: ${message}`,
            selector,
          });
        } else {
          allResults.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            passed: true,
            message: '',
            selector,
          });
        }
      }
    });
  }

  // Display results
  const errors = allResults.filter((r) => !r.passed && r.severity === 'error');
  const warnings = allResults.filter((r) => !r.passed && r.severity === 'warning');
  const passed = allResults.filter((r) => r.passed);

  if (errors.length > 0) {
    logger.section('Errors');
    for (const err of errors) {
      console.log(`  ${chalk.red('✖')} ${chalk.dim(err.ruleId)} ${err.message}`);
    }
  }

  if (warnings.length > 0) {
    logger.section('Warnings');
    for (const warn of warnings) {
      console.log(`  ${chalk.yellow('⚠')} ${chalk.dim(warn.ruleId)} ${warn.message}`);
    }
  }

  logger.section('Validation Summary');

  const tableData = [
    ['Metric', 'Count'],
    ['Files scanned', String(files.length)],
    ['Annotated elements', String(totalAnnotatedElements)],
    ['Rules passed', chalk.green(String(passed.length))],
    ['Errors', errors.length > 0 ? chalk.red(String(errors.length)) : '0'],
    ['Warnings', warnings.length > 0 ? chalk.yellow(String(warnings.length)) : '0'],
  ];

  console.log(table(tableData));

  if (errors.length > 0) {
    logger.error('Validation failed.');
    if (options.strict || errors.length > 0) {
      process.exit(1);
    }
  } else if (warnings.length > 0) {
    logger.warn('Validation passed with warnings.');
    if (options.strict) {
      process.exit(1);
    }
  } else {
    logger.success('All validations passed! ✨');
  }
}

async function findHtmlFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const stat = await fs.stat(dir);

  if (stat.isFile()) {
    if (dir.endsWith('.html') || dir.endsWith('.htm')) return [dir];
    return [];
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) continue;
      results.push(...(await findHtmlFiles(full)));
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.htm')) {
      results.push(full);
    }
  }

  return results;
}

function buildSelector(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $el: cheerio.Cheerio<any>,
  el: DomElement,
): string {
  const tag = el.tagName || '';
  const id = $el.attr('id');
  if (id) return `${tag}#${id}`;
  const text = $el.text().trim().slice(0, 30);
  return text ? `${tag}:contains("${text}")` : tag;
}

function isLevelIncluded(ruleLevel: string, requestedLevel: string): boolean {
  const order = ['A', 'AA', 'AAA'];
  return order.indexOf(ruleLevel) <= order.indexOf(requestedLevel);
}
