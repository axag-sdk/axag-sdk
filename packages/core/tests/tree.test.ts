// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { ancestors, findById, textContent, walk } from '../src/index.js';
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
