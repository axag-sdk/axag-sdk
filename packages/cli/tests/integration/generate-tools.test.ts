/**
 * Integration test: Generate tools from expected manifest.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateToolRegistry } from '../../src/tool-generator/generator.js';
import type { ManifestOutput } from '../../src/manifest/types.js';

const MANIFEST_PATH = path.resolve(import.meta.dirname, '../../test-fixtures/sample-manifest.json');

describe('integration: generate-tools', () => {
  let manifest: ManifestOutput;

  it('loads the sample manifest', async () => {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
    manifest = JSON.parse(raw);
    expect(manifest.actions).toHaveLength(5);
  });

  it('generates one tool per action', () => {
    const registry = generateToolRegistry(manifest, MANIFEST_PATH);
    expect(registry.tools).toHaveLength(manifest.actions.length);
  });

  it('tool names match intent-to-underscore pattern', () => {
    const registry = generateToolRegistry(manifest, MANIFEST_PATH);
    for (const tool of registry.tools) {
      expect(tool.name).not.toContain('.');
      expect(tool.name).toMatch(/^[a-z_]+$/);
    }
  });

  it('tool input_schema.required matches required_parameters', () => {
    const registry = generateToolRegistry(manifest, MANIFEST_PATH);

    for (const action of manifest.actions) {
      const tool = registry.tools.find(t => t.name === action.intent.replace(/\./g, '_'))!;
      expect(tool).toBeDefined();

      const expectedRequired = action.required_parameters.map(p => p.name);
      expect(tool.input_schema.required).toEqual(expectedRequired);
    }
  });

  it('tool properties include both required and optional params', () => {
    const registry = generateToolRegistry(manifest, MANIFEST_PATH);

    for (const action of manifest.actions) {
      const tool = registry.tools.find(t => t.name === action.intent.replace(/\./g, '_'))!;
      const totalParams = action.required_parameters.length + action.optional_parameters.length;
      expect(Object.keys(tool.input_schema.properties)).toHaveLength(totalParams);
    }
  });

  it('metadata preserves safety information', () => {
    const registry = generateToolRegistry(manifest, MANIFEST_PATH);

    const criticalTool = registry.tools.find(t => t.name === 'account_delete')!;
    expect(criticalTool.metadata.risk_level).toBe('critical');
    expect(criticalTool.metadata.confirmation_required).toBe(true);
    expect(criticalTool.metadata.approval_required).toBe(true);

    const readTool = registry.tools.find(t => t.name === 'product_search')!;
    expect(readTool.metadata.risk_level).toBe('none');
    expect(readTool.metadata.idempotent).toBe(true);
  });
});
