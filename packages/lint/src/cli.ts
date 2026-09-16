#!/usr/bin/env node

import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lint } from './engine.js';
import { consoleReport } from './reporter/console-reporter.js';
import { jsonReport } from './reporter/json-reporter.js';
import { githubReport } from './reporter/github-reporter.js';
import { sarifReport } from './reporter/sarif-reporter.js';
import { DEFAULT_BASELINE_PATH, applyBaseline, writeBaseline } from './baseline.js';
import { DEFAULT_CONFIG } from './config/defaults.js';

const program = new Command();

program
  .name('axag-lint')
  .description('Static linter for AXAG annotations in HTML, JSX, and TSX files')
  .version('1.0.0')
  .argument('[path]', 'Path to file or directory to lint', '.')
  .option('-f, --format <format>', 'Output format: console, json, github, sarif', 'console')
  .option('-m, --manifest <path>', 'Manifest file for cross-reference rules')
  .option('-c, --config <path>', 'Config file path override')
  .option('-q, --quiet', 'Only show errors, suppress warnings and info')
  .option('--init', 'Generate .axaglintrc.json with default config')
  .option('--changed-since <ref>', 'Only lint files changed since a git ref, e.g. origin/main')
  .option('--baseline [path]', `Ignore findings recorded in a baseline file (default: ${DEFAULT_BASELINE_PATH})`)
  .option('--update-baseline [path]', 'Record current findings as the baseline and exit 0')
  .option('-o, --output <path>', 'Write the report to a file instead of stdout')
  .action(async (targetPath: string, options: {
    format: 'console' | 'json' | 'github' | 'sarif';
    manifest?: string;
    config?: string;
    quiet?: boolean;
    init?: boolean;
    changedSince?: string;
    baseline?: string | boolean;
    updateBaseline?: string | boolean;
    output?: string;
  }) => {
    // Handle --init
    if (options.init) {
      const configPath = resolve('.axaglintrc.json');
      writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');
      console.log(`Created ${configPath}`);
      process.exit(0);
    }

    try {
      const root = resolve(targetPath);
      const full = await lint(targetPath, {
        format: options.format,
        manifest: options.manifest,
        configPath: options.config,
        changedSince: options.changedSince,
      });

      if (options.updateBaseline) {
        const path = typeof options.updateBaseline === 'string' ? options.updateBaseline : undefined;
        const written = writeBaseline(full, root, path);
        console.log(`Recorded ${full.diagnostics.length} findings as the baseline in ${written}`);
        process.exit(0);
      }

      const result = options.baseline
        ? applyBaseline(full, root, typeof options.baseline === 'string' ? options.baseline : undefined)
        : full;

      const report =
        options.format === 'json' ? jsonReport(result)
        : options.format === 'github' ? githubReport(result)
        : options.format === 'sarif' ? sarifReport(result, { root })
        : consoleReport(result, options.quiet);

      if (options.output) {
        writeFileSync(resolve(options.output), report.endsWith('\n') ? report : `${report}\n`);
        console.log(`Wrote ${options.format} report to ${resolve(options.output)}`);
      } else {
        console.log(report);
      }

      process.exit(result.errorCount > 0 ? 1 : 0);
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : err);
      process.exit(2);
    }
  });

program.parse();
