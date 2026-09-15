/**
 * Integration test: Round-trip from annotations → manifest → tools.
 * Verifies that data is preserved across the entire pipeline.
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanFiles } from '../../src/scanner/file-scanner.js';
import { generateManifest } from '../../src/manifest/generator.js';
import { validateManifest } from '../../src/manifest/schema-validator.js';
import { generateToolRegistry } from '../../src/tool-generator/generator.js';

const SAMPLE_APP = path.resolve(import.meta.dirname, 'sample-app');

describe('integration: round-trip', () => {
  it('annotation → manifest → tool pipeline preserves intent data', async () => {
    // Step 1: Scan
    const elements = await scanFiles(SAMPLE_APP);
    expect(elements.length).toBeGreaterThan(0);

    // Step 2: Generate manifest
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });
    expect(manifest.actions.length).toBeGreaterThan(0);

    // Step 3: Validate manifest
    const validation = validateManifest(manifest);
    expect(validation.valid).toBe(true);

    // Step 4: Generate tools
    const registry = generateToolRegistry(manifest, '/test/manifest.json');
    expect(registry.tools.length).toBe(manifest.actions.length);

    // Step 5: Verify data preservation
    for (const action of manifest.actions) {
      const tool = registry.tools.find(t => t.name === action.intent.replace(/\./g, '_'));
      expect(tool).toBeDefined();
      expect(tool!.description).toBe(action.description);
      expect(tool!.metadata.source_intent).toBe(action.intent);
      expect(tool!.metadata.source_entity).toBe(action.entity);
    }
  });

  it('tool input_schema properties match manifest parameters', async () => {
    const elements = await scanFiles(SAMPLE_APP);
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });
    const registry = generateToolRegistry(manifest, '/test/manifest.json');

    for (const action of manifest.actions) {
      const tool = registry.tools.find(t => t.name === action.intent.replace(/\./g, '_'))!;

      // Check required params appear in required array
      for (const param of action.required_parameters) {
        expect(tool.input_schema.required).toContain(param.name);
        expect(tool.input_schema.properties).toHaveProperty(param.name);
        expect(tool.input_schema.properties[param.name].type).toBe(param.type);
      }

      // Check optional params appear in properties but NOT in required
      for (const param of action.optional_parameters) {
        expect(tool.input_schema.properties).toHaveProperty(param.name);
        expect(tool.input_schema.required).not.toContain(param.name);
      }
    }
  });

  it('tool metadata.risk_level matches annotation risk-level', async () => {
    const elements = await scanFiles(SAMPLE_APP);
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });
    const registry = generateToolRegistry(manifest, '/test/manifest.json');

    for (const action of manifest.actions) {
      const tool = registry.tools.find(t => t.name === action.intent.replace(/\./g, '_'))!;
      expect(tool.metadata.risk_level).toBe(action.risk_level ?? 'none');
    }
  });

  it('tool metadata.confirmation_required matches annotation', async () => {
    const elements = await scanFiles(SAMPLE_APP);
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });
    const registry = generateToolRegistry(manifest, '/test/manifest.json');

    for (const action of manifest.actions) {
      const tool = registry.tools.find(t => t.name === action.intent.replace(/\./g, '_'))!;
      expect(tool.metadata.confirmation_required).toBe(action.confirmation_required ?? false);
    }
  });

  it('tool metadata.scope matches annotation scope when present', async () => {
    const elements = await scanFiles(SAMPLE_APP);
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });
    const registry = generateToolRegistry(manifest, '/test/manifest.json');

    for (const action of manifest.actions) {
      const tool = registry.tools.find(t => t.name === action.intent.replace(/\./g, '_'))!;
      if (action.scope) {
        expect(tool.metadata.scope).toBe(action.scope);
      }
    }
  });

  it('no Playwright/browser dependencies needed for local scan', async () => {
    // This test verifies the scanning pipeline is purely file-based
    // by ensuring it completes without any browser-related errors
    const elements = await scanFiles(SAMPLE_APP);
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });
    const validation = validateManifest(manifest);
    const registry = generateToolRegistry(manifest, '/test/manifest.json');

    expect(validation.valid).toBe(true);
    expect(registry.tools.length).toBeGreaterThan(0);
  });
});
