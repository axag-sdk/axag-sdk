/**
 * Scanner Orchestrator — coordinates crawling, extraction, and context analysis.
 */

import { crawlWebsite, type CrawlOptions } from './crawler.js';
import { extractElements, resetElementCounter } from './element-extractor.js';
import { analyzePageContext, enrichElements, type PageContext } from './context-analyzer.js';
import type { ScannedElement, PageResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface ScanOptions extends CrawlOptions {
  domain?: string;
}

export interface ScanOutput {
  elements: ScannedElement[];
  pages: PageResult[];
  contexts: PageContext[];
}

/**
 * Scan a live URL — crawl pages, extract interactive elements, analyze context.
 */
export async function scanUrl(
  url: string,
  options: ScanOptions,
): Promise<ScanOutput> {
  resetElementCounter();

  const { pages, browser } = await crawlWebsite(url, options);

  const allElements: ScannedElement[] = [];
  const pageResults: PageResult[] = [];
  const contexts: PageContext[] = [];

  for (const page of pages) {
    const context = analyzePageContext(page.html, page.url);
    contexts.push(context);

    let elements = extractElements(page.html, page.url);
    elements = enrichElements(elements, context);

    allElements.push(...elements);
    pageResults.push({
      url: page.url,
      title: page.title,
      elementCount: elements.length,
      annotationCount: 0, // Filled after inference
    });

    logger.info(
      `  ${page.title || page.url}: ${elements.length} interactive elements found`,
    );
  }

  await browser.close();

  logger.blank();
  logger.success(
    `Scan complete: ${allElements.length} interactive elements across ${pages.length} pages`,
  );

  return { elements: allElements, pages: pageResults, contexts };
}

/**
 * Scan a local directory of HTML/JSX/TSX files.
 */
export async function scanDirectory(
  dir: string,
  _options: ScanOptions,
): Promise<ScanOutput> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  resetElementCounter();

  const allElements: ScannedElement[] = [];
  const pageResults: PageResult[] = [];
  const contexts: PageContext[] = [];

  const files = await walkDir(dir, ['.html', '.htm', '.jsx', '.tsx']);

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const relPath = path.relative(dir, file);

    // For JSX/TSX, extract JSX return blocks (simplified)
    const html = file.endsWith('.html') || file.endsWith('.htm')
      ? content
      : extractJsxHtml(content);

    if (!html.trim()) continue;

    const context = analyzePageContext(html, `file://${file}`);
    contexts.push(context);

    let elements = extractElements(html, `file://${file}`);
    elements = enrichElements(elements, context);

    allElements.push(...elements);
    pageResults.push({
      url: `file://${file}`,
      title: relPath,
      elementCount: elements.length,
      annotationCount: 0,
    });

    logger.info(`  ${relPath}: ${elements.length} interactive elements`);
  }

  logger.blank();
  logger.success(
    `Scan complete: ${allElements.length} interactive elements across ${files.length} files`,
  );

  return { elements: allElements, pages: pageResults, contexts };
}

/** Recursively walk a directory for matching file extensions. */
async function walkDir(dir: string, extensions: string[]): Promise<string[]> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const results: string[] = [];

  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, dist, build, .git
      if (['node_modules', 'dist', 'build', '.git', '.next'].includes(entry.name)) continue;
      results.push(...(await walkDir(full, extensions)));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }

  return results;
}

/**
 * Very simplified JSX HTML extraction — pulls return() blocks containing HTML-like content.
 * A real implementation would use a proper JSX parser (babel, swc).
 */
function extractJsxHtml(source: string): string {
  // Match content inside return ( ... ) blocks
  const returnBlocks = source.match(/return\s*\(\s*([\s\S]*?)\s*\);/g);
  if (!returnBlocks) return '';

  return returnBlocks
    .map((block) => block.replace(/^return\s*\(\s*/, '').replace(/\s*\);$/, ''))
    .join('\n');
}
