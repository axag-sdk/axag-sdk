/**
 * Website Crawler — uses Playwright to navigate pages and discover links.
 */

import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import { logger } from '../utils/logger.js';

export interface CrawlOptions {
  maxPages: number;
  headless: boolean;
  timeout: number;
  excludePatterns: string[];
}

export interface CrawlPage {
  url: string;
  title: string;
  html: string;
}

/**
 * Crawl a website starting from `startUrl`, discovering internal links
 * up to `maxPages`.
 */
export async function crawlWebsite(
  startUrl: string,
  options: CrawlOptions,
): Promise<{ pages: CrawlPage[]; browser: Browser; context: BrowserContext }> {
  const browser = await chromium.launch({ headless: options.headless });
  const context = await browser.newContext({
    userAgent:
      'AXAG-CLI/1.0.0 (Semantic Annotation Scanner; +https://axag.org)',
  });

  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(startUrl)];
  const pages: CrawlPage[] = [];

  logger.info(`Starting crawl from ${startUrl} (max ${options.maxPages} pages)`);

  while (queue.length > 0 && pages.length < options.maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    // Skip excluded patterns
    if (options.excludePatterns.some((p) => url.includes(p))) {
      logger.debug(`Skipping excluded URL: ${url}`);
      continue;
    }

    try {
      const page = await context.newPage();
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: options.timeout,
      });

      const title = await page.title();
      const html = await page.content();

      pages.push({ url, title, html });
      logger.success(`Scanned: ${title || url}`);

      // Discover internal links
      const links = await discoverLinks(page, startUrl);
      for (const link of links) {
        if (!visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }

      await page.close();
    } catch (err) {
      logger.warn(`Failed to scan ${url}: ${(err as Error).message}`);
    }
  }

  logger.info(`Crawl complete: ${pages.length} pages scanned`);
  return { pages, browser, context };
}

/**
 * Discover internal links on a page.
 */
async function discoverLinks(page: Page, baseUrl: string): Promise<string[]> {
  const base = new URL(baseUrl);
  const links: string[] = await page.$$eval('a[href]', (anchors) =>
    anchors
      .map((a) => a.getAttribute('href') || '')
      .filter((href) => href.startsWith('http')),
  );

  return links
    .map((l) => normalizeUrl(l))
    .filter((l) => {
      try {
        const u = new URL(l);
        return u.hostname === base.hostname;
      } catch {
        return false;
      }
    });
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    // Remove trailing slash for consistency
    if (u.pathname.endsWith('/') && u.pathname !== '/') {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return url;
  }
}
