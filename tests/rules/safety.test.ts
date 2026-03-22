import { describe, it, expect } from 'vitest';
import { rule as rule006 } from '../../src/rules/safety/AXAG-LINT-006.js';
import { rule as rule007 } from '../../src/rules/safety/AXAG-LINT-007.js';
import { rule as rule023 } from '../../src/rules/safety/AXAG-LINT-023.js';
import { rule as rule024 } from '../../src/rules/safety/AXAG-LINT-024.js';
import { rule as rule025 } from '../../src/rules/safety/AXAG-LINT-025.js';
import { rule as rule026 } from '../../src/rules/safety/AXAG-LINT-026.js';
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

describe('AXAG-LINT-006: High/critical risk without confirmation', () => {
  it('flags high risk without confirmation', () => {
    const diags = rule006.check(makeElement({ 'axag-risk-level': 'high' }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-006');
  });

  it('passes for high risk with confirmation', () => {
    const diags = rule006.check(makeElement({
      'axag-risk-level': 'high',
      'axag-confirmation-required': 'true',
    }), ctx);
    expect(diags).toHaveLength(0);
  });

  it('passes for low risk without confirmation', () => {
    const diags = rule006.check(makeElement({ 'axag-risk-level': 'low' }), ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-007: Write/delete without idempotent', () => {
  it('flags write without idempotent', () => {
    const diags = rule007.check(makeElement({ 'axag-action-type': 'write' }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-007');
  });

  it('passes for write with idempotent', () => {
    const diags = rule007.check(makeElement({
      'axag-action-type': 'write',
      'axag-idempotent': 'true',
    }), ctx);
    expect(diags).toHaveLength(0);
  });

  it('passes for read without idempotent', () => {
    const diags = rule007.check(makeElement({ 'axag-action-type': 'read' }), ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-023: Write/delete without risk-level', () => {
  it('flags delete without risk-level', () => {
    const diags = rule023.check(makeElement({ 'axag-action-type': 'delete' }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-023');
  });

  it('passes when risk-level declared', () => {
    const diags = rule023.check(makeElement({
      'axag-action-type': 'write',
      'axag-risk-level': 'low',
    }), ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-024: Delete with risk below high', () => {
  it('flags delete with low risk', () => {
    const diags = rule024.check(makeElement({
      'axag-action-type': 'delete',
      'axag-risk-level': 'low',
    }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-024');
  });

  it('passes for delete with high risk', () => {
    const diags = rule024.check(makeElement({
      'axag-action-type': 'delete',
      'axag-risk-level': 'high',
    }), ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-025: Read with risk above low', () => {
  it('flags read with high risk', () => {
    const diags = rule025.check(makeElement({
      'axag-action-type': 'read',
      'axag-risk-level': 'high',
    }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-025');
  });

  it('passes for read with none risk', () => {
    const diags = rule025.check(makeElement({
      'axag-action-type': 'read',
      'axag-risk-level': 'none',
    }), ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-026: Safety metadata mismatch', () => {
  it('flags critical risk without required metadata', () => {
    const diags = rule026.check(makeElement({ 'axag-risk-level': 'critical' }), ctx);
    expect(diags.length).toBeGreaterThanOrEqual(4);
    expect(diags.every(d => d.ruleId === 'AXAG-LINT-026')).toBe(true);
  });

  it('passes for none risk', () => {
    const diags = rule026.check(makeElement({ 'axag-risk-level': 'none' }), ctx);
    expect(diags).toHaveLength(0);
  });

  it('flags high risk without preconditions', () => {
    const diags = rule026.check(makeElement({
      'axag-risk-level': 'high',
      'axag-confirmation-required': 'true',
      'axag-idempotent': 'false',
    }), ctx);
    expect(diags.some(d => d.message.includes('preconditions'))).toBe(true);
  });
});
