/**
 * Applier Orchestrator — applies confirmed annotations to source files.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { InferredAnnotation, ScanResult } from '../types/index.js';
import { applyAnnotationsToHtml } from './html-modifier.js';
import { applyAnnotationsToJsx } from './jsx-modifier.js';
import { logger } from '../utils/logger.js';

export interface ApplyOptions {
  dryRun: boolean;
  backup: boolean;
}

/**
 * Apply accepted/modified annotations to source files.
 * Groups annotations by file, reads each file, applies modifications, writes back.
 */
export async function applyAnnotations(
  scanResult: ScanResult,
  options: ApplyOptions,
): Promise<{ filesModified: number; annotationsApplied: number }> {
  logger.section('Applying Annotations');

  const accepted = scanResult.annotations.filter(
    (a) => a.status === 'accepted' || a.status === 'modified',
  );

  if (accepted.length === 0) {
    logger.info('No accepted annotations to apply.');
    return { filesModified: 0, annotationsApplied: 0 };
  }

  // Group by page/file
  const grouped = groupByFile(accepted);
  let filesModified = 0;
  let annotationsApplied = 0;

  for (const [fileUrl, annotations] of grouped.entries()) {
    const filePath = fileUrlToPath(fileUrl);
    if (!filePath) {
      logger.warn(`Cannot apply to remote URL: ${fileUrl} (only local files supported)`);
      continue;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();

      let modified: string;
      if (ext === '.html' || ext === '.htm') {
        modified = applyAnnotationsToHtml(content, annotations);
      } else if (ext === '.jsx' || ext === '.tsx') {
        modified = applyAnnotationsToJsx(content, annotations);
      } else {
        logger.warn(`Unsupported file type: ${ext} — skipping ${filePath}`);
        continue;
      }

      if (modified === content) {
        logger.info(`No changes needed: ${filePath}`);
        continue;
      }

      if (options.dryRun) {
        logger.info(`[DRY RUN] Would modify: ${filePath}`);
      } else {
        if (options.backup) {
          await fs.writeFile(`${filePath}.bak`, content, 'utf-8');
        }
        await fs.writeFile(filePath, modified, 'utf-8');
        logger.success(`Modified: ${filePath}`);
      }

      filesModified++;
      annotationsApplied += annotations.length;
    } catch (err) {
      logger.error(`Failed to process ${filePath}: ${(err as Error).message}`);
    }
  }

  logger.blank();
  logger.success(
    `${options.dryRun ? '[DRY RUN] ' : ''}Applied ${annotationsApplied} annotations across ${filesModified} files`,
  );

  return { filesModified, annotationsApplied };
}

function groupByFile(annotations: InferredAnnotation[]): Map<string, InferredAnnotation[]> {
  const map = new Map<string, InferredAnnotation[]>();
  for (const a of annotations) {
    const list = map.get(a.pageUrl) || [];
    list.push(a);
    map.set(a.pageUrl, list);
  }
  return map;
}

function fileUrlToPath(url: string): string | null {
  if (url.startsWith('file://')) {
    return url.slice(7); // Remove file://
  }
  return null; // Remote URLs can't be written to
}
