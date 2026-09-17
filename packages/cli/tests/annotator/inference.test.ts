import { describe, it, expect } from 'vitest';
import { ENTITY_PATTERN, INTENT_PATTERN } from '@web-axag/core';
import { inferAnnotation, toSpecName } from '../../src/annotator/rules.js';
import type { PageContext } from '../../src/scanner/context-analyzer.js';
import type { ScannedElement } from '../../src/types/index.js';

const context: PageContext = {
  url: 'https://shop.test',
  title: '',
  metaDescription: '',
  headings: [],
  forms: [],
  navigation: [],
  domain: 'shop.test',
  inferredDomain: 'general',
};

function element(textContent: string, tagName = 'button', overrides: Partial<ScannedElement> = {}): ScannedElement {
  return {
    id: 'el-1',
    selector: 'button',
    tagName,
    textContent,
    attributes: {},
    ariaAttributes: {},
    role: null,
    pageUrl: context.url,
    xpath: '',
    parentContext: '',
    hasExistingAnnotations: false,
    existingAnnotations: {},
    ...overrides,
  };
}

describe('toSpecName', () => {
  it.each([
    ['Contact Us', 'contact_us'],
    ['Save 50% now!', 'save_now'],
    ['  spaced  out  ', 'spaced_out'],
    ['日本語', 'fallback'],
    ['', 'fallback'],
    ['2024', 'fallback'],
  ])('%s → %s', (input, expected) => {
    expect(toSpecName(input, 'fallback')).toBe(expected);
  });
});

describe('inferAnnotation', () => {
  // Inferred annotations get written into source by `axag apply`, so anything
  // that doesn't match the spec's own patterns would fail manifest validation.
  it.each([
    ['Add to Cart', 'button', {}],
    ['Delete account', 'button', {}],
    ['Contact Us', 'a', {}],
    ['Home', 'a', { parentContext: 'nav' }],
    ['Pricing plans', 'a', {}],
    ['日本語ボタン', 'button', {}],
    ['Save 50% now!', 'button', {}],
    ['View 2024 report', 'button', {}],
    ['', 'a', {}],
    ['Your email', 'input', { attributes: { name: 'user email 2' } }],
  ])('produces a spec-valid intent and entity for %s <%s>', (text, tag, overrides) => {
    const annotation = inferAnnotation(element(text, tag, overrides as Partial<ScannedElement>), context);
    expect(annotation.intent, annotation.intent).toMatch(INTENT_PATTERN);
    expect(annotation.entity, annotation.entity).toMatch(ENTITY_PATTERN);
  });

  it('leaves parameters to harvesting for elements inside a form', () => {
    const inside = inferAnnotation(element('Search', 'button', { insideForm: true }), context);
    expect(inside.requiredParameters).toEqual([]);

    const outside = inferAnnotation(element('Search', 'button'), context);
    expect(outside.requiredParameters).toEqual(['query']);
  });
});
