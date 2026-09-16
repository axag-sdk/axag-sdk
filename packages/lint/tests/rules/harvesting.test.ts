import { describe, it, expect } from 'vitest';
import { parseHtml } from '../../src/parser/index.js';
import { ALL_RULES } from '../../src/rules/index.js';
import type { FileContext, ManifestData } from '../../src/types.js';

function run(html: string, ruleId: string, manifest?: ManifestData) {
  const elements = parseHtml(html, 'page.html');
  const context: FileContext = { filePath: 'page.html', elements, manifest };
  const rule = ALL_RULES.find(r => r.id === ruleId)!;
  return elements.flatMap(el => rule.check(el, context));
}

describe('AXAG-LINT-029: unnamed form control', () => {
  it('flags controls without name, id or axag-parameter at their own line', () => {
    const html = `<form axag="write:lead.create">\n  <input name="email" aria-label="Email">\n  <input placeholder="Company">\n</form>`;
    const diags = run(html, 'AXAG-LINT-029');
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({ line: 3, column: 3, severity: 'warning' });
    expect(diags[0].message).toContain('"lead.create"');
  });

  it('passes when every control is named', () => {
    expect(run(`<form axag="write:lead.create"><input name="email"><input axag-parameter="company"></form>`, 'AXAG-LINT-029')).toEqual([]);
  });
});

describe('AXAG-LINT-030: form disagrees with linked schema', () => {
  const html = `<form axag="write:user.invite">
    <input name="email" type="email" aria-label="Email">
    <input name="seats" type="number" required aria-label="Seats">
    <select name="role" aria-label="Role"><option>admin</option><option>guest</option></select>
    <input name="note" aria-label="Note">
  </form>`;
  const manifest: ManifestData = {
    version: '1.1.0',
    actions: [{
      intent: 'user.invite',
      entity: 'user',
      action_type: 'write',
      required_parameters: [
        { name: 'email', type: 'string', source: 'zod' },
        { name: 'seats', type: 'integer', source: 'zod' },
      ],
      optional_parameters: [
        { name: 'role', type: 'string', enum: ['admin', 'member'], source: 'zod' },
        { name: 'note', type: 'boolean', source: 'harvested:html' },
      ],
    }],
  };

  it('reports required, type and enum mismatches against schema-sourced parameters only', () => {
    const messages = run(html, 'AXAG-LINT-030', manifest).map(d => d.message);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('"email" (zod) is required in the schema but optional in the form');
    expect(messages[1]).toContain('"role" (zod) allows ["admin","member"] in the schema but ["admin","guest"] in the form');
  });

  it('does nothing without a manifest', () => {
    expect(run(html, 'AXAG-LINT-030')).toEqual([]);
  });
});

describe('AXAG-LINT-031: no accessible name', () => {
  it('flags icon-only buttons and links', () => {
    const html = `<button axag="delete:invoice.void"><svg></svg></button>
      <a href="/x" axag="navigate:help.open"></a>
      <button axag="read:a.b" aria-label="Refresh"></button>
      <button axag="read:a.c"><img src="i.png" alt="Close"></button>
      <input type="submit" value="Send" axag="write:a.d">
      <form axag="write:a.e"></form>`;
    const diags = run(html, 'AXAG-LINT-031');
    expect(diags.map(d => d.message.split(' ')[0])).toEqual(['<button>', '<a>']);
    expect(diags[0].severity).toBe('error');
  });
});

describe('AXAG-LINT-032: unlabelled harvested parameter', () => {
  it('flags parameters with only a placeholder', () => {
    const html = `<form axag="read:product.search">
      <input name="query" placeholder="Search">
      <label for="cat">Category</label><select id="cat" name="category"><option>a</option></select>
      <textarea name="notes" axag-parameter-description="Extra notes"></textarea>
    </form>`;
    const diags = run(html, 'AXAG-LINT-032');
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain('"query"');
  });
});

describe('AXAG-LINT-001 with harvesting', () => {
  it('does not flag the submit button of an annotated form or a form feeding an annotated button', () => {
    const html = `<form axag="write:order.place"><input name="email"><button type="submit">Place order</button></form>
      <form id="coupon"><input name="code"></form>
      <button type="submit" form="coupon" axag="write:coupon.apply">Apply</button>
      <form><button>Unannotated</button></form>`;
    const diags = run(html, 'AXAG-LINT-001');
    expect(diags.map(d => d.message)).toEqual([
      'Interactive <form> element is missing axag-intent attribute',
      'Interactive <button> element is missing axag-intent attribute',
    ]);
  });
});
