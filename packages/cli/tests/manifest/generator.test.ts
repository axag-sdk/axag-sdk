/**
 * Tests for the manifest generator.
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { generateManifest } from '../../src/manifest/generator.js';
import { validateManifest } from '../../src/manifest/schema-validator.js';
import type { AnnotatedElement } from '../../src/scanner/html-extractor.js';

function makeElement(attrs: Record<string, string>, overrides?: Partial<AnnotatedElement>): AnnotatedElement {
  return {
    tagName: 'button',
    attributes: attrs,
    filePath: '/test/index.html',
    line: 1,
    column: 0,
    ...overrides,
  };
}

describe('generateManifest', () => {
  it('maps basic axag-* attributes to manifest action fields', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'product.search',
        'axag-entity': 'product',
        'axag-action-type': 'read',
        'axag-description': 'Search for products',
      }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });

    expect(manifest.actions).toHaveLength(1);
    const action = manifest.actions[0];
    expect(action.intent).toBe('product.search');
    expect(action.entity).toBe('product');
    expect(action.action_type).toBe('read');
    expect(action.description).toBe('Search for products');
    expect(action.operation_id).toBe('product_search');
    expect(action.source_file).toBe('/test/index.html');
    expect(action.source_line).toBe(1);
  });

  it('derives entity from intent if axag-entity is missing', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'cart.add_item',
        'axag-action-type': 'write',
      }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    expect(manifest.actions[0].entity).toBe('cart');
  });

  it('humanizes intent for description when axag-description is missing', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'cart.add_item',
        'axag-entity': 'cart',
        'axag-action-type': 'write',
      }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    expect(manifest.actions[0].description).toBe('Cart Add Item');
  });

  it('maps all optional fields when present', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'order.place',
        'axag-entity': 'order',
        'axag-action-type': 'write',
        'axag-description': 'Place an order',
        'axag-risk-level': 'high',
        'axag-confirmation-required': 'true',
        'axag-approval-required': 'true',
        'axag-approval-roles': '["admin","finance"]',
        'axag-idempotent': 'false',
        'axag-scope': 'user',
        'axag-side-effects': '["email_sent","payment_charged"]',
        'axag-preconditions': '["cart_not_empty"]',
        'axag-postconditions': '["order_created"]',
      }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    const action = manifest.actions[0];

    expect(action.risk_level).toBe('high');
    expect(action.confirmation_required).toBe(true);
    expect(action.approval_required).toBe(true);
    expect(action.approval_roles).toEqual(['admin', 'finance']);
    expect(action.idempotent).toBe(false);
    expect(action.scope).toBe('user');
    expect(action.side_effects).toEqual(['email_sent', 'payment_charged']);
    expect(action.preconditions).toEqual(['cart_not_empty']);
    expect(action.postconditions).toEqual(['order_created']);
  });

  it('parses JSON parameter arrays (object form)', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'product.search',
        'axag-entity': 'product',
        'axag-action-type': 'read',
        'axag-required-parameters': '[{"name":"query","type":"string","description":"Search term"}]',
        'axag-optional-parameters': '[{"name":"page","type":"number"}]',
      }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    const action = manifest.actions[0];

    expect(action.required_parameters).toHaveLength(1);
    expect(action.required_parameters[0].name).toBe('query');
    expect(action.required_parameters[0].type).toBe('string');
    expect(action.required_parameters[0].description).toBe('Search term');

    expect(action.optional_parameters).toHaveLength(1);
    expect(action.optional_parameters[0].name).toBe('page');
    expect(action.optional_parameters[0].type).toBe('number');
  });

  it('parses JSON parameter arrays (string shorthand)', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'product.search',
        'axag-entity': 'product',
        'axag-action-type': 'read',
        'axag-required-parameters': '["query","category"]',
      }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    const params = manifest.actions[0].required_parameters;

    expect(params).toHaveLength(2);
    expect(params[0]).toEqual({ name: 'query', type: 'string' });
    expect(params[1]).toEqual({ name: 'category', type: 'string' });
  });

  it('handles invalid JSON in parameters gracefully', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'product.search',
        'axag-entity': 'product',
        'axag-action-type': 'read',
        'axag-required-parameters': 'not valid json',
      }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    expect(manifest.actions[0].required_parameters).toEqual([]);
  });

  it('deduplicates by intent — keeps first occurrence', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'product.search',
        'axag-entity': 'product',
        'axag-action-type': 'read',
        'axag-description': 'First search',
      }, { filePath: '/test/page1.html', line: 10 }),
      makeElement({
        'axag-intent': 'product.search',
        'axag-entity': 'product',
        'axag-action-type': 'read',
        'axag-description': 'Second search',
      }, { filePath: '/test/page2.html', line: 20 }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    expect(manifest.actions).toHaveLength(1);
    expect(manifest.actions[0].description).toBe('First search');
    expect(manifest.actions[0].source_file).toBe('/test/page1.html');
  });

  it('sorts actions alphabetically by intent', () => {
    const elements: AnnotatedElement[] = [
      makeElement({ 'axag-intent': 'order.place', 'axag-entity': 'order', 'axag-action-type': 'write' }),
      makeElement({ 'axag-intent': 'cart.add_item', 'axag-entity': 'cart', 'axag-action-type': 'write' }),
      makeElement({ 'axag-intent': 'account.delete', 'axag-entity': 'account', 'axag-action-type': 'delete' }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    expect(manifest.actions.map(a => a.intent)).toEqual([
      'account.delete',
      'cart.add_item',
      'order.place',
    ]);
  });

  it('skips elements without axag-intent', () => {
    const elements: AnnotatedElement[] = [
      makeElement({ 'axag-entity': 'product', 'axag-action-type': 'read' }),
      makeElement({ 'axag-intent': 'product.search', 'axag-entity': 'product', 'axag-action-type': 'read' }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    expect(manifest.actions).toHaveLength(1);
  });

  it('sets manifest envelope fields correctly', () => {
    const elements: AnnotatedElement[] = [
      makeElement({ 'axag-intent': 'product.search', 'axag-entity': 'product', 'axag-action-type': 'read' }),
    ];

    const manifest = generateManifest(elements, { paths: ['/src'], url: 'https://example.com' });

    expect(manifest.version).toBe('1.0.0');
    expect(manifest.generated_at).toBeDefined();
    expect(manifest.source.paths).toEqual(['/src']);
    expect(manifest.source.url).toBe('https://example.com');
    expect(manifest.source.tool).toBe('axag-cli');
    expect(manifest.source.tool_version).toBe('1.0.0');
    expect(manifest.conformance).toBeDefined();
  });
});

describe('conformance detection', () => {
  it('returns basic when only required fields present', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'product.search',
        'axag-entity': 'product',
        'axag-action-type': 'read',
        'axag-description': 'Search',
      }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    expect(manifest.conformance).toBe('basic');
  });

  it('returns intermediate when risk + idempotent present', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'product.search',
        'axag-entity': 'product',
        'axag-action-type': 'read',
        'axag-description': 'Search',
        'axag-risk-level': 'none',
      }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    expect(manifest.conformance).toBe('intermediate');
  });

  it('returns full when scope + side-effects/preconditions present', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'order.place',
        'axag-entity': 'order',
        'axag-action-type': 'write',
        'axag-description': 'Place order',
        'axag-risk-level': 'high',
        'axag-idempotent': 'false',
        'axag-scope': 'user',
        'axag-side-effects': '["email_sent"]',
      }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    expect(manifest.conformance).toBe('full');
  });
});

describe('schema validation', () => {
  it('validates a correctly generated manifest', () => {
    const elements: AnnotatedElement[] = [
      makeElement({
        'axag-intent': 'product.search',
        'axag-entity': 'product',
        'axag-action-type': 'read',
        'axag-description': 'Search for products',
        'axag-risk-level': 'none',
        'axag-idempotent': 'true',
        'axag-scope': 'user',
      }),
    ];

    const manifest = generateManifest(elements, { paths: ['/test'] });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('rejects a manifest with invalid action_type', () => {
    const manifest = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      source: { paths: ['/test'], tool: 'axag-cli', tool_version: '1.0.0' },
      conformance: 'basic' as const,
      actions: [{
        intent: 'product.search',
        entity: 'product',
        action_type: 'invalid_type',
        description: 'Test',
        required_parameters: [],
        optional_parameters: [],
        operation_id: 'product_search',
        source_file: '/test.html',
        source_line: 1,
      }],
    };

    // Cast to bypass TS type checking for invalid value
    const result = validateManifest(manifest as any);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});
