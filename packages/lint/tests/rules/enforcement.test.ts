import { describe, it, expect } from 'vitest';
import { parseHtml } from '../../src/parser/index.js';
import { ALL_RULES } from '../../src/rules/index.js';
import type { FileContext } from '../../src/types.js';

function run(html: string, ruleId: string, context: Partial<FileContext> = {}) {
  const elements = parseHtml(html, 'page.html');
  const rule = ALL_RULES.find(r => r.id === ruleId)!;
  return elements.flatMap(el => rule.check(el, { filePath: 'page.html', elements, ...context }));
}

describe('AXAG-LINT-036: tenant parameter on a tenant-scoped action', () => {
  it('flags a declared tenant parameter', () => {
    const diagnostics = run(
      `<button axag="write:user.deactivate!critical?scope=tenant" axag-required-parameters='["user_id","tenant_id"]'>x</button>`,
      'AXAG-LINT-036',
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('"tenant_id"');
    expect(diagnostics[0].severity).toBe('error');
  });

  it('flags one harvested from the form', () => {
    const diagnostics = run(
      `<form axag="write:user.invite!medium?scope=tenant">
         <input name="email" aria-label="Email"><input name="org_id" aria-label="Org">
       </form>`,
      'AXAG-LINT-036',
    );
    expect(diagnostics.map(d => d.message.includes('"org_id"'))).toEqual([true]);
  });

  it('leaves actions that are not tenant-scoped alone', () => {
    expect(
      run(`<button axag="write:user.deactivate!critical?scope=global" axag-required-parameters='["tenant_id"]'>x</button>`, 'AXAG-LINT-036'),
    ).toEqual([]);
  });
});

describe('AXAG-LINT-037: unenforced high-risk action', () => {
  const page = `<button axag="write:user.deactivate!critical">a</button>
    <button axag="delete:invoice.void!high">b</button>
    <button axag="write:cart.add_item!low">c</button>`;

  it('flags high and critical actions the server does not enforce', () => {
    const diagnostics = run(page, 'AXAG-LINT-037', { enforcedIntents: new Set(['invoice.void']) });
    expect(diagnostics.map(d => d.line)).toEqual([1]);
    expect(diagnostics[0].message).toContain('user.deactivate');
    expect(diagnostics[0].severity).toBe('warning');
  });

  it('says nothing when no enforced list is configured', () => {
    expect(run(page, 'AXAG-LINT-037')).toEqual([]);
  });
});
