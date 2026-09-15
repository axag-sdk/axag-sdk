#!/usr/bin/env node

/**
 * axag-cli — Scan websites, infer AXAG annotations, review interactively, apply automatically.
 *
 * Commands:
 *   axag scan <url|dir>   Scan a live URL or local HTML/JSX directory
 *   axag report            Generate report from the last scan
 *   axag apply             Apply confirmed annotations to source files
 *   axag validate          Validate existing AXAG annotations
 *   axag generate-tools    Generate MCP tool definitions from a manifest
 *   axag init              Initialize .axag config in the current project
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { scanCommand } from '../src/commands/scan.js';
import { reportCommand } from '../src/commands/report.js';
import { applyCommand } from '../src/commands/apply.js';
import { validateCommand } from '../src/commands/validate.js';
import { generateToolsCommand } from '../src/commands/generate-tools.js';
import { initCommand } from '../src/commands/init.js';

const program = new Command();

program
  .name('axag')
  .description(
    chalk.bold('AXAG CLI') +
      ' — Scan websites, infer semantic annotations, review & apply automatically.',
  )
  .version('1.0.0');

/* ─── scan ───────────────────────────────────── */
program
  .command('scan <target>')
  .description('Scan a live URL or local directory for interactive elements and infer AXAG annotations')
  .option('-o, --output <dir>', 'Output directory for scan results', '.axag')
  .option('-d, --domain <domain>', 'Domain hint (ecommerce, analytics, crm, travel, support, enterprise, marketing, jobs)')
  .option('--headless', 'Run browser in headless mode (default: true)', true)
  .option('--no-headless', 'Show the browser window during scan')
  .option('--ai', 'Use AI-powered inference for better annotations', false)
  .option('--ai-provider <provider>', 'AI provider: openai | anthropic', 'openai')
  .option('--ai-model <model>', 'AI model to use', 'gpt-4o')
  .option('--max-pages <n>', 'Maximum pages to crawl', '10')
  .option('--interactive', 'Enter interactive review mode after scan (default: true)', true)
  .option('--no-interactive', 'Skip interactive review — just output the report')
  .option('--manifest <path>', 'Generate manifest JSON and write to specified path')
  .option('--validate', 'Validate generated manifest against AXAG JSON Schema', false)
  .action(scanCommand);

/* ─── report ─────────────────────────────────── */
program
  .command('report')
  .description('Generate a report from the last scan')
  .option('-i, --input <dir>', 'Input directory with scan results', '.axag')
  .option('-f, --format <format>', 'Report format: json | html | markdown', 'html')
  .option('-o, --output <file>', 'Output file path')
  .action(reportCommand);

/* ─── apply ──────────────────────────────────── */
program
  .command('apply')
  .description('Apply confirmed annotations to source files')
  .option('-i, --input <dir>', 'Input directory with scan results', '.axag')
  .option('--dry-run', 'Show changes without applying them', false)
  .option('--backup', 'Create backup of modified files', true)
  .action(applyCommand);

/* ─── validate ───────────────────────────────── */
program
  .command('validate [target]')
  .description('Validate existing AXAG annotations on a URL or in local files')
  .option('--strict', 'Use strict validation (fail on warnings)', false)
  .option('--level <level>', 'Minimum conformance level: A | AA | AAA', 'A')
  .action(validateCommand);

/* ─── init ───────────────────────────────────── */
program
  .command('init')
  .description('Initialize AXAG configuration in the current project')
  .option('--force', 'Overwrite existing config', false)
  .action(initCommand);

/* ─── generate-tools ─────────────────────────── */
program
  .command('generate-tools')
  .description('Generate MCP tool definitions from an AXAG manifest')
  .requiredOption('-m, --manifest <path>', 'Path to axag-manifest.json')
  .option('-o, --output <dir>', 'Output directory for tool registry', './tools')
  .action(generateToolsCommand);

program.parse();
