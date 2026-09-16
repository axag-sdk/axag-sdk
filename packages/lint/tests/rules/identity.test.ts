import { describe, it, expect } from 'vitest';
import { rule as rule001 } from '../../src/rules/identity/AXAG-LINT-001.js';
import { rule as rule002 } from '../../src/rules/identity/AXAG-LINT-002.js';
import { rule as rule003 } from '../../src/rules/identity/AXAG-LINT-003.js';
import { rule as rule034 } from '../../src/rules/identity/AXAG-LINT-034.js';
import { rule as rule035 } from '../../src/rules/identity/AXAG-LINT-035.js';
import type { AnnotatedElement, FileContext } from '../../src/types.js';

function makeElement(overrides: Partial<AnnotatedElement> = {}): AnnotatedElement {
  return {
    tagName: 'button',
    attributes: {},
    allAttributes: {},
    filePath: 'test.html',
    line: 1,
    column: 1,
    ...overrides,
  };
}

function makeContext(elements: AnnotatedElement[] = []): FileContext {
  return { filePath: 'test.html', elements };
}

describe('AXAG-LINT-001: Interactive element missing axag-intent', () => {
  it('flags interactive button without axag-intent', () => {
    const el = makeElement({
      tagName: 'button',
      allAttributes: { onclick: 'doSomething()' },
    });
    const diags = rule001.check(el, makeContext([el]));
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-001');
    expect(diags[0].severity).toBe('error');
  });

  it('passes for button with axag-intent', () => {
    const el = makeElement({
      tagName: 'button',
      attributes: { 'axag-intent': 'product.search' },
      allAttributes: { 'axag-intent': 'product.search' },
    });
    const diags = rule001.check(el, makeContext([el]));
    expect(diags).toHaveLength(0);
  });

  it('passes for non-interactive element', () => {
    const el = makeElement({ tagName: 'div' });
    const diags = rule001.check(el, makeContext([el]));
    expect(diags).toHaveLength(0);
  });

  it('flags a[href] without axag-intent', () => {
    const el = makeElement({
      tagName: 'a',
      allAttributes: { href: '/page' },
    });
    const diags = rule001.check(el, makeContext([el]));
    expect(diags).toHaveLength(1);
  });

  it('flags role=button without axag-intent', () => {
    const el = makeElement({
      tagName: 'div',
      allAttributes: { role: 'button' },
    });
    const diags = rule001.check(el, makeContext([el]));
    expect(diags).toHaveLength(1);
  });
});

describe('AXAG-LINT-002: Missing axag-entity', () => {
  it('flags element with axag-intent but no axag-entity', () => {
    const el = makeElement({
      attributes: { 'axag-intent': 'product.search', 'axag-action-type': 'read' },
    });
    const diags = rule002.check(el, makeContext([el]));
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-002');
  });

  it('passes when both intent and entity present', () => {
    const el = makeElement({
      attributes: { 'axag-intent': 'product.search', 'axag-entity': 'product' },
    });
    const diags = rule002.check(el, makeContext([el]));
    expect(diags).toHaveLength(0);
  });

  it('passes when no intent (nothing to check)', () => {
    const el = makeElement({ attributes: {} });
    const diags = rule002.check(el, makeContext([el]));
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-003: Missing axag-action-type', () => {
  it('flags element with axag-intent but no axag-action-type', () => {
    const el = makeElement({
      attributes: { 'axag-intent': 'cart.add_item', 'axag-entity': 'cart' },
    });
    const diags = rule003.check(el, makeContext([el]));
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-003');
  });

  it('passes when action-type is present', () => {
    const el = makeElement({
      attributes: { 'axag-intent': 'cart.add_item', 'axag-entity': 'cart', 'axag-action-type': 'write' },
    });
    const diags = rule003.check(el, makeContext([el]));
    expect(diags).toHaveLength(0);
  });
});

describe('AXAG-LINT-034 / 035: name shapes the schema requires', () => {
  const run = (rule: typeof rule034, attributes: Record<string, string>) =>
    rule.check(makeElement({ attributes }), makeContext());

  it.each(['navigation.goto-home', 'Cart.Add', 'cart add', 'cart'])('flags intent %s', intent => {
    const [diagnostic] = run(rule034, { 'axag-intent': intent });
    expect(diagnostic?.ruleId).toBe('AXAG-LINT-034');
    expect(diagnostic?.severity).toBe('error');
  });

  it.each(['cart.add_item', 'purchase_order.approve'])('accepts intent %s', intent => {
    expect(run(rule034, { 'axag-intent': intent })).toEqual([]);
  });

  it('flags a non-lowercase entity', () => {
    expect(run(rule035, { 'axag-entity': 'Purchase Order' })).toHaveLength(1);
    expect(run(rule035, { 'axag-entity': 'purchase_order' })).toEqual([]);
  });
});
