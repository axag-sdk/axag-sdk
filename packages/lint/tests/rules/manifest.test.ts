import { describe, it, expect } from 'vitest';
import { rule as rule010 } from '../../src/rules/manifest/AXAG-LINT-010.js';
import type { AnnotatedElement, FileContext, ManifestData } from '../../src/types.js';

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

const manifest: ManifestData = {
  version: '1.0.0',
  actions: [
    { intent: 'product.search', entity: 'product', action_type: 'read' },
    { intent: 'cart.add_item', entity: 'cart', action_type: 'write' },
  ],
};

describe('AXAG-LINT-010: Intent not found in manifest', () => {
  it('flags intent not in manifest', () => {
    const el = makeElement({ 'axag-intent': 'order.place' });
    const ctx: FileContext = { filePath: 'test.html', elements: [el], manifest };
    const diags = rule010.check(el, ctx);
    expect(diags).toHaveLength(1);
    expect(diags[0].ruleId).toBe('AXAG-LINT-010');
  });

  it('passes for intent in manifest', () => {
    const el = makeElement({ 'axag-intent': 'product.search' });
    const ctx: FileContext = { filePath: 'test.html', elements: [el], manifest };
    const diags = rule010.check(el, ctx);
    expect(diags).toHaveLength(0);
  });

  it('skips when no manifest loaded', () => {
    const el = makeElement({ 'axag-intent': 'order.place' });
    const ctx: FileContext = { filePath: 'test.html', elements: [el] };
    const diags = rule010.check(el, ctx);
    expect(diags).toHaveLength(0);
  });
});
