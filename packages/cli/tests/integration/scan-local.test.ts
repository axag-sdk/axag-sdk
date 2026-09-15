/**
 * Integration test: Scan local sample-app → generate manifest.
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanFiles } from '../../src/scanner/file-scanner.js';
import { generateManifest } from '../../src/manifest/generator.js';

const SAMPLE_APP = path.resolve(import.meta.dirname, 'sample-app');

describe('integration: scan-local', () => {
  it('discovers all annotated elements across HTML and TSX', async () => {
    const elements = await scanFiles(SAMPLE_APP);
    // index.html has 6 elements, TSX components have 3 (SearchBar, AddToCart, Checkout)
    expect(elements.length).toBeGreaterThanOrEqual(6);
  });

  it('generates a manifest with expected action count', async () => {
    const elements = await scanFiles(SAMPLE_APP);
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });

    // Unique intents: product.search, cart.add_item, cart.remove_item,
    // order.place, account.delete, user.view_profile, checkout.begin
    expect(manifest.actions.length).toBeGreaterThanOrEqual(7);
  });

  it('contains all expected intents', async () => {
    const elements = await scanFiles(SAMPLE_APP);
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });
    const intents = manifest.actions.map(a => a.intent);

    expect(intents).toContain('product.search');
    expect(intents).toContain('cart.add_item');
    expect(intents).toContain('cart.remove_item');
    expect(intents).toContain('order.place');
    expect(intents).toContain('account.delete');
    expect(intents).toContain('user.view_profile');
    expect(intents).toContain('checkout.begin');
  });

  it('covers all 4 action types', async () => {
    const elements = await scanFiles(SAMPLE_APP);
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });
    const types = new Set(manifest.actions.map(a => a.action_type));

    expect(types).toContain('read');
    expect(types).toContain('write');
    expect(types).toContain('delete');
    expect(types).toContain('navigate');
  });

  it('covers multiple risk levels', async () => {
    const elements = await scanFiles(SAMPLE_APP);
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });
    const risks = new Set(manifest.actions.map(a => a.risk_level).filter(Boolean));

    expect(risks).toContain('none');
    expect(risks).toContain('low');
    expect(risks).toContain('medium');
    expect(risks).toContain('high');
    expect(risks).toContain('critical');
  });

  it('extracts source_file and source_line for all actions', async () => {
    const elements = await scanFiles(SAMPLE_APP);
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });

    for (const action of manifest.actions) {
      expect(action.source_file).toBeTruthy();
      expect(action.source_line).toBeGreaterThan(0);
    }
  });
});
