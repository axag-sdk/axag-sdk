// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { buildManifest } from '../src/index.js';
import type { AnnotatedElement } from '../src/index.js';
import { extractHtml } from '../src/adapters/html.js';
import { extractJsx } from '../src/adapters/jsx.js';
import { extractDom, selectorFor } from '../src/adapters/dom.js';
import { corpus } from './fixtures/corpus.js';

const actionsOf = (elements: AnnotatedElement[]) =>
  buildManifest(elements, { paths: ['.'] }).manifest.actions.map(
    ({ source_file: _f, source_line: _l, element_selector: _s, ...rest }) => rest,
  );

describe('adapters agree on every corpus snippet', () => {
  it.each(Object.entries(corpus))('%s', (_name, snippet) => {
    const fromHtml = extractHtml(snippet, 'x.html');
    const fromJsx = extractJsx(`export const X = () => (<>${snippet}</>);`, 'x.tsx');
    document.body.innerHTML = snippet;
    const fromDom = extractDom(document.body);

    expect(fromHtml).toHaveLength(1);
    expect(fromJsx.map(e => e.attributes)).toEqual(fromHtml.map(e => e.attributes));
    expect(fromDom.map(e => e.attributes)).toEqual(fromHtml.map(e => e.attributes));
    expect(actionsOf(fromJsx)).toEqual(actionsOf(fromHtml));
    expect(actionsOf(fromDom)).toEqual(actionsOf(fromHtml));
  });
});

describe('source locations', () => {
  it('reports the real line of identical elements in HTML', () => {
    const html = ['<main>', '  <button axag-intent="a.b">Go</button>', '', '  <button axag-intent="a.b">Go</button>', '</main>'].join('\n');
    expect(extractHtml(html, 'p.html').map(e => [e.line, e.column])).toEqual([
      [2, 3],
      [4, 3],
    ]);
  });

  it('reports 1-based columns in JSX', () => {
    const [el] = extractJsx('const X = () => (\n    <button axag-intent="a.b" />\n);', 'x.tsx');
    expect([el.line, el.column]).toEqual([2, 5]);
  });

  it('builds selectors for DOM elements', () => {
    document.body.innerHTML = '<section id="admin"><div><button>a</button><button axag-intent="a.b">b</button></div></section>';
    const [el] = extractDom(document);
    expect(el.selector).toBe('#admin > div > button:nth-of-type(2)');
    expect(document.querySelector(el.selector!)).toBe(document.querySelectorAll('button')[1]);
    expect(selectorFor(document.body)).toBe('html > body');
  });
});

describe('filters', () => {
  it('let callers include unannotated interactive elements', () => {
    const html = '<button>Plain</button><div>no</div><a href="/x" axag-intent="x.open">X</a>';
    const els = extractHtml(html, 'p.html', { filter: el => el.tagName === 'button' || el.tagName === 'a' });
    expect(els.map(e => [e.tagName, e.attributes])).toEqual([
      ['button', {}],
      ['a', { 'axag-intent': 'x.open' }],
    ]);
  });

  it('ignore dynamic JSX expressions', () => {
    const [el] = extractJsx('<button axag-intent="a.b" axag-risk-level={risk} />', 'x.tsx');
    expect(el.attributes).toEqual({ 'axag-intent': 'a.b', 'axag-risk-level': '' });
  });
});
