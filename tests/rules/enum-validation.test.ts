import { describe, it, expect } from 'vitest';
import { rule as rule004 } from '../../src/rules/enum-validation/AXAG-LINT-004.js';
import { rule as rule005 } from '../../src/rules/enum-validation/AXAG-LINT-005.js';
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

describe('AXAG-LINT-004: Invalid action-type', () => {
  it('flags invalid action-type "update"', () => {
    const diags = rule004.check(makeElement({ 'axag-action-type': 'update' }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-004');
  });

  for (const valid of ['read', 'write', 'delete', 'navigate']) {
    it(`passes for valid action-type "${valid}"`, () => {
      const diags = rule004.check(makeElement({ 'axag-action-type': valid }), ctx);
      expect(diags).toHaveLength(0);
    });
  }

  it('passes when no action-type present', () => {
    const diags = rule004.check(makeElement({}), ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-005: Invalid risk-level', () => {
  it('flags invalid risk-level "extreme"', () => {
    const diags = rule005.check(makeElement({ 'axag-risk-level': 'extreme' }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-005');
  });

  for (const valid of ['none', 'low', 'medium', 'high', 'critical']) {
    it(`passes for valid risk-level "${valid}"`, () => {
      const diags = rule005.check(makeElement({ 'axag-risk-level': valid }), ctx);
      expect(diags).toHaveLength(0);
    });
  }
});
