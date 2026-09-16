import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadZodBinding, zodToBinding } from '../src/index.js';
import { InviteUser } from './fixtures/schemas.js';

const FIXTURES = path.resolve(import.meta.dirname, 'fixtures');

const EXPECTED = {
  source: 'zod',
  description: 'Invite a user to the workspace',
  required: [
    { name: 'email', type: 'string', description: 'Work email', maxLength: 254, format: 'email', source: 'zod' },
    { name: 'seats', type: 'integer', min: 1, max: 500, source: 'zod' },
  ],
  optional: [
    { name: 'role', type: 'string', enum: ['admin', 'member'], default: 'member', source: 'zod' },
    { name: 'note', type: 'string', source: 'zod' },
    { name: 'tags', type: 'array', items: { type: 'string' }, source: 'zod' },
  ],
};

describe('zodToBinding', () => {
  it('converts an object schema using its input side', () => {
    const binding = zodToBinding(InviteUser);
    // Zod emits a pattern alongside format: "email"; the format is what matters here.
    const email = binding.required[0];
    expect(email.pattern).toBeTypeOf('string');
    delete email.pattern;
    expect(binding).toEqual(EXPECTED);
  });

  it('rejects non-object and non-Zod values', () => {
    expect(() => zodToBinding({ type: 'object' })).toThrow('Expected a Zod 4 schema');
  });
});

describe('loadZodBinding', () => {
  it('imports a named export from a TypeScript file', async () => {
    const binding = await loadZodBinding('schemas.ts', 'InviteUser', FIXTURES);
    expect(binding.required.map(p => p.name)).toEqual(['email', 'seats']);
  });

  it('supports the default export', async () => {
    const binding = await loadZodBinding('schemas.ts', 'default', FIXTURES);
    expect(binding.optional.map(p => p.name)).toEqual(['role', 'note', 'tags']);
  });

  it('explains missing exports and wrong schema types', async () => {
    await expect(loadZodBinding('schemas.ts', 'Nope', FIXTURES)).rejects.toThrow('has no export "Nope"');
    await expect(loadZodBinding('schemas.ts', 'NotAnObject', FIXTURES)).rejects.toThrow('Expected a z.object() schema');
  });
});
