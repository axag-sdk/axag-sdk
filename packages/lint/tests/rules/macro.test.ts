import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { lint } from '../../src/engine.js';
import { parseHtml, parseJsx } from '../../src/parser/index.js';
import { ALL_RULES } from '../../src/rules/index.js';

const fixture = resolve(import.meta.dirname, '../fixtures/macro.html');
const byLine = (diags: { line: number; ruleId: string }[], line: number) =>
  diags.filter(d => d.line === line).map(d => d.ruleId);

describe('macro annotations', () => {
  it('run through the same rules as longhand attributes', () => {
    const run = (html: string) => {
      const elements = parseHtml(html, 'x.html');
      const context = { filePath: 'x.html', elements };
      return elements.flatMap(el => ALL_RULES.flatMap(rule => rule.check(el, context))).map(d => d.ruleId).sort();
    };
    const pairs = [
      [
        `<button axag="write:cart.add_item!medium">Add</button>`,
        `<button axag-intent="cart.add_item" axag-entity="cart" axag-action-type="write" axag-risk-level="medium">Add</button>`,
      ],
      [
        `<button axag="write:user.deactivate!critical?confirm&approval&roles=security_admin&idempotent&scope=tenant" axag-preconditions='["user is active"]'>Deactivate</button>`,
        `<button axag-intent="user.deactivate" axag-entity="user" axag-action-type="write" axag-risk-level="critical" axag-confirmation-required="true" axag-approval-required="true" axag-approval-roles='["security_admin"]' axag-idempotent="true" axag-scope="tenant" axag-preconditions='["user is active"]'>Deactivate</button>`,
      ],
    ];
    for (const [macro, longhand] of pairs) expect(run(macro)).toEqual(run(longhand));
    expect(run(pairs[0][0])).not.toEqual([]);
  });

  it('AXAG-LINT-027 reports invalid macro syntax', async () => {
    const { diagnostics } = await lint(fixture);
    const [d] = diagnostics.filter(x => x.ruleId === 'AXAG-LINT-027');
    expect(d).toMatchObject({ line: 6, severity: 'error' });
    expect(d.message).toContain('Unknown action type "mutate"');
    // The invalid element still counts as interactive and unannotated.
    expect(byLine(diagnostics, 6)).toContain('AXAG-LINT-001');
  });

  it('AXAG-LINT-028 reports macro/longhand conflicts', async () => {
    const { diagnostics } = await lint(fixture);
    const conflicts = diagnostics.filter(x => x.ruleId === 'AXAG-LINT-028');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ line: 7 });
    expect(conflicts[0].message).toContain('axag-risk-level');
  });

  it('are picked up by both parsers', () => {
    expect(parseHtml('<div axag="read:a.b"></div>', 'a.html')).toHaveLength(1);
    expect(parseJsx('const A = () => <div axag="read:a.b" />;', 'a.tsx')).toHaveLength(1);
  });
});
