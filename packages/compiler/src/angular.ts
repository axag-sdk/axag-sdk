/**
 * Angular component templates — read a template into an element tree.
 * Requires the optional peer dependency `@angular/compiler`.
 */

import { appendChild, createNode } from '@web-axag/core';
import type { ElementNode, ElementTree } from '@web-axag/core';

/* Duck-typed TmplAst nodes, so @angular/compiler stays an optional dependency. */
interface AngularSpan {
  start: { line: number; col: number; offset: number };
  end: { offset: number };
}
interface AngularAttribute {
  name: string;
  value?: string;
  sourceSpan: AngularSpan;
}
interface AngularNode {
  name?: string;
  value?: string;
  attributes?: AngularAttribute[];
  inputs?: AngularAttribute[];
  children?: AngularNode[];
  startSourceSpan?: AngularSpan;
  sourceSpan?: AngularSpan;
}

export async function parseAngularTree(source: string, filePath: string): Promise<ElementTree> {
  const { parseTemplate } = await import('@angular/compiler');
  const tree: ElementTree = { filePath, roots: [] };

  const parsed = parseTemplate(source, filePath, { preserveWhitespaces: true });
  if (parsed.errors?.length) return tree;

  const visit = (nodes: AngularNode[], parent: ElementNode | null): void => {
    for (const node of nodes) {
      // Text nodes carry `value` and no tag name.
      if (node.name === undefined) {
        if (parent && typeof node.value === 'string') parent.ownText += node.value;
        continue;
      }

      const attributes: Record<string, string> = {};
      const spans: ElementNode['spans'] = {};
      for (const attribute of node.attributes ?? []) {
        attributes[attribute.name] = attribute.value ?? '';
        spans[attribute.name] = { start: attribute.sourceSpan.start.offset, end: attribute.sourceSpan.end.offset, static: true };
      }
      // `[axag]="spec"` is bound and only known at runtime.
      for (const input of node.inputs ?? []) {
        attributes[input.name] = '';
        spans[input.name] = { start: input.sourceSpan.start.offset, end: input.sourceSpan.end.offset, static: false };
      }

      const span = node.startSourceSpan ?? node.sourceSpan;
      const element = createNode({
        tagName: node.name.toLowerCase(),
        attributes,
        // Angular reports 0-based lines and columns.
        line: (span?.start.line ?? 0) + 1,
        column: (span?.start.col ?? 0) + 1,
        spans,
      });
      if (parent) appendChild(parent, element);
      else tree.roots.push(element);
      visit(node.children ?? [], element);
    }
  };

  visit(parsed.nodes as AngularNode[], null);
  return tree;
}
