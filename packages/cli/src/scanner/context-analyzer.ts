/**
 * Context Analyzer — enriches elements with page-level context for better inference.
 */

import * as cheerio from 'cheerio';
import type { ScannedElement } from '../types/index.js';

export interface PageContext {
  url: string;
  title: string;
  metaDescription: string;
  headings: string[];
  forms: FormContext[];
  navigation: string[];
  domain: string;
  inferredDomain: string;
}

export interface FormContext {
  action: string;
  method: string;
  fields: string[];
  submitLabel: string;
}

/**
 * Analyze page HTML and return rich context for annotation inference.
 */
export function analyzePageContext(html: string, url: string): PageContext {
  const $ = cheerio.load(html);

  const title = $('title').text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';

  // Collect all headings
  const headings: string[] = [];
  $('h1, h2, h3').each((_i, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(text);
  });

  // Analyze forms
  const forms: FormContext[] = [];
  $('form').each((_i, el) => {
    const $form = $(el);
    const fields: string[] = [];
    $form.find('input, select, textarea').each((_j, field) => {
      const name = $(field).attr('name') || $(field).attr('id') || $(field).attr('placeholder') || '';
      if (name) fields.push(name);
    });
    const submitBtn = $form.find('button[type="submit"], input[type="submit"]');
    forms.push({
      action: $form.attr('action') || '',
      method: ($form.attr('method') || 'get').toUpperCase(),
      fields,
      submitLabel: submitBtn.text().trim() || submitBtn.attr('value') || 'Submit',
    });
  });

  // Navigation items
  const navigation: string[] = [];
  $('nav a, [role="navigation"] a').each((_i, el) => {
    const text = $(el).text().trim();
    if (text) navigation.push(text);
  });

  const domain = extractDomain(url);
  const inferredDomain = inferDomainFromContent(title, metaDescription, headings, navigation);

  return {
    url,
    title,
    metaDescription,
    headings,
    forms,
    navigation,
    domain,
    inferredDomain,
  };
}

/**
 * Enrich scanned elements with context-aware metadata.
 */
export function enrichElements(
  elements: ScannedElement[],
  context: PageContext,
): ScannedElement[] {
  return elements.map((el) => ({
    ...el,
    parentContext: el.parentContext || context.title,
  }));
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

/** Simple keyword-based domain inference. */
function inferDomainFromContent(
  title: string,
  description: string,
  headings: string[],
  navigation: string[],
): string {
  const text = [title, description, ...headings, ...navigation]
    .join(' ')
    .toLowerCase();

  const domainKeywords: Record<string, string[]> = {
    ecommerce: ['cart', 'shop', 'product', 'price', 'checkout', 'buy', 'order', 'catalog'],
    analytics: ['dashboard', 'report', 'metric', 'chart', 'analytics', 'insight', 'data'],
    crm: ['lead', 'contact', 'pipeline', 'deal', 'customer', 'account', 'opportunity'],
    travel: ['flight', 'hotel', 'booking', 'reservation', 'travel', 'trip', 'destination'],
    support: ['ticket', 'support', 'help', 'issue', 'knowledge base', 'faq'],
    enterprise: ['admin', 'user management', 'role', 'permission', 'settings', 'organization'],
    marketing: ['campaign', 'email', 'audience', 'segment', 'automation', 'newsletter'],
    jobs: ['job', 'career', 'apply', 'resume', 'candidate', 'hiring', 'vacancy'],
  };

  let bestDomain = 'general';
  let bestScore = 0;

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  return bestScore >= 2 ? bestDomain : 'general';
}
