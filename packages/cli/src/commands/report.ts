/**
 * `axag report` command handler.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import type { ScanResult } from '../types/index.js';
import { generateReport, type ReportFormat } from '../reporter/index.js';
import { logger } from '../utils/logger.js';
import { SCAN_FILES } from '../utils/constants.js';

interface ReportOptions {
  input: string;
  format: string;
  output?: string;
}

export async function reportCommand(options: ReportOptions): Promise<void> {
  const reportFile = path.join(options.input, SCAN_FILES.REPORT);

  try {
    const data = await fs.readFile(reportFile, 'utf-8');
    const scanResult: ScanResult = JSON.parse(data);

    const format = options.format as ReportFormat;
    const { output } = await generateReport(scanResult, format, options.output);

    logger.success(`Report generated: ${output}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.error(`No scan results found at ${reportFile}`);
      logger.info(`Run ${chalk.cyan('axag scan <url>')} first.`);
    } else {
      logger.error(`Failed to generate report: ${(err as Error).message}`);
    }
    process.exit(1);
  }
}
