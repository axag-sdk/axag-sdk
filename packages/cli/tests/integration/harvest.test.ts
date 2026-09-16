/**
 * Integration test: a page with no parameter attributes still yields a complete manifest.
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanFiles } from '../../src/scanner/file-scanner.js';
import { generateManifest } from '../../src/manifest/generator.js';
import { validateManifest } from '../../src/manifest/schema-validator.js';
import { generateToolRegistry } from '../../src/tool-generator/generator.js';

const APP = path.resolve(import.meta.dirname, 'harvest-app');

describe('integration: parameter harvesting', () => {
  it('builds parameters from form controls, labels and constraints', async () => {
    const manifest = generateManifest(await scanFiles(APP), { paths: [APP] });
    expect(validateManifest(manifest)).toEqual({ valid: true });

    const place = manifest.actions.find(a => a.intent === 'order.place')!;
    expect(place.required_parameters).toEqual([
      { name: 'email', type: 'string', format: 'email', description: 'Email for the receipt', source: 'harvested:html' },
      { name: 'shipping', type: 'string', enum: ['standard', 'express'], description: 'Delivery speed', source: 'harvested:html' },
      { name: 'quantity', type: 'integer', min: 1, max: 10, description: 'Quantity', source: 'harvested:html' },
    ]);
    expect(place.optional_parameters).toEqual([
      { name: 'gift_message', type: 'string', maxLength: 200, description: 'Gift message', source: 'harvested:html' },
      { name: 'save_address', type: 'boolean', description: 'Save this address', source: 'harvested:html' },
    ]);

    const coupon = manifest.actions.find(a => a.intent === 'coupon.apply')!;
    expect(coupon.required_parameters).toEqual([
      { name: 'code', type: 'string', pattern: '[A-Z0-9]{6}', description: 'Coupon code', source: 'harvested:html' },
    ]);
  });

  it('carries harvested constraints into tool input schemas', async () => {
    const manifest = generateManifest(await scanFiles(APP), { paths: [APP] });
    const tool = generateToolRegistry(manifest, 'm.json').tools.find(t => t.name === 'order_place')!;
    expect(tool.input_schema.required).toEqual(['email', 'shipping', 'quantity']);
    expect(tool.input_schema.properties.quantity).toEqual({ type: 'integer', description: 'Quantity', minimum: 1, maximum: 10 });
    expect(tool.input_schema.properties.email).toMatchObject({ format: 'email' });
  });

  it('can be switched off', async () => {
    const manifest = generateManifest(await scanFiles(APP), { paths: [APP], harvest: false });
    expect(manifest.actions.every(a => a.required_parameters.length === 0)).toBe(true);
  });
});
