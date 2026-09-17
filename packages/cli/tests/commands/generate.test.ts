import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compile } from '@web-axag/compiler';
import { validateManifest } from '../../src/manifest/schema-validator.js';
import { resolveBindings } from '../../src/manifest/bindings.js';

async function fixture(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'axag-generate-'));
  await fs.writeFile(
    path.join(dir, 'page.html'),
    `<form axag="write:user.invite!medium?idempotent=false" axag-schema="openapi:inviteUser">
       <label for="email">Email</label><input id="email" name="email" type="email" required>
       <button type="submit">Invite</button>
     </form>`,
  );
  await fs.writeFile(
    path.join(dir, 'openapi.yaml'),
    [
      'openapi: 3.1.0',
      'info: { title: t, version: "1" }',
      'paths:',
      '  /invites:',
      '    post:',
      '      operationId: inviteUser',
      '      requestBody:',
      '        required: true',
      '        content:',
      '          application/json:',
      '            schema:',
      '              type: object',
      '              required: [email]',
      '              properties:',
      '                email: { type: string, format: email, maxLength: 254 }',
      '                seats: { type: integer, minimum: 1 }',
    ].join('\n'),
  );
  return dir;
}

describe('axag generate', () => {
  it('compiles sources, applies schema bindings and validates', async () => {
    const dir = await fixture();
    const result = await compile({
      root: dir,
      tool: 'axag-cli',
      toolVersion: '1.0.2',
      resolveBindings: elements => resolveBindings(elements, { rootDir: dir, openapi: 'openapi.yaml' }),
    });

    expect(validateManifest(result.manifest)).toEqual({ valid: true });
    const [action] = result.manifest.actions;
    expect(action.required_parameters).toEqual([
      // The binding supplies the constraint; the form supplies the label.
      { name: 'email', type: 'string', maxLength: 254, description: 'Email', format: 'email', source: 'openapi' },
    ]);
    expect(action.optional_parameters).toEqual([{ name: 'seats', type: 'integer', min: 1, source: 'openapi' }]);
    expect(result.manifest.source.tool).toBe('axag-cli');
  });
});
