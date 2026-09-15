/**
 * `axag generate-tools` command handler.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createSpinner } from 'nanospinner';
import chalk from 'chalk';
import { generateToolRegistry } from '../tool-generator/generator.js';
import { validateManifest } from '../manifest/schema-validator.js';
import { logger } from '../utils/logger.js';
import type { ManifestOutput } from '../manifest/types.js';

interface GenerateToolsOptions {
  manifest: string;
  output: string;
}

export async function generateToolsCommand(options: GenerateToolsOptions): Promise<void> {
  console.log();
  console.log(chalk.bold('🔧 AXAG CLI — MCP Tool Generator'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log();

  const manifestPath = path.resolve(options.manifest);

  // ── Step 1: Read manifest ──────────────────────
  const readSpinner = createSpinner('Reading manifest...').start();

  let manifestRaw: string;
  try {
    manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    readSpinner.success({ text: `Read manifest from ${manifestPath}` });
  } catch (err) {
    readSpinner.error({ text: `Cannot read manifest: ${(err as Error).message}` });
    process.exit(1);
  }

  let manifest: ManifestOutput;
  try {
    manifest = JSON.parse(manifestRaw) as ManifestOutput;
  } catch (err) {
    logger.error(`Invalid JSON in manifest file: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── Step 2: Validate manifest ──────────────────
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    logger.error('Manifest does not pass schema validation:');
    for (const err of validation.errors ?? []) {
      logger.info(`  - ${err}`);
    }
    process.exit(1);
  }

  logger.kv('Actions', `${manifest.actions.length}`);
  logger.kv('Conformance', manifest.conformance);
  logger.blank();

  // ── Step 3: Generate tools ─────────────────────
  const genSpinner = createSpinner('Generating MCP tool definitions...').start();

  const registry = generateToolRegistry(manifest, manifestPath);
  genSpinner.success({ text: `Generated ${registry.tools.length} MCP tools` });

  // ── Step 4: Write output ───────────────────────
  const outputDir = path.resolve(options.output);
  await fs.mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'tool-registry.json');
  await fs.writeFile(outputPath, JSON.stringify(registry, null, 2), 'utf-8');

  logger.blank();
  logger.success(`Tool registry written to ${outputPath}`);
  logger.blank();

  // ── Summary ────────────────────────────────────
  logger.section('Summary');
  logger.kv('Manifest', manifestPath);
  logger.kv('Tools', `${registry.tools.length}`);
  logger.kv('Output', outputPath);
  logger.blank();

  for (const tool of registry.tools) {
    const params = Object.keys(tool.input_schema.properties).length;
    const risk = tool.metadata.risk_level;
    logger.info(`  ${chalk.cyan(tool.name)} — ${params} params, risk: ${risk}`);
  }
  logger.blank();
}
