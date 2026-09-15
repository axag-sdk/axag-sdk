/**
 * Tests for local file scanning → manifest generation pipeline.
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanFiles } from '../../src/scanner/file-scanner.js';
import { generateManifest } from '../../src/manifest/generator.js';
import { validateManifest } from '../../src/manifest/schema-validator.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../test-fixtures');

describe('scan-local pipeline', () => {
  it('discovers annotated elements from HTML fixture', async () => {
    const elements = await scanFiles(FIXTURES_DIR);
    // annotated-page.html has 5 + AnnotatedComponent.tsx has 3 = 8 elements
    expect(elements.length).toBeGreaterThanOrEqual(5);
  });

  it('generates a manifest from scanned fixtures', async () => {
    const elements = await scanFiles(FIXTURES_DIR);
    const manifest = generateManifest(elements, { paths: [FIXTURES_DIR] });

    expect(manifest.version).toBe('1.0.0');
    expect(manifest.source.tool).toBe('axag-cli');
    expect(manifest.actions.length).toBeGreaterThanOrEqual(5);
  });

  it('contains expected intents from HTML fixture', async () => {
    const elements = await scanFiles(FIXTURES_DIR);
    const manifest = generateManifest(elements, { paths: [FIXTURES_DIR] });
    const intents = manifest.actions.map(a => a.intent);

    expect(intents).toContain('product.search');
    expect(intents).toContain('cart.add_item');
    expect(intents).toContain('cart.remove_item');
    expect(intents).toContain('order.place');
    expect(intents).toContain('account.delete');
  });

  it('contains expected intents from TSX fixture', async () => {
    const elements = await scanFiles(FIXTURES_DIR);
    const manifest = generateManifest(elements, { paths: [FIXTURES_DIR] });
    const intents = manifest.actions.map(a => a.intent);

    // checkout.begin is only in the TSX file
    expect(intents).toContain('checkout.begin');
  });

  it('maps parameters correctly from HTML attributes', async () => {
    const elements = await scanFiles(FIXTURES_DIR);
    const manifest = generateManifest(elements, { paths: [FIXTURES_DIR] });

    // cart.add_item is unique to the HTML file — unaffected by dedup
    const cartAction = manifest.actions.find(a => a.intent === 'cart.add_item');
    expect(cartAction).toBeDefined();
    expect(cartAction!.required_parameters).toHaveLength(2);
    expect(cartAction!.required_parameters[0].name).toBe('product_id');
    expect(cartAction!.required_parameters[1].name).toBe('quantity');
    expect(cartAction!.required_parameters[1].type).toBe('number');
  });

  it('maps safety metadata correctly', async () => {
    const elements = await scanFiles(FIXTURES_DIR);
    const manifest = generateManifest(elements, { paths: [FIXTURES_DIR] });

    const deleteAction = manifest.actions.find(a => a.intent === 'account.delete');
    expect(deleteAction).toBeDefined();
    expect(deleteAction!.risk_level).toBe('critical');
    expect(deleteAction!.confirmation_required).toBe(true);
    expect(deleteAction!.approval_required).toBe(true);
    expect(deleteAction!.approval_roles).toEqual(['admin', 'compliance_officer']);
  });

  it('maps side-effects and conditions correctly', async () => {
    const elements = await scanFiles(FIXTURES_DIR);
    const manifest = generateManifest(elements, { paths: [FIXTURES_DIR] });

    const orderAction = manifest.actions.find(a => a.intent === 'order.place');
    expect(orderAction).toBeDefined();
    expect(orderAction!.side_effects).toEqual(['email_sent', 'inventory_deducted', 'payment_charged']);
    expect(orderAction!.preconditions).toEqual(['cart_not_empty', 'payment_method_set']);
    expect(orderAction!.postconditions).toEqual(['order_created', 'cart_emptied']);
  });

  it('generated manifest passes schema validation', async () => {
    const elements = await scanFiles(FIXTURES_DIR);
    const manifest = generateManifest(elements, { paths: [FIXTURES_DIR] });
    const result = validateManifest(manifest);

    expect(result.valid).toBe(true);
    if (!result.valid) {
      console.error('Validation errors:', result.errors);
    }
  });

  it('deduplicates intents across HTML and TSX files', async () => {
    const elements = await scanFiles(FIXTURES_DIR);
    const manifest = generateManifest(elements, { paths: [FIXTURES_DIR] });

    // product.search appears in both HTML and TSX — should appear once
    const searchActions = manifest.actions.filter(a => a.intent === 'product.search');
    expect(searchActions).toHaveLength(1);
  });
});
