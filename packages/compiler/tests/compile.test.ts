import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { compile } from '../src/index.js';
import { scanFilesLikeCli } from './helpers/cli-parity.js';

const APP = path.resolve(import.meta.dirname, 'fixtures/app');

const compileApp = () => compile({ root: APP, generatedAt: 'fixed', toolVersion: '0.1.0' });

describe('compile', () => {
  it('reads annotations from HTML, JSX, Vue and Angular sources', async () => {
    const { manifest, files } = await compileApp();

    expect(files.sort()).toEqual([
      'index.html',
      'src/Admin.tsx',
      'src/Widget.vue',
      'src/team.component.html',
    ]);
    expect(manifest.actions.map(a => a.intent)).toEqual([
      'cart.add_item',
      'invite.send',
      'product.search',
      'user.deactivate',
      'user.export',
    ]);
  });

  it('expands a defineAction spec into the same action as the equivalent markup', async () => {
    const { manifest } = await compileApp();
    const action = manifest.actions.find(a => a.intent === 'user.deactivate')!;

    expect(action).toMatchObject({
      entity: 'user',
      action_type: 'write',
      description: 'Deactivate a user and revoke their sessions',
      risk_level: 'critical',
      confirmation_required: true,
      approval_required: true,
      approval_roles: ['security_admin'],
      idempotent: true,
      scope: 'tenant',
      required_parameters: [{ name: 'user_id', type: 'string', format: 'uuid' }],
      source_file: 'src/Admin.tsx',
    });
    // Imported from ./specs.js, and the local spec resolves too.
    expect(manifest.actions.find(a => a.intent === 'user.export')?.risk_level).toBe('low');
  });

  it('records annotations it cannot read as dynamic actions', async () => {
    const { manifest } = await compileApp();
    expect(manifest.dynamic_actions).toEqual([
      { source_file: 'src/Admin.tsx', source_line: 16, reason: expect.stringContaining('dynamic axag value') },
      { source_file: 'src/Widget.vue', source_line: 6, reason: expect.stringContaining('dynamic axag value') },
      { source_file: 'src/team.component.html', source_line: 7, reason: expect.stringContaining('dynamic axag value') },
    ]);
  });

  it('harvests parameters from Vue and Angular templates too', async () => {
    const { manifest } = await compileApp();
    expect(manifest.actions.find(a => a.intent === 'invite.send')?.required_parameters).toEqual([
      { name: 'email', type: 'string', format: 'email', description: 'Teammate email', source: 'harvested:html' },
    ]);
    expect(manifest.actions.find(a => a.intent === 'product.search')?.required_parameters).toEqual([
      { name: 'q', type: 'string', description: 'Search products', source: 'harvested:html' },
    ]);
  });

  it('produces WebMCP tools alongside the manifest', async () => {
    const { registry, webmcpTools } = await compileApp();
    expect(registry.tools.map(t => t.name)).toEqual(webmcpTools.map(t => t.name));

    const deactivate = webmcpTools.find(t => t.name === 'user_deactivate')!;
    expect(deactivate.inputSchema).toEqual({
      type: 'object',
      properties: { user_id: { type: 'string', format: 'uuid' } },
      required: ['user_id'],
    });
    expect(deactivate.annotations).toMatchObject({ destructiveHint: false, idempotentHint: true, axag: { risk_level: 'critical' } });
  });

  it('matches what the CLI produces from the same HTML and JSX sources', async () => {
    const { manifest } = await compile({ root: APP, include: ['**/*.{html,tsx}'], generatedAt: 'fixed', toolVersion: '0.1.0' });
    const fromCli = await scanFilesLikeCli(APP);

    const strip = (actions: typeof manifest.actions) => actions.map(({ source_file: _f, source_line: _l, ...rest }) => rest);
    expect(strip(manifest.actions.filter(a => a.intent !== 'user.deactivate' && a.intent !== 'user.export')))
      .toEqual(strip(fromCli.actions));
  });

  it('can be limited to explicit files', async () => {
    const { manifest, files } = await compile({ root: APP, files: ['index.html'] });
    expect(files).toEqual(['index.html']);
    expect(manifest.actions.map(a => a.intent)).toEqual(['product.search']);
  });
});
