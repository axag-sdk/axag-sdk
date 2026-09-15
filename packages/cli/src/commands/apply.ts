/**
 * `axag apply` command handler.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import type { ScanResult } from '../types/index.js';
import { applyAnnotations } from '../applier/index.js';
import { logger } from '../utils/logger.js';
import { SCAN_FILES } from '../utils/constants.js';

interface ApplyOptions {
  input: string;
  dryRun: boolean;
  backup: boolean;
}

export async function applyCommand(options: ApplyOptions): Promise<void> {
  const reportFile = path.join(options.input, SCAN_FILES.REPORT);

  try {
    const data = await fs.readFile(reportFile, 'utf-8');
    const scanResult: ScanResult = JSON.parse(data);

    const accepted = scanResult.annotations.filter(
      (a) => a.status === 'accepted' || a.status === 'modified',
    );

    if (accepted.length === 0) {
      logger.warn('No accepted annotations to apply.');
      logger.info(
        `Run ${chalk.cyan('axag scan <url>')} and accept some annotations first.`,
      );
      return;
    }

    logger.info(`Applying ${accepted.length} annotations...`);

    const result = await applyAnnotations(scanResult, {
      dryRun: options.dryRun,
      backup: options.backup,
    });

    logger.section('Apply Complete');
    logger.kv('Files modified', `${result.filesModified}`);
    logger.kv('Annotations applied', `${result.annotationsApplied}`);

    if (options.dryRun) {
      logger.blank();
      logger.info(
        `This was a dry run. Run ${chalk.cyan('axag apply')} (without --dry-run) to apply changes.`,
      );
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.error(`No scan results found at ${reportFile}`);
      logger.info(`Run ${chalk.cyan('axag scan <url>')} first.`);
    } else {
      logger.error(`Failed to apply annotations: ${(err as Error).message}`);
    }
    process.exit(1);
  }
}
