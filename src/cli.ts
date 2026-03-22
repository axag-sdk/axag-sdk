#!/usr/bin/env node

import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lint } from './engine.js';
import { consoleReport } from './reporter/console-reporter.js';
import { jsonReport } from './reporter/json-reporter.js';
import { githubReport } from './reporter/github-reporter.js';
import { DEFAULT_CONFIG } from './config/defaults.js';

const program = new Command();

program
  .name('axag-lint')
  .description('Static linter for AXAG annotations in HTML, JSX, and TSX files')
  .version('1.0.0')
  .argument('[path]', 'Path to file or directory to lint', '.')
  .option('-f, --format <format>', 'Output format: console, json, github', 'console')
  .option('-m, --manifest <path>', 'Manifest file for cross-reference rules')
  .option('-c, --config <path>', 'Config file path override')
  .option('-q, --quiet', 'Only show errors, suppress warnings and info')
  .option('--init', 'Generate .axaglintrc.json with default config')
  .action(async (targetPath: string, options: {
    format: 'console' | 'json' | 'github';
    manifest?: string;
    config?: string;
    quiet?: boolean;
    init?: boolean;
  }) => {
    // Handle --init
    if (options.init) {
      const configPath = resolve('.axaglintrc.json');
      writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');
      console.log(`Created ${configPath}`);
      process.exit(0);
    }

    try {
      const result = await lint(targetPath, {
        format: options.format,
        manifest: options.manifest,
        configPath: options.config,
      });

      // Output
      switch (options.format) {
        case 'json':
          console.log(jsonReport(result));
          break;
        case 'github':
          console.log(githubReport(result));
          break;
        case 'console':
        default:
          console.log(consoleReport(result, options.quiet));
          break;
      }

      // Exit code
      process.exit(result.errorCount > 0 ? 1 : 0);
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : err);
      process.exit(2);
    }
  });

program.parse();
