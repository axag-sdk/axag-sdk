/**
 * Integration test: Schema validation of manifests.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scanFiles } from '../../src/scanner/file-scanner.js';
import { generateManifest } from '../../src/manifest/generator.js';
import { validateManifest } from '../../src/manifest/schema-validator.js';
import type { ManifestOutput } from '../../src/manifest/types.js';

const SAMPLE_APP = path.resolve(import.meta.dirname, 'sample-app');
const MANIFEST_PATH = path.resolve(import.meta.dirname, '../../test-fixtures/sample-manifest.json');

describe('integration: schema-validate', () => {
  it('sample-manifest.json passes schema validation', async () => {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(raw) as ManifestOutput;
    const result = validateManifest(manifest);

    expect(result.valid).toBe(true);
  });

  it('generated manifest from sample-app passes schema validation', async () => {
    const elements = await scanFiles(SAMPLE_APP);
    const manifest = generateManifest(elements, { paths: [SAMPLE_APP] });
    const result = validateManifest(manifest);

    expect(result.valid).toBe(true);
    if (!result.valid) {
      console.error('Validation errors:', result.errors);
    }
  });

  it('rejects manifest with missing required field (version)', () => {
    const manifest = {
      generated_at: new Date().toISOString(),
      source: { paths: ['/test'], tool: 'test', tool_version: '1.0.0' },
      conformance: 'basic',
      actions: [],
    };

    const result = validateManifest(manifest as any);
    expect(result.valid).toBe(false);
    expect(result.errors!.some(e => e.includes('version'))).toBe(true);
  });

  it('rejects manifest with invalid action_type', () => {
    const manifest: any = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      source: { paths: ['/test'], tool: 'test', tool_version: '1.0.0' },
      conformance: 'basic',
      actions: [{
        intent: 'test.action',
        entity: 'test',
        action_type: 'execute',  // invalid
        description: 'Test',
        operation_id: 'test_action',
        required_parameters: [],
        optional_parameters: [],
        source_file: '/test.html',
        source_line: 1,
      }],
    };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });

  it('rejects manifest with invalid risk_level', () => {
    const manifest: any = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      source: { paths: ['/test'], tool: 'test', tool_version: '1.0.0' },
      conformance: 'basic',
      actions: [{
        intent: 'test.action',
        entity: 'test',
        action_type: 'read',
        description: 'Test',
        operation_id: 'test_action',
        required_parameters: [],
        optional_parameters: [],
        risk_level: 'dangerous',  // invalid
        source_file: '/test.html',
        source_line: 1,
      }],
    };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });

  it('rejects manifest with invalid intent pattern', () => {
    const manifest: any = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      source: { paths: ['/test'], tool: 'test', tool_version: '1.0.0' },
      conformance: 'basic',
      actions: [{
        intent: 'InvalidIntent',  // must be lowercase with dot
        entity: 'test',
        action_type: 'read',
        description: 'Test',
        operation_id: 'test_action',
        required_parameters: [],
        optional_parameters: [],
        source_file: '/test.html',
        source_line: 1,
      }],
    };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });
});
