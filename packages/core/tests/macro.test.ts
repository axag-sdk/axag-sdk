// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { buildManifest, parseMacro, readAttributes, toMacro } from '../src/index.js';
import { extractDom } from '../src/adapters/dom.js';
import { extractHtml, formatHtml } from '../src/adapters/html.js';
import { extractJsx, formatJsx } from '../src/adapters/jsx.js';
import { corpus } from './fixtures/corpus.js';

const actions = (elements: ReturnType<typeof extractHtml>) =>
  buildManifest(elements, { paths: ['.'], generatedAt: 'fixed' }).manifest.actions.map(
    ({ source_file: _f, source_line: _l, element_selector: _s, ...rest }) => rest,
  );

describe('parseMacro', () => {
  it('expands the full grammar', () => {
    expect(parseMacro('write:user.deactivate!critical?approval&confirm=false&scope=tenant&tenant=strict&roles=owner,security_admin&effects=audit_log&req=user_id&opt=reason')).toEqual({
      attributes: {
        'axag-action-type': 'write',
        'axag-intent': 'user.deactivate',
        'axag-risk-level': 'critical',
        'axag-approval-required': 'true',
        'axag-confirmation-required': 'false',
        'axag-scope': 'tenant',
        'axag-tenant-boundary': 'strict',
        'axag-approval-roles': '["owner","security_admin"]',
        'axag-side-effects': '["audit_log"]',
        'axag-required-parameters': '["user_id"]',
        'axag-optional-parameters': '["reason"]',
      },
      errors: [],
    });
  });

  it.each([
    ['user.deactivate', 1, 'Expected'],
    ['mutate:user.update', 1, 'Unknown action type "mutate"'],
    ['write:UserUpdate', 7, 'must look like entity.verb'],
    ['write:user.update!severe', 19, 'Unknown risk level "severe"'],
    ['read:a.b?color=red', 10, 'Unknown key "color"'],
    ['read:a.b?async&async', 16, 'more than once'],
    ['read:a.b?idempotent=yes', 21, 'takes true or false'],
    ['read:a.b?scope=org', 16, 'must be one of'],
    ['read:a.b?req=', 10, 'needs a value'],
    ['read:a.b?roles=a b', 16, 'items must be'],
  ])('reports %s at column %i', (value, column, message) => {
    const { errors } = parseMacro(value);
    expect(errors).toHaveLength(1);
    expect(errors[0].column).toBe(column);
    expect(errors[0].message).toContain(message);
  });

  it('keeps the valid parts when one pair is wrong', () => {
    const { attributes } = parseMacro('write:a.b!low?nope&idempotent');
    expect(attributes).toMatchObject({ 'axag-risk-level': 'low', 'axag-idempotent': 'true' });
  });
});

describe('readAttributes', () => {
  it('merges macro and longhand, reporting conflicts and keeping the longhand value', () => {
    const { attributes, diagnostics } = readAttributes({
      axag: 'write:order.cancel!high?roles=a,b',
      'axag-risk-level': 'critical',
      'axag-approval-roles': '["a", "b"]',
      'axag-description': 'Cancel an order',
    });
    expect(attributes).toMatchObject({ 'axag-risk-level': 'critical', 'axag-approval-roles': '["a", "b"]', 'axag-intent': 'order.cancel' });
    expect(diagnostics.map(d => [d.code, d.attribute])).toEqual([['AXAG-CORE-005', 'axag-risk-level']]);
  });

  it('treats an empty macro as absent', () => {
    expect(readAttributes({ axag: '' })).toEqual({ attributes: {}, diagnostics: [] });
  });
});

describe('toMacro', () => {
  it('leaves what the grammar cannot express as longhand', () => {
    expect(
      toMacro({
        'axag-intent': 'checkout.confirm',
        'axag-entity': 'order',
        'axag-action-type': 'write',
        'axag-side-effects': '["payment capture"]',
        'axag-required-parameters': '[{"name":"cart_id","type":"string"}]',
        'axag-idempotent': 'false',
      }),
    ).toEqual({
      macro: 'write:checkout.confirm?idempotent=false',
      remaining: {
        'axag-entity': 'order',
        'axag-side-effects': '["payment capture"]',
        'axag-required-parameters': '[{"name":"cart_id","type":"string"}]',
      },
    });
  });
});

describe('macro and longhand produce identical manifests', () => {
  const valid = Object.entries(corpus).filter(([name]) => !name.startsWith('invalid-'));

  it.each(valid)('%s', (_name, snippet) => {
    const longhand = actions(extractHtml(snippet, 'x.html'));
    const macroHtml = formatHtml(snippet, 'x.html', 'macro').output;
    expect(macroHtml).toContain(' axag="');

    expect(actions(extractHtml(macroHtml, 'x.html'))).toEqual(longhand);
    expect(actions(extractJsx(`const X = () => (<>${macroHtml}</>);`, 'x.tsx'))).toEqual(longhand);
    document.body.innerHTML = macroHtml;
    expect(actions(extractDom(document.body))).toEqual(longhand);

    // And back again.
    expect(actions(extractHtml(formatHtml(macroHtml, 'x.html', 'longhand').output, 'x.html'))).toEqual(longhand);
  });
});

describe('formatting', () => {
  it('rewrites only axag attributes and keeps multi-line layout', () => {
    const src = [
      '<button',
      '  class="danger"',
      '  axag-intent="user.deactivate"',
      '  axag-entity="user"',
      '  onclick="go()"',
      '  axag-action-type="write"',
      '  axag-risk-level="critical"',
      '  axag-description="Deactivate &amp; sign out"',
      '>Go</button>',
    ].join('\n');
    const { output, changed } = formatHtml(src, 'p.html', 'macro');
    expect(changed).toBe(1);
    expect(output).toBe(
      [
        '<button',
        '  class="danger"',
        '  axag="write:user.deactivate!critical"',
        '  axag-description="Deactivate &amp; sign out"',
        '  onclick="go()"',
        '>Go</button>',
      ].join('\n'),
    );
    expect(formatHtml(output, 'p.html', 'macro').changed).toBe(0);
  });

  it('expands a JSX macro to longhand on one line', () => {
    const src = `export const B = () => <button className="x" axag="delete:invoice.void!high?confirm&idempotent">Void</button>;`;
    expect(formatJsx(src, 'b.tsx', 'longhand').output).toBe(
      `export const B = () => <button className="x" axag-intent="invoice.void" axag-entity="invoice" axag-action-type="delete" axag-risk-level="high" axag-confirmation-required="true" axag-idempotent="true">Void</button>;`,
    );
  });

  it('skips elements with errors or dynamic values', () => {
    const src = `const A = () => (<>
      <button axag="write:a.b!nope">x</button>
      <button axag-intent="c.d" axag-risk-level={risk}>y</button>
    </>);`;
    const { changed, skipped } = formatJsx(src, 'a.tsx', 'macro');
    expect(changed).toBe(0);
    expect(skipped.map(s => s.line)).toEqual([2, 3]);
    expect(skipped[1].reason).toContain('axag-risk-level is not a string literal');
  });
});
