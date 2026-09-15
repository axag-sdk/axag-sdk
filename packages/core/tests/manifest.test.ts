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
  it('produces a schema-valid manifest for the whole corpus', () => {
    const elements = Object.entries(corpus).flatMap(([name, html]) => extractHtml(html, `${name}.html`));
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
});
