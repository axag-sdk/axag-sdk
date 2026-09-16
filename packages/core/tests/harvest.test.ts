// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { buildManifest, jsonSchemaToParameters, mergeParameters } from '../src/index.js';
import type { AnnotatedElement, SchemaBinding } from '../src/index.js';
import { extractHtml } from '../src/adapters/html.js';
import { extractJsx } from '../src/adapters/jsx.js';
import { extractDom } from '../src/adapters/dom.js';

// Valid as HTML and JSX: labels use `for` in HTML and `htmlFor` in the JSX copy below.
const SIGNUP = `<form id="signup" axag="write:account.create!low?idempotent=false">
  <label for="email">Work email</label>
  <input id="email" name="email" type="email" required="" maxlength="254" />
  <label>Display name <input name="displayName" minlength="2" pattern="[a-z]+" /></label>
  <input name="seats" type="number" min="1" max="500" aria-label="Seats" aria-describedby="seats-help" />
  <p id="seats-help">You can add more later</p>
  <input name="budget" type="number" step="0.01" aria-label="Budget" />
  <select name="plan" aria-required="true" aria-label="Plan"><option value="team">Team</option><option value="enterprise">Enterprise</option></select>
  <select name="regions" multiple="" aria-label="Regions"><option>eu</option><option>us</option></select>
  <fieldset><legend>Billing cycle</legend>
    <input type="radio" name="cycle" value="monthly" required="" />
    <input type="radio" name="cycle" value="yearly" />
  </fieldset>
  <input type="checkbox" name="terms" required="" aria-label="Accept terms" />
  <input type="date" name="start" aria-label="Start date" />
  <input type="hidden" name="csrf" value="x" />
  <input name="legacy" disabled="" />
  <input type="text" placeholder="no name" />
  <textarea name="notes" axag-parameter-description="Anything we should know"></textarea>
  <button type="submit">Create account</button>
</form>`;

const EXPECTED_REQUIRED = [
  { name: 'email', type: 'string', maxLength: 254, format: 'email', description: 'Work email', source: 'harvested:html' },
  { name: 'plan', type: 'string', enum: ['team', 'enterprise'], description: 'Plan', source: 'harvested:html' },
  { name: 'cycle', type: 'string', enum: ['monthly', 'yearly'], description: 'Billing cycle', source: 'harvested:html' },
  { name: 'terms', type: 'boolean', description: 'Accept terms', source: 'harvested:html' },
];
const EXPECTED_OPTIONAL = [
  { name: 'display_name', type: 'string', minLength: 2, pattern: '[a-z]+', description: 'Display name', source: 'harvested:html' },
  { name: 'seats', type: 'integer', min: 1, max: 500, description: 'Seats. You can add more later', source: 'harvested:html' },
  { name: 'budget', type: 'number', description: 'Budget', source: 'harvested:html' },
  { name: 'regions', type: 'array', items: { type: 'string', enum: ['eu', 'us'] }, description: 'Regions', source: 'harvested:html' },
  { name: 'start', type: 'string', format: 'date', description: 'Start date', source: 'harvested:html' },
  { name: 'notes', type: 'string', description: 'Anything we should know', source: 'harvested:html' },
];

const actionOf = (elements: AnnotatedElement[], intent: string) =>
  buildManifest(elements, { paths: ['.'] }).manifest.actions.find(a => a.intent === intent)!;

describe('harvesting from form controls', () => {
  it('maps HTML constraints, labels and groups to parameters', () => {
    const action = actionOf(extractHtml(SIGNUP, 's.html'), 'account.create');
    expect(action.required_parameters).toEqual(EXPECTED_REQUIRED);
    expect(action.optional_parameters).toEqual(EXPECTED_OPTIONAL);
  });

  it('reads the same parameters from JSX and the live DOM', () => {
    const jsx = SIGNUP.replace(/ for="/g, ' htmlFor="').replace('minlength', 'minLength').replace('maxlength', 'maxLength');
    const fromJsx = actionOf(extractJsx(`export const S = () => (${jsx});`, 's.tsx'), 'account.create');
    document.body.innerHTML = SIGNUP;
    const fromDom = actionOf(extractDom(document.body), 'account.create');

    for (const action of [fromJsx, fromDom]) {
      expect(action.required_parameters).toEqual(EXPECTED_REQUIRED);
      expect(action.optional_parameters).toEqual(EXPECTED_OPTIONAL);
    }
  });

  it('names radio groups by their legend or radiogroup label, not the first option', () => {
    const html = `<form axag="write:order.place">
      <fieldset><legend>Delivery speed</legend>
        <label><input type="radio" name="shipping" value="standard"> Standard</label>
        <label><input type="radio" name="shipping" value="express"> Express</label>
      </fieldset>
      <div role="radiogroup" aria-label="Wrapping"><label><input type="radio" name="wrap" value="yes"> Yes</label></div>
      <label><input type="radio" name="loose" value="a"> Only option label</label>
    </form>`;
    const action = actionOf(extractHtml(html, 'o.html'), 'order.place');
    expect(action.optional_parameters.map(p => [p.name, p.description])).toEqual([
      ['shipping', 'Delivery speed'],
      ['wrap', 'Wrapping'],
      ['loose', undefined],
    ]);
  });

  it('reports submitted controls without a name', () => {
    const [form] = extractHtml(SIGNUP, 's.html');
    expect(form.harvested?.unnamed).toEqual([{ tagName: 'input', line: 18, column: 3 }]);
  });

  it('uses the enclosing form for a submit button, and form="id" for controls outside it', () => {
    const html = `<form id="f"><input name="q" required=""><button axag="read:product.search">Go</button></form>
      <input name="sort" form="f" aria-label="Sort">`;
    const action = actionOf(extractHtml(html, 'p.html'), 'product.search');
    expect(action.required_parameters.map(p => p.name)).toEqual(['q']);
    expect(action.optional_parameters.map(p => p.name)).toEqual(['sort']);
  });

  it('follows axag-params-from for elements outside the form', () => {
    const html = `<form id="filters"><input name="status"></form>
      <a href="#" axag="read:order.list" axag-params-from="#filters">Apply</a>
      <button type="button" axag="read:order.export">Export</button>`;
    const elements = extractHtml(html, 'p.html');
    expect(actionOf(elements, 'order.list').optional_parameters.map(p => p.name)).toEqual(['status']);
    expect(actionOf(elements, 'order.export').optional_parameters).toEqual([]);
  });

  it('ignores dynamic JSX values', () => {
    const src = `const F = () => <form axag="write:a.b"><input name="x" required={isRequired} maxLength={max} /></form>;`;
    const action = actionOf(extractJsx(src, 'f.tsx'), 'a.b');
    expect(action.optional_parameters).toEqual([{ name: 'x', type: 'string', source: 'harvested:html' }]);
  });

  it('marks submit buttons and parameter forms covered by an annotation', () => {
    const html = `<form axag="write:a.b"><button>Save</button></form>
      <form id="f"><input name="q"></form><button form="f" axag="read:c.d">Go</button>
      <form><button>Unrelated</button></form>`;
    const all = extractHtml(html, 'p.html', { filter: el => ['form', 'button'].includes(el.tagName) });
    expect(all.map(e => [e.tagName, e.coveredBy])).toEqual([
      ['form', undefined],
      ['button', 'a.b'],
      ['form', 'c.d'],
      ['button', undefined],
      ['form', undefined],
      ['button', undefined],
    ]);
  });

  it('can be turned off', () => {
    const { manifest } = buildManifest(extractHtml(SIGNUP, 's.html'), { paths: ['.'], harvest: false });
    expect(manifest.actions[0].required_parameters).toEqual([]);
  });

  it('computes accessible names for annotated elements', () => {
    const html = `<button axag="read:a.one" aria-labelledby="l">x</button><span id="l">Named by label</span>
      <button axag="read:a.two"><img src="i.png" alt="Icon name"></button>
      <input type="submit" value="Send" axag="write:a.three">
      <button axag="read:a.four"></button>`;
    expect(extractHtml(html, 'p.html').map(e => e.accessibleName)).toEqual([
      'Named by label',
      'Icon name',
      'Send',
      undefined,
    ]);
  });
});

describe('precedence: declared > schema > harvested', () => {
  const html = `<form axag="write:user.invite" axag-required-parameters='["email",{"name":"role","type":"string","enum":["admin","member"]}]' axag-optional-parameters='["team"]'>
    <input name="email" type="email" aria-label="Email">
    <select name="role" required=""><option>owner</option></select>
    <input name="team" type="number" required="">
    <input name="note" aria-label="Note">
  </form>`;
  const binding: SchemaBinding = {
    source: 'zod',
    required: [{ name: 'team', type: 'string', description: 'Team slug', source: 'zod' }],
    optional: [
      { name: 'email', type: 'string', maxLength: 100, source: 'zod' },
      { name: 'expires_in', type: 'integer', min: 1, source: 'zod' },
    ],
    riskLevel: 'medium',
    description: 'Invite a user to the workspace',
  };

  it('keeps declared placement and fields, fills gaps from lower sources', () => {
    const [el] = extractHtml(html, 'i.html');
    const { manifest } = buildManifest([{ ...el, schemaBinding: binding }], { paths: ['.'] });
    const action = manifest.actions[0];

    expect(action.required_parameters).toEqual([
      // Declared by name only: type and constraints come from the schema, label from the markup.
      { name: 'email', type: 'string', maxLength: 100, format: 'email', description: 'Email' },
      // Declared with an enum: the harvested <option> list does not replace it.
      { name: 'role', type: 'string', enum: ['admin', 'member'] },
    ]);
    expect(action.optional_parameters).toEqual([
      // Declared optional by name: stays optional although schema and markup say required.
      { name: 'team', type: 'string', description: 'Team slug' },
      { name: 'expires_in', type: 'integer', min: 1, source: 'zod' },
      { name: 'note', type: 'string', description: 'Note', source: 'harvested:html' },
    ]);
    expect(action.risk_level).toBe('medium');
    expect(action.description).toBe('Invite a user to the workspace');
  });

  it('mergeParameters keeps a typed declaration’s type', () => {
    const merged = mergeParameters([
      { required: [{ name: 'n', type: 'string' }], optional: [] },
      { required: [], optional: [{ name: 'n', type: 'integer', min: 0, source: 'harvested:html' }] },
    ]);
    expect(merged).toEqual({ required: [{ name: 'n', type: 'string', min: 0 }], optional: [] });
  });
});

describe('jsonSchemaToParameters', () => {
  it('converts JSON Schema properties, nullable unions and formats', () => {
    expect(
      jsonSchemaToParameters(
        {
          type: 'object',
          required: ['id', 'when'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'User id' },
            when: { type: 'string', format: 'date-time' },
            site: { anyOf: [{ type: 'string', format: 'uri' }, { type: 'null' }] },
            level: { type: ['integer', 'null'], minimum: 1, maximum: 5, default: 3 },
            count: { type: 'integer', minimum: -9007199254740991, maximum: 9007199254740991 },
            kind: { const: 'invite' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        'openapi',
      ),
    ).toEqual({
      required: [
        { name: 'id', type: 'string', description: 'User id', format: 'uuid', source: 'openapi' },
        { name: 'when', type: 'string', format: 'datetime', source: 'openapi' },
      ],
      optional: [
        { name: 'site', type: 'string', format: 'url', source: 'openapi' },
        { name: 'level', type: 'integer', min: 1, max: 5, default: 3, source: 'openapi' },
        { name: 'count', type: 'integer', source: 'openapi' },
        { name: 'kind', type: 'string', enum: ['invite'], source: 'openapi' },
        { name: 'tags', type: 'array', items: { type: 'string' }, source: 'openapi' },
      ],
    });
  });
});
