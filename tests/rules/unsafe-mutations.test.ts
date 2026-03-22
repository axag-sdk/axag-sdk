import { describe, it, expect } from 'vitest';
import { rule as rule017 } from '../../src/rules/unsafe-mutations/AXAG-LINT-017.js';
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

describe('AXAG-LINT-017: Non-idempotent mutation without side effects', () => {
  it('flags write without idempotent and no side-effects', () => {
    const diags = rule017.check(makeElement({ 'axag-action-type': 'write' }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-017');
  });

  it('flags delete with idempotent=false and no side-effects', () => {
    const diags = rule017.check(makeElement({
      'axag-action-type': 'delete',
      'axag-idempotent': 'false',
    }), ctx);
    expect(diags).toHaveLength(1);
  });

  it('passes for idempotent write', () => {
    const diags = rule017.check(makeElement({
      'axag-action-type': 'write',
      'axag-idempotent': 'true',
    }), ctx);
    expect(diags).toHaveLength(0);
  });

  it('passes for write with side-effects declared', () => {
    const diags = rule017.check(makeElement({
      'axag-action-type': 'write',
      'axag-side-effects': '["email_sent"]',
    }), ctx);
    expect(diags).toHaveLength(0);
  });

  it('passes for read action', () => {
    const diags = rule017.check(makeElement({ 'axag-action-type': 'read' }), ctx);
    expect(diags).toHaveLength(0);
  });
});
