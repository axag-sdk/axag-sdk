/**
 * Vue single-file components — read the `<template>` block into an element tree.
 * Requires the optional peer dependency `@vue/compiler-sfc`.
 */

import { appendChild, createNode } from '@axag/core';
import type { ElementNode, ElementTree } from '@axag/core';

/* Node and prop kinds from @vue/compiler-core, duck-typed so the dependency stays optional. */
const ELEMENT = 1;
const TEXT = 2;
const ATTRIBUTE = 6;
const DIRECTIVE = 7;

interface VueLocation {
  start: { line: number; column: number; offset: number };
  end: { offset: number };
}
interface VueProp {
  type: number;
  name: string;
  value?: { content: string };
  /** Directives: `:axag="spec"` arrives as name "bind" with arg "axag". */
  arg?: { content?: string };
  loc: VueLocation;
}
interface VueNode {
  type: number;
  tag?: string;
  props?: VueProp[];
  children?: VueNode[];
  content?: string;
  loc: VueLocation;
}

export async function parseVueTree(source: string, filePath: string): Promise<ElementTree> {
  const { parse } = await import('@vue/compiler-sfc');
  const tree: ElementTree = { filePath, roots: [] };

  const { descriptor } = parse(source, { filename: filePath });
  const root = descriptor.template?.ast as unknown as VueNode | undefined;
  if (!root) return tree;

  const visit = (nodes: VueNode[], parent: ElementNode | null): void => {
    for (const node of nodes) {
      if (node.type === TEXT) {
        if (parent) parent.ownText += node.content ?? '';
        continue;
      }
      if (node.type !== ELEMENT || !node.tag) continue;

      const attributes: Record<string, string> = {};
      const spans: ElementNode['spans'] = {};
      for (const prop of node.props ?? []) {
        if (prop.type === ATTRIBUTE) {
          attributes[prop.name] = prop.value?.content ?? '';
          spans[prop.name] = { start: prop.loc.start.offset, end: prop.loc.end.offset, static: true };
        } else if (prop.type === DIRECTIVE && prop.name === 'bind' && prop.arg?.content) {
          // A bound value is only known at runtime.
          attributes[prop.arg.content] = '';
          spans[prop.arg.content] = { start: prop.loc.start.offset, end: prop.loc.end.offset, static: false };
        }
      }

      const element = createNode({
        tagName: node.tag.toLowerCase(),
        attributes,
        line: node.loc.start.line,
        column: node.loc.start.column,
        spans,
      });
      if (parent) appendChild(parent, element);
      else tree.roots.push(element);
      visit(node.children ?? [], element);
    }
  };

  visit(root.children ?? [], null);
  return tree;
}
