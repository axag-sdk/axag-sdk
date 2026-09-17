import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { extractHtml } from '@web-axag/core/html';
import { parseBindingRef, resolveBindings } from '../../src/manifest/bindings.js';
import { generateManifestWithDiagnostics } from '../../src/manifest/generator.js';

describe('parseBindingRef', () => {
  it.each([
    ['zod:./schemas/user.ts#InviteUser', undefined, { kind: 'zod', file: './schemas/user.ts', exportName: 'InviteUser' }],
    ['zod:./schemas/user.ts', undefined, { kind: 'zod', file: './schemas/user.ts', exportName: 'default' }],
    ['openapi:./api.yaml#inviteUser', undefined, { kind: 'openapi', file: './api.yaml', operationId: 'inviteUser' }],
    ['openapi:inviteUser', 'spec/openapi.json', { kind: 'openapi', file: 'spec/openapi.json', operationId: 'inviteUser' }],
  ])('%s', (ref, defaultOpenApi, expected) => {
    expect(parseBindingRef(ref, defaultOpenApi)).toEqual(expected);
  });

  it('explains bad refs', () => {
    expect(() => parseBindingRef('openapi:inviteUser')).toThrow('set "openapi" in axag.config');
    expect(() => parseBindingRef('json:x')).toThrow('must start with zod: or openapi:');
  });
});

describe('resolveBindings', () => {
  it('fills parameters from inline and configured bindings, and reports failures', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'axag-bind-'));
    await fs.writeFile(
      path.join(dir, 'schemas.ts'),
      `import { z } from 'zod';\nexport const Invite = z.object({ email: z.email(), seats: z.number().int().min(1) });\n`,
    );
    await fs.symlink(path.resolve(import.meta.dirname, '../../../schema-zod/node_modules'), path.join(dir, 'node_modules'));
    await fs.writeFile(
      path.join(dir, 'openapi.yaml'),
      [
        'openapi: 3.1.0',
        'info: { title: t, version: "1" }',
        'paths:',
        '  /users/{id}:',
        '    delete:',
        '      operationId: removeUser',
        '      x-axag-risk-level: high',
        '      parameters:',
        '        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }',
      ].join('\n'),
    );

    const html = `
      <form axag="write:user.invite" axag-schema="zod:schemas.ts#Invite"><input name="email" aria-label="Email"></form>
      <button axag="delete:user.remove">Remove</button>
      <button axag="write:user.broken" axag-schema="zod:schemas.ts#Missing">Broken</button>`;
    const bound = await resolveBindings(extractHtml(html, 'page.html'), {
      bindings: { 'user.remove': 'openapi:removeUser' },
      openapi: 'openapi.yaml',
      rootDir: dir,
    });

    expect(bound.diagnostics).toEqual([
      expect.objectContaining({ code: 'AXAG-CORE-006', line: 4, message: expect.stringContaining('has no export "Missing"') }),
    ]);

    const { manifest } = generateManifestWithDiagnostics(bound.elements, { paths: [dir] });
    const byIntent = Object.fromEntries(manifest.actions.map(a => [a.intent, a]));
    expect(byIntent['user.invite'].required_parameters).toEqual([
      { name: 'email', type: 'string', format: 'email', pattern: expect.any(String), description: 'Email', source: 'zod' },
      { name: 'seats', type: 'integer', min: 1, source: 'zod' },
    ]);
    expect(byIntent['user.remove']).toMatchObject({
      risk_level: 'high',
      required_parameters: [{ name: 'id', type: 'string', format: 'uuid', source: 'openapi' }],
    });
  });
});
