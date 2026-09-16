/**
 * `axag generate [target]` command handler — build a Semantic Manifest and MCP
 * tools from source files. Same compiler the bundler plugins use.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { createSpinner } from 'nanospinner';
import { compile } from '@axag/compiler';
import { toWebMcpTool } from '@axag/core';
import { validateManifest } from '../manifest/schema-validator.js';
import { resolveBindings } from '../manifest/bindings.js';
import { loadConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { CLI_VERSION } from '../utils/constants.js';

interface GenerateOptions {
  manifest: string;
  tools?: string;
  webmcp?: string;
  harvest?: boolean;
  validate?: boolean;
}

export async function generateCommand(target: string | undefined, options: GenerateOptions): Promise<void> {
  console.log();
  console.log(chalk.bold('🏗  AXAG CLI — Manifest & Tool Compiler'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log();

  const root = path.resolve(target ?? '.');
  const config = await loadConfig();
  const spinner = createSpinner(`Compiling annotations in ${root}...`).start();

  const result = await compile({
    root,
    harvest: options.harvest !== false,
    tool: 'axag-cli',
    toolVersion: CLI_VERSION,
    resolveBindings: elements =>
      resolveBindings(elements, { bindings: config.bindings, openapi: config.openapi, rootDir: config.rootDir }),
  });
  spinner.success({ text: `Read ${result.files.length} files` });

  logger.kv('Actions', `${result.manifest.actions.length}`);
  logger.kv('Conformance', result.manifest.conformance);
  if (result.manifest.dynamic_actions?.length) {
    logger.kv('Registered at runtime', `${result.manifest.dynamic_actions.length}`);
  }
  for (const diagnostic of result.diagnostics) {
    const where = `${diagnostic.filePath ?? ''}:${diagnostic.line ?? 1}`;
    const line = `${diagnostic.code} ${where} ${diagnostic.message}`;
    if (diagnostic.severity === 'error') logger.error(line);
    else logger.warn(line);
  }

  const manifestPath = path.resolve(options.manifest);
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(result.manifest, null, 2), 'utf-8');
  logger.success(`Manifest written to ${manifestPath}`);

  if (options.tools) {
    const toolsPath = path.resolve(options.tools);
    await fs.mkdir(path.dirname(toolsPath), { recursive: true });
    await fs.writeFile(toolsPath, JSON.stringify(result.registry, null, 2), 'utf-8');
    logger.success(`Tool registry written to ${toolsPath}`);
  }
  if (options.webmcp) {
    const webmcpPath = path.resolve(options.webmcp);
    await fs.mkdir(path.dirname(webmcpPath), { recursive: true });
    const tools = result.registry.tools.map(toWebMcpTool);
    await fs.writeFile(webmcpPath, JSON.stringify({ tools }, null, 2), 'utf-8');
    logger.success(`WebMCP tools written to ${webmcpPath}`);
  }

  if (options.validate) {
    const validation = validateManifest(result.manifest);
    if (validation.valid) logger.success('Manifest passes schema validation ✅');
    else {
      logger.error('Manifest does not pass schema validation:');
      for (const error of validation.errors ?? []) logger.info(`  - ${error}`);
      process.exitCode = 1;
    }
  }

  if (result.diagnostics.some(d => d.severity === 'error')) process.exitCode = 1;
  logger.blank();
}
