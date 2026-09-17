// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { ancestors, buildManifest, findById, selectElements, textContent, walk } from '../src/index.js';
import type { ElementNode, ElementTree } from '../src/index.js';
import { parseHtmlTree } from '../src/adapters/html.js';
import { parseJsxTree } from '../src/adapters/jsx.js';
import { readDomTree } from '../src/adapters/dom.js';

// Valid as both HTML and JSX; no valueless attributes (HTML reads them as '', JSX as 'true').
const FORM = `<form id="lead" axag-intent="lead.create" axag-action-type="write">
  <label id="name-label">Full <b>name</b></label>
  <input id="name" name="name" aria-labelledby="name-label" />
  <fieldset>
    <legend>Contact</legend>
    <input name="email" type="email" />
  </fieldset>
  <button type="submit">Create lead</button>
</form>`;

type Shape = { tag: string; attrs: Record<string, string>; text: string; children: Shape[] };
const shape = (n: ElementNode): Shape => ({
  tag: n.tagName,
  attrs: n.attributes,
  text: n.ownText.replace(/\s+/g, ' ').trim(),
  children: n.children.map(shape),
});
const formOf = (tree: ElementTree) => [...walk(tree)].find(n => n.tagName === 'form')!;

describe('element trees', () => {
  it('have the same shape from HTML, JSX and the DOM', () => {
    const html = parseHtmlTree(FORM, 'f.html');
    const jsx = parseJsxTree(`export const F = () => (${FORM});`, 'f.tsx');
    document.body.innerHTML = FORM;
    const dom = readDomTree(document.body);

    expect(shape(formOf(jsx))).toEqual(shape(formOf(html)));
    expect(shape(formOf(dom))).toEqual(shape(formOf(html)));
  });

  it('link parents, resolve ids and collect text', () => {
    const tree = parseHtmlTree(FORM, 'f.html');
    const email = [...walk(tree)].find(n => n.attributes.name === 'email')!;

    expect([...ancestors(email)].map(n => n.tagName)).toEqual(['fieldset', 'form', 'body', 'html']);
    expect(textContent(findById(tree, 'name-label')!)).toBe('Full name');
    expect(textContent(formOf(tree))).toBe('Full name Contact Create lead');
  });

  it('attach JSX inside expressions to the enclosing element and see through fragments', () => {
    const src = `const List = ({ items, open }) => (
      <ul id="list">
        <>{items.map(i => <li key={i}>{i}</li>)}</>
        {open && <li id="extra">More</li>}
      </ul>
    );`;
    const tree = parseJsxTree(src, 'l.tsx');
    expect(tree.roots.map(r => r.tagName)).toEqual(['ul']);
    expect(tree.roots[0].children.map(c => c.attributes.id ?? c.attributes.key)).toEqual(['', 'extra']);
    expect(findById(tree, 'extra')!.parent!.attributes.id).toBe('list');
  });

  it('keep separate top-level JSX elements as separate roots', () => {
    const tree = parseJsxTree('const A = () => <a href="/a" />;\nconst B = () => <b />;', 'x.tsx');
    expect(tree.roots.map(r => [r.tagName, r.line])).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('return an empty tree for unparseable JSX', () => {
    expect(parseJsxTree('const = <', 'bad.tsx').roots).toEqual([]);
  });
});

describe('context inheritance', () => {
  const SECTION = `<section axag-scope="tenant" axag-tenant-boundary="strict" axag-required-roles='["admin"]'>
  <div>
    <button axag-intent="user.create" axag-entity="user" axag-action-type="write">Add User</button>
    <button axag-intent="user.delete" axag-entity="user" axag-action-type="delete" axag-required-roles='["super_admin"]'>Delete User</button>
  </div>
</section>
<button axag-intent="help.search" axag-entity="help" axag-action-type="read">Help</button>`;

  const read = (tree: ElementTree) =>
    Object.fromEntries(
      selectElements(tree, el => Boolean(el.allAttributes['axag-intent'])).map(el => [el.attributes['axag-intent'], el]),
    );

  it('passes scope, tenant boundary and roles to annotations inside a container', () => {
    const byIntent = read(parseHtmlTree(SECTION, 'page.html'));
    expect(byIntent['user.create'].attributes).toMatchObject({
      'axag-scope': 'tenant',
      'axag-tenant-boundary': 'strict',
      'axag-required-roles': '["admin"]',
    });
    expect(byIntent['user.create'].inherited).toEqual(['axag-scope', 'axag-tenant-boundary', 'axag-required-roles']);
  });

  it("keeps an element's own value", () => {
    const byIntent = read(parseHtmlTree(SECTION, 'page.html'));
    expect(byIntent['user.delete'].attributes['axag-required-roles']).toBe('["super_admin"]');
    expect(byIntent['user.delete'].inherited).toEqual(['axag-scope', 'axag-tenant-boundary']);
  });

  it('leaves annotations outside the container alone', () => {
    const byIntent = read(parseHtmlTree(SECTION, 'page.html'));
    expect(byIntent['help.search'].attributes['axag-scope']).toBeUndefined();
    expect(byIntent['help.search'].inherited).toBeUndefined();
  });

  it('works the same from JSX and the DOM', () => {
    const jsx = read(parseJsxTree(`<>${SECTION}</>`, 'Page.tsx'));
    expect(jsx['user.create'].attributes['axag-scope']).toBe('tenant');

    document.body.innerHTML = SECTION;
    const dom = read(readDomTree(document.body));
    expect(dom['user.create'].attributes['axag-tenant-boundary']).toBe('strict');
  });

  it('reaches the manifest', () => {
    const elements = selectElements(parseHtmlTree(SECTION, 'page.html'), el => Boolean(el.allAttributes['axag-intent']));
    const { manifest } = buildManifest(elements, { paths: [] });
    const create = manifest.actions.find(a => a.intent === 'user.create')!;
    expect(create).toMatchObject({ scope: 'tenant', tenant_boundary: 'strict', required_roles: ['admin'] });
  });
});
