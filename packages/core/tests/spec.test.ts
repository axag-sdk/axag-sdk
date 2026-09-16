import { describe, it, expect } from 'vitest';
import { buildManifest, defineAction, generateToolRegistry, specToAttributes, toWebMcpTool } from '../src/index.js';
import { extractHtml } from '../src/adapters/html.js';
import { extractJsx } from '../src/adapters/jsx.js';

const spec = defineAction({
  intent: 'user.deactivate',
  actionType: 'write',
  description: 'Deactivate a user',
  riskLevel: 'critical',
  confirmationRequired: true,
  approvalRequired: true,
  approvalRoles: ['security_admin'],
  idempotent: true,
  scope: 'tenant',
  tenantBoundary: 'strict',
  requiredParameters: ['user_id', { name: 'reason', type: 'string', maxLength: 200 }],
  handler: () => undefined,
});

describe('specToAttributes', () => {
  it('produces the attributes an author would have written, dropping the handler', () => {
    expect(specToAttributes(spec)).toEqual({
      'axag-intent': 'user.deactivate',
      'axag-action-type': 'write',
      'axag-description': 'Deactivate a user',
      'axag-risk-level': 'critical',
      'axag-confirmation-required': 'true',
      'axag-approval-required': 'true',
      'axag-approval-roles': '["security_admin"]',
      'axag-idempotent': 'true',
      'axag-scope': 'tenant',
      'axag-tenant-boundary': 'strict',
      'axag-required-parameters': '["user_id",{"name":"reason","type":"string","maxLength":200}]',
    });
  });

  it('gives the same action as the equivalent markup', () => {
    const actions = (elements: Parameters<typeof buildManifest>[0]) =>
      buildManifest(elements, { paths: ['.'] }).manifest.actions.map(({ source_line: _l, source_file: _f, ...rest }) => rest);

    const fromSpec = actions([{ attributes: specToAttributes(spec), filePath: 'x', line: 1 }]);
    const html = `<button axag="write:user.deactivate!critical?confirm&approval&roles=security_admin&idempotent&scope=tenant&tenant=strict&req=user_id"
      axag-description="Deactivate a user"
      axag-required-parameters='["user_id",{"name":"reason","type":"string","maxLength":200}]'>x</button>`;
    expect(fromSpec).toEqual(actions(extractHtml(html, 'x')));
  });
});

describe('resolveSpec', () => {
  it('lets a build step expand axag={spec} into attributes', () => {
    const source = `const deactivate = defineAction({ intent: 'user.deactivate' });
      export const B = () => <button axag={deactivate}>Deactivate</button>;`;
    expect(extractJsx(source, 'b.tsx')).toEqual([]);

    const [el] = extractJsx(source, 'b.tsx', {
      resolveSpec: expression => (expression.type === 'Identifier' ? specToAttributes(spec) : undefined),
    });
    expect(el.attributes['axag-intent']).toBe('user.deactivate');
    expect(el.attributes.axag).toBeUndefined();
  });
});

describe('toWebMcpTool', () => {
  it('renames input_schema and keeps AXAG metadata under annotations', () => {
    const { manifest } = buildManifest([{ attributes: specToAttributes(spec), filePath: 'x', line: 1 }], { paths: ['.'] });
    const [tool] = generateToolRegistry(manifest, 'm.json').tools;
    const webmcp = toWebMcpTool(tool);

    expect(webmcp.name).toBe('user_deactivate');
    expect(webmcp.inputSchema).toEqual(tool.input_schema);
    expect(webmcp.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      axag: { risk_level: 'critical', source_intent: 'user.deactivate' },
    });
  });
});
