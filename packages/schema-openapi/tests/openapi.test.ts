import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadOpenApiBinding, loadOpenApiDocument, openApiToBinding } from '../src/index.js';

const FIXTURES = path.resolve(import.meta.dirname, 'fixtures');

describe('openApiToBinding', () => {
  it('merges path, query and JSON body parameters and reads x-axag-risk-level', async () => {
    const binding = await loadOpenApiBinding('openapi.yaml', 'deactivateUser', FIXTURES);
    expect(binding.source).toBe('openapi');
    expect(binding.riskLevel).toBe('critical');
    expect(binding.description).toBe('Deactivate a user and revoke their sessions');
    expect(binding.required).toEqual([
      { name: 'tenantId', type: 'string', description: 'Tenant the user belongs to', source: 'openapi' },
      { name: 'userId', type: 'string', format: 'uuid', source: 'openapi' },
      { name: 'reason', type: 'string', enum: ['offboarding', 'security', 'other'], source: 'openapi' },
    ]);
    expect(binding.optional.map(p => p.name)).toEqual(['notify', 'manager', 'effective_at']);
    expect(binding.optional[0]).toEqual({ name: 'notify', type: 'boolean', description: 'Email the user', default: true, source: 'openapi' });
    expect(binding.optional[2]).toMatchObject({ format: 'datetime' });
  });

  it('stops expanding recursive schemas', async () => {
    const { optional } = await loadOpenApiBinding('openapi.yaml', 'deactivateUser', FIXTURES);
    const manager = optional.find(p => p.name === 'manager')!;
    expect(manager.type).toBe('object');
    expect(manager.properties).toEqual({ name: { type: 'string' }, reports: { type: 'array', items: {} } });
  });

  it('applies path-level parameters and rejects unknown operation ids', async () => {
    const document = await loadOpenApiDocument('openapi.yaml', FIXTURES);
    // Path-level parameters apply to every operation on the path.
    expect(openApiToBinding(document, 'getUser')).toEqual({
      source: 'openapi',
      required: [
        { name: 'tenantId', type: 'string', description: 'Tenant the user belongs to', source: 'openapi' },
        { name: 'userId', type: 'string', format: 'uuid', source: 'openapi' },
      ],
      optional: [],
    });
    expect(() => openApiToBinding(document, 'missing')).toThrow('OpenAPI operation "missing" not found');
  });
});
