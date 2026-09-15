/**
 * `axag scan <target>` command handler.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createSpinner } from 'nanospinner';
import chalk from 'chalk';
import type { ScanResult } from '../types/index.js';
import { scanUrl, scanDirectory } from '../scanner/index.js';
import { scanFiles } from '../scanner/file-scanner.js';
import { generateManifest } from '../manifest/generator.js';
import { validateManifest } from '../manifest/schema-validator.js';
import { inferAnnotations } from '../annotator/index.js';
import { interactiveReview } from '../interactive/index.js';
import { generateReport } from '../reporter/index.js';
import { loadConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { SCAN_FILES } from '../utils/constants.js';

interface ScanOptions {
  output: string;
  domain?: string;
  headless: boolean;
  ai: boolean;
  aiProvider: string;
  aiModel: string;
  maxPages: string;
  interactive: boolean;
  manifest?: string;
  validate?: boolean;
}

export async function scanCommand(
  target: string,
  options: ScanOptions,
): Promise<void> {
  const startTime = Date.now();

  // Load config with CLI overrides
  const config = await loadConfig({
    outputDir: options.output,
    domain: options.domain as ReturnType<typeof loadConfig> extends Promise<infer T> ? T extends { domain: infer D } ? D : never : never,
    ai: {
      enabled: options.ai,
      provider: options.aiProvider as 'openai' | 'anthropic',
      model: options.aiModel,
    },
    scanner: {
      maxPages: parseInt(options.maxPages, 10),
      headless: options.headless,
      timeout: 30_000,
      excludePatterns: [],
    },
  });

  console.log();
  console.log(chalk.bold('🏷️  AXAG CLI — Semantic Annotation Scanner'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log();

  // Determine target type
  const isUrl = target.startsWith('http://') || target.startsWith('https://');
  const targetType = isUrl ? 'url' : 'directory';

  logger.kv('Target', target);
  logger.kv('Type', targetType);
  logger.kv('Domain', config.domain);
  logger.kv('AI', config.ai.enabled ? `${config.ai.provider}/${config.ai.model}` : 'disabled');
  logger.kv('Max pages', `${config.scanner.maxPages}`);
  logger.blank();

  // ── Phase 1: Scan ─────────────────────────────
  const scanSpinner = createSpinner('Scanning for interactive elements...').start();

  let scanOutput;
  try {
    if (isUrl) {
      scanOutput = await scanUrl(target, {
        maxPages: config.scanner.maxPages,
        headless: config.scanner.headless,
        timeout: config.scanner.timeout,
        excludePatterns: config.scanner.excludePatterns,
        domain: config.domain,
      });
    } else {
      const resolvedDir = path.resolve(target);
      scanOutput = await scanDirectory(resolvedDir, {
        maxPages: config.scanner.maxPages,
        headless: true,
        timeout: config.scanner.timeout,
        excludePatterns: config.scanner.excludePatterns,
        domain: config.domain,
      });
    }
    scanSpinner.success({ text: `Found ${scanOutput.elements.length} interactive elements` });
  } catch (err) {
    scanSpinner.error({ text: `Scan failed: ${(err as Error).message}` });
    process.exit(1);
  }

  // ── Phase 2: Infer annotations ────────────────
  const inferSpinner = createSpinner('Inferring AXAG annotations...').start();

  let annotations;
  try {
    annotations = await inferAnnotations(scanOutput.elements, scanOutput.contexts, {
      domain: config.domain,
      ai: config.ai.enabled
        ? { enabled: true, provider: config.ai.provider, model: config.ai.model }
        : undefined,
    });
    inferSpinner.success({ text: `Generated ${annotations.length} annotations` });
  } catch (err) {
    inferSpinner.error({ text: `Inference failed: ${(err as Error).message}` });
    process.exit(1);
  }

  // ── Phase 3: Interactive review ───────────────
  if (options.interactive && annotations.length > 0) {
    annotations = await interactiveReview(annotations);
  }

  // ── Phase 4: Build scan result ────────────────
  const scanDuration = Date.now() - startTime;

  const scanResult: ScanResult = {
    meta: {
      scannedAt: new Date().toISOString(),
      target,
      targetType,
      domain: config.domain,
      pagesScanned: scanOutput.pages.length,
      totalElements: scanOutput.elements.length,
      totalAnnotations: annotations.length,
      scanDurationMs: scanDuration,
      cliVersion: '1.0.0',
    },
    pages: scanOutput.pages.map((p) => ({
      ...p,
      annotationCount: annotations.filter((a) => a.pageUrl === p.url).length,
    })),
    elements: scanOutput.elements,
    annotations,
  };

  // ── Phase 5: Persist results ──────────────────
  await fs.mkdir(config.outputDir, { recursive: true });
  await fs.writeFile(
    path.join(config.outputDir, SCAN_FILES.REPORT),
    JSON.stringify(scanResult, null, 2),
    'utf-8',
  );

  logger.blank();
  logger.success(`Scan results saved to ${config.outputDir}/`);

  // ── Phase 6: Generate report ──────────────────
  const { output: reportPath } = await generateReport(
    scanResult,
    'html',
    path.join(config.outputDir, 'report.html'),
  );

  // ── Phase 7: Generate manifest (if local path) ──
  if (!isUrl && options.manifest) {
    const manifestSpinner = createSpinner('Generating manifest...').start();
    try {
      const resolvedDir = path.resolve(target);
      const annotatedElements = await scanFiles(resolvedDir);

      const manifest = generateManifest(annotatedElements, {
        paths: [resolvedDir],
      });

      const manifestPath = path.resolve(options.manifest);
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
      manifestSpinner.success({ text: `Manifest written to ${manifestPath}` });

      logger.kv('Actions', `${manifest.actions.length}`);
      logger.kv('Conformance', manifest.conformance);

      // Validate if requested
      if (options.validate) {
        const validation = validateManifest(manifest);
        if (validation.valid) {
          logger.success('Manifest passes schema validation ✅');
        } else {
          logger.info('Manifest validation errors:');
          for (const err of validation.errors ?? []) {
            logger.info(`  - ${err}`);
          }
        }
      }
    } catch (err) {
      manifestSpinner.error({ text: `Manifest generation failed: ${(err as Error).message}` });
    }
  }

  // ── Summary ───────────────────────────────────
  logger.section('Scan Complete');
  logger.kv('Duration', `${(scanDuration / 1000).toFixed(1)}s`);
  logger.kv('Pages', `${scanOutput.pages.length}`);
  logger.kv('Elements', `${scanOutput.elements.length}`);
  logger.kv('Annotations', `${annotations.length}`);
  logger.kv('Accepted', `${annotations.filter((a) => a.status === 'accepted').length}`);
  logger.kv('Report', reportPath);
  logger.blank();

  const accepted = annotations.filter((a) => a.status === 'accepted' || a.status === 'modified');
  if (accepted.length > 0) {
    logger.info(`Run ${chalk.cyan('axag apply')} to apply ${accepted.length} annotations to source files.`);
  }
}
