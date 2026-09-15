/**
 * `axag init` command handler — creates an axag.config.json in the current project.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';

interface InitOptions {
  force: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const configPath = path.resolve('axag.config.json');

  // Check if config already exists
  try {
    await fs.access(configPath);
    if (!options.force) {
      logger.warn(`Config already exists at ${configPath}`);
      logger.info(`Use ${chalk.cyan('axag init --force')} to overwrite.`);
      return;
    }
  } catch {
    // File doesn't exist — good
  }

  logger.section('AXAG Configuration Setup');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'domain',
      message: 'What domain does your application serve?',
      choices: [
        { name: '🛒 E-Commerce', value: 'ecommerce' },
        { name: '📊 Analytics / Dashboards', value: 'analytics' },
        { name: '💼 Sales & CRM', value: 'crm' },
        { name: '✈️ Travel & Booking', value: 'travel' },
        { name: '🎫 Support & Helpdesk', value: 'support' },
        { name: '🏢 Enterprise Admin', value: 'enterprise' },
        { name: '📣 Marketing', value: 'marketing' },
        { name: '💼 Jobs & Recruitment', value: 'jobs' },
        { name: '🌐 General / Multi-purpose', value: 'general' },
      ],
    },
    {
      type: 'confirm',
      name: 'useAI',
      message: 'Enable AI-powered annotation inference? (requires API key)',
      default: false,
    },
    {
      type: 'list',
      name: 'aiProvider',
      message: 'AI provider:',
      choices: ['openai', 'anthropic'],
      when: (ans: Record<string, unknown>) => ans.useAI,
    },
    {
      type: 'input',
      name: 'aiModel',
      message: 'AI model:',
      default: 'gpt-4o',
      when: (ans: Record<string, unknown>) => ans.useAI,
    },
    {
      type: 'number',
      name: 'maxPages',
      message: 'Max pages to crawl per scan:',
      default: 10,
    },
    {
      type: 'list',
      name: 'conformanceLevel',
      message: 'Target conformance level:',
      choices: [
        { name: 'A  — Core attributes only', value: 'A' },
        { name: 'AA — Core + safety & parameters', value: 'AA' },
        { name: 'AAA — Full specification compliance', value: 'AAA' },
      ],
    },
  ]);

  const config = {
    $schema: 'https://axag.org/schema/v1/config.json',
    outputDir: '.axag',
    domain: answers.domain,
    ai: {
      enabled: answers.useAI || false,
      provider: answers.aiProvider || 'openai',
      model: answers.aiModel || 'gpt-4o',
    },
    scanner: {
      maxPages: answers.maxPages || 10,
      headless: true,
      timeout: 30000,
      excludePatterns: ['logout', 'signout', '/admin'],
    },
    validation: {
      conformanceLevel: answers.conformanceLevel || 'A',
      strict: false,
    },
  };

  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  // Create .axag output directory
  await fs.mkdir('.axag', { recursive: true });

  // Add .axag to .gitignore if it exists
  try {
    const gitignore = await fs.readFile('.gitignore', 'utf-8');
    if (!gitignore.includes('.axag')) {
      await fs.appendFile('.gitignore', '\n# AXAG CLI scan results\n.axag/\n');
      logger.info('Added .axag/ to .gitignore');
    }
  } catch {
    // No .gitignore — that's fine
  }

  logger.blank();
  logger.success(`Created ${configPath}`);
  logger.blank();
  logger.info('Next steps:');
  logger.bullet(`${chalk.cyan('axag scan <url>')} — scan a website`);
  logger.bullet(`${chalk.cyan('axag scan ./src')} — scan local source files`);
  logger.bullet(`${chalk.cyan('axag validate')} — validate existing annotations`);
}
