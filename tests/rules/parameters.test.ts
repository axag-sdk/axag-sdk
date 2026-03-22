import { describe, it, expect } from 'vitest';
import { rule as rule008 } from '../../src/rules/parameters/AXAG-LINT-008.js';
import { rule as rule009 } from '../../src/rules/parameters/AXAG-LINT-009.js';
import type { AnnotatedElement, FileContext } from '../../src/types.js';

function makeElement(attrs: Record<string, string> = {}): AnnotatedElement {
  return {
    tagName: 'button',
    attributes: attrs,
    allAttributes: attrs,
    filePath: 'test.html',
    line: 1,
    column: 1,
  };
}

const ctx: FileContext = { filePath: 'test.html', elements: [] };

describe('AXAG-LINT-008: Duplicate parameter name', () => {
  it('flags param in both required and optional', () => {
    const diags = rule008.check(makeElement({
      'axag-required-parameters': '["query","page"]',
      'axag-optional-parameters': '["page","limit"]',
    }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-008');
    expect(diags[0].message).toContain('page');
  });

  it('passes when no overlap', () => {
    const diags = rule008.check(makeElement({
      'axag-required-parameters': '["query"]',
      'axag-optional-parameters': '["page"]',
    }), ctx);
    expect(diags).toHaveLength(0);
  });

  it('passes when only one param list', () => {
    const diags = rule008.check(makeElement({
      'axag-required-parameters': '["query"]',
    }), ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-009: Invalid JSON in parameters', () => {
  it('flags invalid JSON in required-parameters', () => {
    const diags = rule009.check(makeElement({
      'axag-required-parameters': 'not-json',
    }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-009');
  });

  it('flags non-array JSON in optional-parameters', () => {
    const diags = rule009.check(makeElement({
      'axag-optional-parameters': '{"key":"value"}',
    }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain('must be a JSON array');
  });

  it('passes for valid JSON arrays', () => {
    const diags = rule009.check(makeElement({
      'axag-required-parameters': '["query"]',
      'axag-optional-parameters': '["page","limit"]',
    }), ctx);
    expect(diags).toHaveLength(0);
  });
});
