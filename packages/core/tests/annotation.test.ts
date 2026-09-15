import { describe, it, expect } from 'vitest';
import { normalizeAttributes, readAnnotation } from '../src/index.js';

describe('normalizeAttributes', () => {
  it('keeps only axag-* attributes', () => {
    expect(normalizeAttributes({ class: 'btn', 'axag-intent': 'a.b', onclick: 'x()' })).toEqual({
      'axag-intent': 'a.b',
    });
  });
});

describe('readAnnotation', () => {
  it('returns no action without axag-intent', () => {
    expect(readAnnotation({ 'axag-entity': 'user' })).toEqual({ action: null, diagnostics: [] });
  });

  it('applies defaults for entity, action type, operation id and description', () => {
    const { action } = readAnnotation({ 'axag-intent': 'cart.add_item' });
    expect(action).toMatchObject({
      entity: 'cart',
      action_type: 'read',
      operation_id: 'cart_add_item',
      description: 'Cart Add Item',
    });
  });

  it('reports values outside an enum', () => {
    const { diagnostics } = readAnnotation({
      'axag-intent': 'user.update',
      'axag-action-type': 'mutate',
      'axag-scope': 'organization',
    });
    expect(diagnostics.map(d => [d.code, d.attribute])).toEqual([
      ['AXAG-CORE-002', 'axag-action-type'],
      ['AXAG-CORE-002', 'axag-scope'],
    ]);
  });

  it('reports invalid JSON arrays and ignores their value', () => {
    const { action, diagnostics } = readAnnotation({
      'axag-intent': 'ticket.create',
      'axag-required-parameters': '{"subject":true}',
      'axag-side-effects': '[oops',
    });
    expect(action?.required_parameters).toEqual([]);
    expect(action?.side_effects).toBeUndefined();
    expect(diagnostics.map(d => d.attribute)).toEqual(['axag-required-parameters', 'axag-side-effects']);
  });

  it('carries parameter constraints from object parameters', () => {
    const { action } = readAnnotation({
      'axag-intent': 'flight.search',
      'axag-required-parameters': '[{"name":"passengers","type":"number","min":1,"max":9}]',
    });
    expect(action?.required_parameters).toEqual([{ name: 'passengers', type: 'number', min: 1, max: 9 }]);
  });
});
