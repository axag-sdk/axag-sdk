import { describe, it, expect } from 'vitest';
import _Ajv from 'ajv';
import _addFormats from 'ajv-formats';
import schema from '../schema/axag-manifest.schema.json' with { type: 'json' };
import { buildManifest, generateToolRegistry, SPEC_VERSION } from '../src/index.js';
import { extractHtml } from '../src/adapters/html.js';
import { corpus } from './fixtures/corpus.js';

// ajv and ajv-formats are CJS; their constructors sit under `default` in ESM.
const Ajv = (_Ajv as unknown as { default: typeof _Ajv.default }).default;
const addFormats = (_addFormats as unknown as { default: typeof _addFormats.default }).default;

describe('buildManifest', () => {
  it('produces a schema-valid manifest for every valid corpus snippet', () => {
    const elements = Object.entries(corpus)
      .filter(([name]) => !name.startsWith('invalid-'))
      .flatMap(([name, html]) => extractHtml(html, `${name}.html`));
    const { manifest } = buildManifest(elements, { paths: ['corpus'] });

    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const valid = ajv.validate(schema, manifest);
    expect(ajv.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
    expect(manifest.version).toBe(SPEC_VERSION);
    expect(manifest.actions.map(a => a.intent)).toEqual([...manifest.actions.map(a => a.intent)].sort());
  });

  it('keeps the first declaration of a duplicate intent and reports the second', () => {
    const html = `<button axag-intent="order.cancel">A</button>\n<button axag-intent="order.cancel">B</button>`;
    const { manifest, diagnostics } = buildManifest(extractHtml(html, 'page.html'), { paths: ['.'] });

    expect(manifest.actions).toHaveLength(1);
    expect(manifest.actions[0].source_line).toBe(1);
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'AXAG-CORE-003', line: 2, message: expect.stringContaining('page.html:1') }),
    ]);
  });

  it('attaches file locations to reader diagnostics', () => {
    const { diagnostics } = buildManifest(extractHtml(corpus['invalid-json-params'], 'bad.html'), { paths: ['.'] });
    expect(diagnostics).toEqual([expect.objectContaining({ code: 'AXAG-CORE-001', filePath: 'bad.html', line: 1 })]);
  });

  it('turns every action into a tool', () => {
    const elements = extractHtml(corpus['object-params'], 'f.html');
    const registry = generateToolRegistry(buildManifest(elements, { paths: ['.'] }).manifest, 'm.json');
    expect(registry.tools[0].input_schema).toEqual({
      type: 'object',
      properties: {
        passengers: { type: 'number', minimum: 1, maximum: 9 },
        cabin: { type: 'string', enum: ['economy', 'business'] },
      },
      required: ['passengers'],
    });
  });

  it('carries safety, scope and roles into tool metadata', () => {
    const elements = extractHtml(corpus['safety-full'], 's.html');
    const [tool] = generateToolRegistry(buildManifest(elements, { paths: ['.'] }).manifest, 'm.json').tools;
    expect(tool.metadata).toEqual({
      action_type: 'write',
      risk_level: 'critical',
      idempotent: true,
      confirmation_required: true,
      approval_required: true,
      approval_roles: ['super_admin', 'security_admin'],
      scope: 'tenant',
      tenant_boundary: 'strict',
      side_effects: ['session_revocation', 'audit_log'],
      preconditions: ['user is active'],
      postconditions: ['user cannot sign in'],
      source_intent: 'user.deactivate',
      source_entity: 'user',
    });
  });

  it('maps parameter constraints to JSON Schema keywords', () => {
    const html = `<form axag-intent="profile.update" axag-action-type="write" axag-required-parameters='[{"name":"site","type":"string","format":"url","pattern":"^https://","minLength":8},{"name":"tags","type":"array","items":{"type":"string"}}]' axag-async="true" axag-required-roles='["editor"]'></form>`;
    const { manifest } = buildManifest(extractHtml(html, 'p.html'), { paths: ['.'] });
    const [tool] = generateToolRegistry(manifest, 'm.json').tools;

    expect(manifest.actions[0]).toMatchObject({ async: true, required_roles: ['editor'] });
    expect(tool.input_schema.properties).toEqual({
      site: { type: 'string', format: 'uri', pattern: '^https://', minLength: 8 },
      tags: { type: 'array', items: { type: 'string' } },
    });
    expect(tool.metadata).toMatchObject({ async: true, required_roles: ['editor'] });
  });
});
