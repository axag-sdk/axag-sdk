/**
 * Rewrite annotations between macro and longhand form, touching only the
 * axag attributes of each element and leaving the rest of the source as written.
 */

import { readAttributes } from './annotation.js';
import { MACRO_ATTRIBUTE, toMacro } from './macro.js';
import { ATTR, isAxagAttribute } from './vocabulary.js';
import { walk } from './tree.js';
import type { ElementTree } from './tree.js';

export type FormatMode = 'macro' | 'longhand';

export interface FormatSkip {
  line: number;
  reason: string;
}

export interface FormatResult {
  output: string;
  /** Elements whose attributes were rewritten. */
  changed: number;
  /** Annotated elements left untouched, and why. */
  skipped: FormatSkip[];
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

const CANONICAL_ORDER: string[] = [ATTR.macro, ...Object.values(ATTR).filter(name => name !== ATTR.macro)];

export function formatTree(source: string, tree: ElementTree, mode: FormatMode): FormatResult {
  const edits: Edit[] = [];
  const skipped: FormatSkip[] = [];
  let changed = 0;

  for (const node of walk(tree)) {
    const names = Object.keys(node.attributes).filter(name => name === MACRO_ATTRIBUTE || isAxagAttribute(name));
    if (names.length === 0 || !node.spans) continue;

    const { attributes, diagnostics } = readAttributes(node.attributes);
    if (!attributes[ATTR.intent]) continue;
    if (diagnostics.length > 0) {
      skipped.push({ line: node.line, reason: diagnostics[0].message });
      continue;
    }
    const dynamic = names.find(name => !node.spans![name]?.static);
    if (dynamic) {
      skipped.push({ line: node.line, reason: `${dynamic} is not a string literal` });
      continue;
    }

    let next: Record<string, string>;
    if (mode === 'longhand') {
      next = attributes;
    } else {
      const conversion = toMacro(attributes);
      if (!conversion) {
        skipped.push({ line: node.line, reason: 'intent or action type cannot be written as a macro' });
        continue;
      }
      next = { [MACRO_ATTRIBUTE]: conversion.macro, ...conversion.remaining };
    }

    const current = Object.fromEntries(names.map(name => [name, node.attributes[name]]));
    if (sameRecord(current, next)) continue;

    // Names already in the source keep their order; new ones follow in canonical order.
    const ordered = [
      ...names.filter(name => name in next),
      ...CANONICAL_ORDER.filter(name => name in next && !names.includes(name)),
      ...Object.keys(next).filter(name => !names.includes(name) && !CANONICAL_ORDER.includes(name)),
    ];
    if (mode === 'macro') ordered.sort((a, b) => Number(b === MACRO_ATTRIBUTE) - Number(a === MACRO_ATTRIBUTE));

    const spans = names.map(name => node.spans![name]).sort((a, b) => a.start - b.start);
    const leadStart = whitespaceStart(source, spans[0].start);
    const lead = source.slice(leadStart, spans[0].start);
    const separator = lead.includes('\n') ? lead.slice(lead.lastIndexOf('\n')) : ' ';
    // Attributes that keep their value are copied verbatim, preserving quotes and entities.
    const text = (name: string) =>
      current[name] === next[name] ? source.slice(node.spans![name].start, node.spans![name].end) : serialize(name, next[name]);
    const block = ordered.map(name => separator + text(name)).join('');

    // The first span is replaced by the whole new block; the rest are removed with their leading whitespace.
    spans.forEach((span, i) => {
      edits.push({ start: whitespaceStart(source, span.start), end: span.end, text: i === 0 ? block : '' });
    });
    changed++;
  }

  edits.sort((a, b) => b.start - a.start);
  let output = source;
  for (const edit of edits) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  return { output, changed, skipped };
}

function whitespaceStart(source: string, offset: number): number {
  let i = offset;
  while (i > 0 && /\s/.test(source[i - 1])) i--;
  return i;
}

/** JSON values keep the single-quote convention (`axag-roles='["a"]'`). */
function serialize(name: string, value: string): string {
  if (value.includes('"') && !value.includes("'")) return `${name}='${value}'`;
  return `${name}="${value.replace(/"/g, '&quot;')}"`;
}

function sameRecord(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
}
