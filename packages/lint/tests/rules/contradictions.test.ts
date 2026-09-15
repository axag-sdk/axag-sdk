import { describe, it, expect } from 'vitest';
import { rule as rule012 } from '../../src/rules/contradictions/AXAG-LINT-012.js';
import { rule as rule013 } from '../../src/rules/contradictions/AXAG-LINT-013.js';
import { rule as rule014 } from '../../src/rules/contradictions/AXAG-LINT-014.js';
import { rule as rule015 } from '../../src/rules/contradictions/AXAG-LINT-015.js';
import { rule as rule016 } from '../../src/rules/contradictions/AXAG-LINT-016.js';
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

describe('AXAG-LINT-012: Approval required without roles', () => {
  it('flags approval without roles', () => {
    const diags = rule012.check(makeElement({ 'axag-approval-required': 'true' }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-012');
  });

  it('passes with approval and roles', () => {
    const diags = rule012.check(makeElement({
      'axag-approval-required': 'true',
      'axag-approval-roles': '["admin"]',
    }), ctx);
    expect(diags).toHaveLength(0);
  });

  it('passes when approval not required', () => {
    const diags = rule012.check(makeElement({ 'axag-approval-required': 'false' }), ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-013: Read with critical risk', () => {
  it('flags read with critical risk', () => {
    const diags = rule013.check(makeElement({
      'axag-action-type': 'read',
      'axag-risk-level': 'critical',
    }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-013');
  });

  it('passes for read with low risk', () => {
    const diags = rule013.check(makeElement({
      'axag-action-type': 'read',
      'axag-risk-level': 'low',
    }), ctx);
    expect(diags).toHaveLength(0);
  });

  it('passes for write with critical risk', () => {
    const diags = rule013.check(makeElement({
      'axag-action-type': 'write',
      'axag-risk-level': 'critical',
    }), ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-014: Write with contradictory precondition', () => {
  it('flags write with "must exist" precondition', () => {
    const diags = rule014.check(makeElement({
      'axag-action-type': 'write',
      'axag-preconditions': '["record must exist"]',
    }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-014');
  });

  it('passes for write without contradictory precondition', () => {
    const diags = rule014.check(makeElement({
      'axag-action-type': 'write',
      'axag-preconditions': '["user_authenticated"]',
    }), ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-015: Navigate with side effects', () => {
  it('flags navigate with side effects', () => {
    const diags = rule015.check(makeElement({
      'axag-action-type': 'navigate',
      'axag-side-effects': '["session_started"]',
    }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-015');
  });

  it('passes for navigate without side effects', () => {
    const diags = rule015.check(makeElement({
      'axag-action-type': 'navigate',
    }), ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-016: Tenant role with non-tenant scope', () => {
  it('flags tenant_admin with user scope', () => {
    const diags = rule016.check(makeElement({
      'axag-scope': 'user',
      'axag-approval-roles': '["tenant_admin"]',
    }), ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-016');
  });

  it('passes for tenant_admin with tenant scope', () => {
    const diags = rule016.check(makeElement({
      'axag-scope': 'tenant',
      'axag-approval-roles': '["tenant_admin"]',
    }), ctx);
    expect(diags).toHaveLength(0);
  });

  it('passes for non-tenant role with user scope', () => {
    const diags = rule016.check(makeElement({
      'axag-scope': 'user',
      'axag-approval-roles': '["admin"]',
    }), ctx);
    expect(diags).toHaveLength(0);
  });
});
