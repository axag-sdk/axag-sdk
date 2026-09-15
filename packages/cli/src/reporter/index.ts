/**
 * Reporter Orchestrator — generates reports in multiple formats.
 */

import fs from 'node:fs/promises';
import type { ScanResult, ScanReport } from '../types/index.js';
import { generateJsonReport } from './json-report.js';
import { generateHtmlReport } from './html-report.js';
import { generateMarkdownReport } from './markdown-report.js';
import { logger } from '../utils/logger.js';

export type ReportFormat = 'json' | 'html' | 'markdown';

/**
 * Generate a report from scan results in the specified format.
 */
export async function generateReport(
  scanResult: ScanResult,
  format: ReportFormat,
  outputPath?: string,
): Promise<{ report: ScanReport; output: string }> {
  logger.section('Generating Report');

  const report = generateJsonReport(scanResult);

  let content: string;
  let defaultExt: string;

  switch (format) {
    case 'json':
      content = JSON.stringify(report, null, 2);
      defaultExt = '.json';
      break;
    case 'html':
      content = generateHtmlReport(report);
      defaultExt = '.html';
      break;
    case 'markdown':
      content = generateMarkdownReport(report);
      defaultExt = '.md';
      break;
  }

  const output = outputPath || `axag-report${defaultExt}`;

  // If output path is a directory, append the report filename
  let finalOutput = output;
  try {
    const stat = await fs.stat(output);
    if (stat.isDirectory()) {
      finalOutput = `${output}/report${defaultExt}`;
    }
  } catch {
    // Path doesn't exist yet — use as-is (it's a file path)
  }

  await fs.writeFile(finalOutput, content, 'utf-8');
  logger.success(`Report saved: ${finalOutput}`);

  return { report, output: finalOutput };
}
