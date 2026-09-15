/**
 * Tests for the generate-tools CLI command.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { generateToolRegistry } from '../../src/tool-generator/generator.js';
import type { ManifestOutput } from '../../src/manifest/types.js';
import type { ToolRegistry } from '../../src/tool-generator/types.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../test-fixtures');

describe('generate-tools from sample manifest', () => {
  let manifest: ManifestOutput;
  let registry: ToolRegistry;

  // Load the sample manifest and generate tools
  it('loads and parses the sample manifest', async () => {
    const raw = await fs.readFile(path.join(FIXTURES_DIR, 'sample-manifest.json'), 'utf-8');
    manifest = JSON.parse(raw);
    expect(manifest.actions).toHaveLength(5);
  });

  it('generates a tool registry from the manifest', () => {
    registry = generateToolRegistry(manifest, path.join(FIXTURES_DIR, 'sample-manifest.json'));
    expect(registry.tools).toHaveLength(5);
    expect(registry.schema_version).toBe('1.0.0');
  });

  it('generates correct tool names', () => {
    const names = registry.tools.map(t => t.name);
    expect(names).toContain('product_search');
    expect(names).toContain('cart_add_item');
    expect(names).toContain('order_place');
    expect(names).toContain('account_delete');
    expect(names).toContain('user_list');
  });

  it('maps product_search parameters correctly', () => {
    const tool = registry.tools.find(t => t.name === 'product_search')!;
    expect(tool.input_schema.required).toEqual(['query']);
    expect(tool.input_schema.properties).toHaveProperty('query');
    expect(tool.input_schema.properties).toHaveProperty('category');
    expect(tool.input_schema.properties).toHaveProperty('page');
    expect(tool.input_schema.properties).toHaveProperty('sort');
    expect(tool.input_schema.properties.sort.enum).toEqual([
      'relevance', 'price_asc', 'price_desc', 'rating',
    ]);
    expect(tool.input_schema.properties.page.minimum).toBe(1);
  });

  it('maps cart_add_item constraints correctly', () => {
    const tool = registry.tools.find(t => t.name === 'cart_add_item')!;
    expect(tool.input_schema.required).toEqual(['product_id', 'quantity']);
    expect(tool.input_schema.properties.quantity.minimum).toBe(1);
    expect(tool.input_schema.properties.quantity.maximum).toBe(99);
  });

  it('maps safety metadata for high-risk action', () => {
    const tool = registry.tools.find(t => t.name === 'order_place')!;
    expect(tool.metadata.risk_level).toBe('high');
    expect(tool.metadata.confirmation_required).toBe(true);
    expect(tool.metadata.idempotent).toBe(false);
    expect(tool.metadata.scope).toBe('user');
  });

  it('maps safety metadata for critical-risk action', () => {
    const tool = registry.tools.find(t => t.name === 'account_delete')!;
    expect(tool.metadata.risk_level).toBe('critical');
    expect(tool.metadata.confirmation_required).toBe(true);
    expect(tool.metadata.approval_required).toBe(true);
    expect(tool.metadata.source_intent).toBe('account.delete');
    expect(tool.metadata.source_entity).toBe('account');
  });

  it('maps tenant scope correctly', () => {
    const tool = registry.tools.find(t => t.name === 'user_list')!;
    expect(tool.metadata.scope).toBe('tenant');
    expect(tool.metadata.risk_level).toBe('low');
    expect(tool.metadata.idempotent).toBe(true);
  });

  it('writes tool registry to disk', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axag-test-'));
    const outputPath = path.join(tmpDir, 'tool-registry.json');
    await fs.writeFile(outputPath, JSON.stringify(registry, null, 2), 'utf-8');

    const written = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
    expect(written.tools).toHaveLength(5);
    expect(written.schema_version).toBe('1.0.0');

    // Cleanup
    await fs.rm(tmpDir, { recursive: true });
  });
});
