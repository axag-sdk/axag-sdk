import { describe, it, expect } from 'vitest';
import { rule as rule011 } from '../../src/rules/scope/AXAG-LINT-011.js';
import { rule as rule018 } from '../../src/rules/scope/AXAG-LINT-018.js';
import { rule as rule019 } from '../../src/rules/scope/AXAG-LINT-019.js';
import { rule as rule020 } from '../../src/rules/scope/AXAG-LINT-020.js';
import { rule as rule021 } from '../../src/rules/scope/AXAG-LINT-021.js';
import { rule as rule022 } from '../../src/rules/scope/AXAG-LINT-022.js';
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

describe('AXAG-LINT-011: Role attrs without scope', () => {
  it('flags approval-required without scope', () => {
    const el = makeElement({ 'axag-approval-required': 'true' });
    const ctx: FileContext = { filePath: 'test.html', elements: [el] };
    const diags = rule011.check(el, ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-011');
  });

  it('passes when scope is declared', () => {
    const el = makeElement({ 'axag-approval-required': 'true', 'axag-scope': 'tenant' });
    const ctx: FileContext = { filePath: 'test.html', elements: [el] };
    const diags = rule011.check(el, ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-018: Global scope with personal entity', () => {
  it('flags global scope with personal entity', () => {
    const el = makeElement({ 'axag-scope': 'global', 'axag-entity': 'profile' });
    const ctx: FileContext = { filePath: 'test.html', elements: [el] };
    const diags = rule018.check(el, ctx);
    expect(diags).toHaveLength(1);
  });

  it('passes for non-personal entity', () => {
    const el = makeElement({ 'axag-scope': 'global', 'axag-entity': 'report' });
    const ctx: FileContext = { filePath: 'test.html', elements: [el] };
    const diags = rule018.check(el, ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-019: Superadmin with tenant scope', () => {
  it('flags superadmin in tenant scope', () => {
    const el = makeElement({
      'axag-scope': 'tenant',
      'axag-approval-roles': '["superadmin"]',
    });
    const ctx: FileContext = { filePath: 'test.html', elements: [el] };
    const diags = rule019.check(el, ctx);
    expect(diags).toHaveLength(1);
  });

  it('passes for non-superadmin roles', () => {
    const el = makeElement({
      'axag-scope': 'tenant',
      'axag-approval-roles': '["admin"]',
    });
    const ctx: FileContext = { filePath: 'test.html', elements: [el] };
    const diags = rule019.check(el, ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-020: Same entity different scopes', () => {
  it('flags same entity with different scopes in same file', () => {
    const el1 = makeElement({
      'axag-entity': 'product',
      'axag-scope': 'user',
      'axag-intent': 'product.search',
    });
    const el2: AnnotatedElement = {
      ...makeElement({
        'axag-entity': 'product',
        'axag-scope': 'tenant',
        'axag-intent': 'product.list',
      }),
      line: 10,
    };
    const ctx: FileContext = { filePath: 'test.html', elements: [el1, el2] };
    const diags = rule020.check(el1, ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-020');
  });

  it('passes when same entity same scope', () => {
    const el1 = makeElement({ 'axag-entity': 'product', 'axag-scope': 'user' });
    const el2: AnnotatedElement = {
      ...makeElement({ 'axag-entity': 'product', 'axag-scope': 'user' }),
      line: 10,
    };
    const ctx: FileContext = { filePath: 'test.html', elements: [el1, el2] };
    const diags = rule020.check(el1, ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-021: Delete without scope', () => {
  it('flags delete without scope', () => {
    const el = makeElement({ 'axag-action-type': 'delete' });
    const ctx: FileContext = { filePath: 'test.html', elements: [el] };
    const diags = rule021.check(el, ctx);
    expect(diags).toHaveLength(1);
  });

  it('passes for delete with scope', () => {
    const el = makeElement({ 'axag-action-type': 'delete', 'axag-scope': 'user' });
    const ctx: FileContext = { filePath: 'test.html', elements: [el] };
    const diags = rule021.check(el, ctx);
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-022: Write user scope with tenant entity', () => {
  it('flags tenant entity with user scope', () => {
    const el = makeElement({
      'axag-action-type': 'write',
      'axag-scope': 'user',
      'axag-entity': 'organization',
    });
    const ctx: FileContext = { filePath: 'test.html', elements: [el] };
    const diags = rule022.check(el, ctx);
    expect(diags).toHaveLength(1);
  });

  it('passes for personal entity with user scope', () => {
    const el = makeElement({
      'axag-action-type': 'write',
      'axag-scope': 'user',
      'axag-entity': 'profile',
    });
    const ctx: FileContext = { filePath: 'test.html', elements: [el] };
    const diags = rule022.check(el, ctx);
    expect(diags).toHaveLength(0);
  });
});
