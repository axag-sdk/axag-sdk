/**
 * Tests for the MCP tool generator.
 */

import { describe, it, expect } from 'vitest';
import { actionToTool, generateToolRegistry } from '../../src/tool-generator/generator.js';
import { buildInputSchema } from '../../src/tool-generator/input-schema-builder.js';
import type { ManifestAction, ManifestOutput, ManifestParameter } from '../../src/manifest/types.js';

function makeAction(overrides: Partial<ManifestAction> = {}): ManifestAction {
  return {
    intent: 'product.search',
    entity: 'product',
    action_type: 'read',
    operation_id: 'product_search',
    description: 'Search for products',
    required_parameters: [],
    optional_parameters: [],
    source_file: '/test.html',
    source_line: 1,
    ...overrides,
  };
}

describe('actionToTool', () => {
  it('maps intent to tool name with dot → underscore', () => {
    const tool = actionToTool(makeAction({ intent: 'product.search' }));
    expect(tool.name).toBe('product_search');
  });

  it('preserves description', () => {
    const tool = actionToTool(makeAction({ description: 'Search for products by keyword' }));
    expect(tool.description).toBe('Search for products by keyword');
  });

  it('maps required parameters to input_schema.required', () => {
    const tool = actionToTool(makeAction({
      required_parameters: [
        { name: 'query', type: 'string', description: 'Search term' },
        { name: 'page', type: 'number' },
      ],
    }));

    expect(tool.input_schema.required).toEqual(['query', 'page']);
  });

  it('maps required + optional parameters to input_schema.properties', () => {
    const tool = actionToTool(makeAction({
      required_parameters: [
        { name: 'query', type: 'string', description: 'Search term' },
      ],
      optional_parameters: [
        { name: 'page', type: 'number', description: 'Page number' },
      ],
    }));

    expect(tool.input_schema.properties).toHaveProperty('query');
    expect(tool.input_schema.properties).toHaveProperty('page');
    expect(tool.input_schema.properties.query.type).toBe('string');
    expect(tool.input_schema.properties.query.description).toBe('Search term');
    expect(tool.input_schema.properties.page.type).toBe('number');
  });

  it('maps safety metadata with defaults', () => {
    const tool = actionToTool(makeAction());
    expect(tool.metadata.risk_level).toBe('none');
    expect(tool.metadata.idempotent).toBe(false);
    expect(tool.metadata.confirmation_required).toBe(false);
    expect(tool.metadata.approval_required).toBe(false);
    expect(tool.metadata.source_intent).toBe('product.search');
    expect(tool.metadata.source_entity).toBe('product');
  });

  it('maps safety metadata from action', () => {
    const tool = actionToTool(makeAction({
      intent: 'order.place',
      entity: 'order',
      risk_level: 'high',
      idempotent: false,
      confirmation_required: true,
      approval_required: true,
      scope: 'tenant',
    }));

    expect(tool.metadata.risk_level).toBe('high');
    expect(tool.metadata.idempotent).toBe(false);
    expect(tool.metadata.confirmation_required).toBe(true);
    expect(tool.metadata.approval_required).toBe(true);
    expect(tool.metadata.scope).toBe('tenant');
    expect(tool.metadata.source_intent).toBe('order.place');
    expect(tool.metadata.source_entity).toBe('order');
  });

  it('omits scope from metadata when not set on action', () => {
    const tool = actionToTool(makeAction({ scope: undefined }));
    expect(tool.metadata).not.toHaveProperty('scope');
  });

  it('always has type: object in input_schema', () => {
    const tool = actionToTool(makeAction());
    expect(tool.input_schema.type).toBe('object');
  });
});

describe('buildInputSchema', () => {
  it('converts all parameter constraints', () => {
    const params: ManifestParameter[] = [
      {
        name: 'quantity',
        type: 'number',
        description: 'Quantity to add',
        min: 1,
        max: 99,
      },
    ];

    const { properties } = buildInputSchema(params, []);
    expect(properties.quantity).toEqual({
      type: 'number',
      description: 'Quantity to add',
      minimum: 1,
      maximum: 99,
    });
  });

  it('converts enum parameter', () => {
    const params: ManifestParameter[] = [
      {
        name: 'sort',
        type: 'string',
        enum: ['relevance', 'price_asc', 'price_desc'],
      },
    ];

    const { properties } = buildInputSchema(params, []);
    expect(properties.sort.enum).toEqual(['relevance', 'price_asc', 'price_desc']);
  });

  it('converts maxLength parameter', () => {
    const params: ManifestParameter[] = [
      { name: 'name', type: 'string', maxLength: 100 },
    ];

    const { properties } = buildInputSchema(params, []);
    expect(properties.name.maxLength).toBe(100);
  });

  it('converts format parameter', () => {
    const params: ManifestParameter[] = [
      { name: 'email', type: 'string', format: 'email' },
    ];

    const { properties } = buildInputSchema(params, []);
    expect(properties.email.format).toBe('email');
  });

  it('converts default parameter', () => {
    const params: ManifestParameter[] = [
      { name: 'page', type: 'number', default: 1 },
    ];

    const { properties } = buildInputSchema([], params);
    expect(properties.page.default).toBe(1);
  });

  it('only includes required param names in required array', () => {
    const required: ManifestParameter[] = [
      { name: 'query', type: 'string' },
    ];
    const optional: ManifestParameter[] = [
      { name: 'page', type: 'number' },
    ];

    const result = buildInputSchema(required, optional);
    expect(result.required).toEqual(['query']);
    expect(result.properties).toHaveProperty('query');
    expect(result.properties).toHaveProperty('page');
  });

  it('handles all parameter types', () => {
    const params: ManifestParameter[] = [
      { name: 'str', type: 'string' },
      { name: 'num', type: 'number' },
      { name: 'bool', type: 'boolean' },
      { name: 'arr', type: 'array' },
      { name: 'obj', type: 'object' },
    ];

    const { properties } = buildInputSchema(params, []);
    expect(properties.str.type).toBe('string');
    expect(properties.num.type).toBe('number');
    expect(properties.bool.type).toBe('boolean');
    expect(properties.arr.type).toBe('array');
    expect(properties.obj.type).toBe('object');
  });
});

describe('generateToolRegistry', () => {
  it('generates a registry with one tool per action', () => {
    const manifest: ManifestOutput = {
      version: '1.0.0',
      generated_at: '2025-01-01T00:00:00.000Z',
      source: { paths: ['/app'], tool: 'axag-cli', tool_version: '1.0.0' },
      conformance: 'basic',
      actions: [
        makeAction({ intent: 'product.search' }),
        makeAction({ intent: 'cart.add_item', entity: 'cart', action_type: 'write' }),
        makeAction({ intent: 'account.delete', entity: 'account', action_type: 'delete' }),
      ],
    };

    const registry = generateToolRegistry(manifest, '/app/manifest.json');

    expect(registry.tools).toHaveLength(3);
    expect(registry.schema_version).toBe('1.0.0');
    expect(registry.source_manifest).toBe('/app/manifest.json');
    expect(registry.generated_at).toBeDefined();
  });

  it('tool names match expected pattern', () => {
    const manifest: ManifestOutput = {
      version: '1.0.0',
      generated_at: '2025-01-01T00:00:00.000Z',
      source: { paths: ['/app'], tool: 'axag-cli', tool_version: '1.0.0' },
      conformance: 'basic',
      actions: [
        makeAction({ intent: 'product.search' }),
        makeAction({ intent: 'cart.add_item' }),
        makeAction({ intent: 'order.place' }),
      ],
    };

    const registry = generateToolRegistry(manifest, '/app/manifest.json');
    const names = registry.tools.map(t => t.name);

    expect(names).toContain('product_search');
    expect(names).toContain('cart_add_item');
    expect(names).toContain('order_place');
  });
});
