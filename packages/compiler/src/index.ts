/**
 * @axag/compiler — read annotations from source files at build time and produce
 * the Semantic Manifest and the tools an agent runtime registers.
 *
 * The same reader the CLI uses runs here, so a manifest built by a bundler
 * plugin and one built by `axag-cli` are identical for the same sources.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { buildManifest, generateToolRegistry, toWebMcpTool, walk } from '@axag/core';
import type {
  AnnotatedElement,
  CoreDiagnostic,
  DynamicAction,
  ElementTree,
  Manifest,
  ToolRegistry,
  WebMcpTool,
} from '@axag/core';
import { parseHtmlTree } from '@axag/core/html';
import { parseJsxTree } from '@axag/core/jsx';
import { hasIntent, normalizeAttributes, selectElements } from '@axag/core';
import { SpecResolver } from './spec-resolver.js';
import { parseVueTree } from './vue.js';
import { parseAngularTree } from './angular.js';

export { SpecResolver } from './spec-resolver.js';
export { parseVueTree } from './vue.js';
export { parseAngularTree } from './angular.js';

export const DEFAULT_INCLUDE = ['**/*.{html,htm,jsx,tsx,vue}'];
export const DEFAULT_EXCLUDE = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/.next/**'];

export interface CompileOptions {
  /** Directory globs resolve from, and the base for reported paths. */
  root: string;
  include?: string[];
  exclude?: string[];
  /** Compile these files instead of globbing. */
  files?: string[];
  /** Add parameters harvested from form markup (default true). */
  harvest?: boolean;
  /** Treat these files as Angular templates. `**\/*.component.html` always is. */
  angular?: string[];
  /**
   * Attach Zod or OpenAPI bindings before the manifest is built. axag-cli passes
   * its own resolver here so bindings work the same from a bundler and the CLI.
   */
  resolveBindings?: (elements: AnnotatedElement[]) => Promise<{ elements: AnnotatedElement[]; diagnostics: CoreDiagnostic[] }>;
  url?: string;
  tool?: string;
  toolVersion?: string;
  generatedAt?: string;
}

export interface CompileResult {
  manifest: Manifest;
  registry: ToolRegistry;
  /** The registry's tools in the shape `navigator.modelContext.registerTool` takes. */
  webmcpTools: WebMcpTool[];
  diagnostics: CoreDiagnostic[];
  /** Files that were read, relative to `root`. */
  files: string[];
}

const ANGULAR_TEMPLATE = /\.component\.html$/;

export async function compile(options: CompileOptions): Promise<CompileResult> {
  const root = path.resolve(options.root);
  const files = options.files
    ? options.files.map(file => path.resolve(root, file))
    : (await fg(options.include ?? DEFAULT_INCLUDE, {
        cwd: root,
        ignore: options.exclude ?? DEFAULT_EXCLUDE,
        absolute: true,
      })).sort();

  const resolver = new SpecResolver();
  const elements: AnnotatedElement[] = [];
  const dynamicActions: DynamicAction[] = [];
  const read: string[] = [];

  for (const file of files) {
    const relative = path.relative(root, file);
    let source: string;
    try {
      source = await fs.readFile(file, 'utf-8');
    } catch {
      continue;
    }

    const tree = await parseTree(source, file, relative, options, resolver);
    if (!tree) continue;

    read.push(relative);
    elements.push(...selectElements(tree, el => hasIntent(el.allAttributes)));
    dynamicActions.push(...findDynamicActions(tree));
  }

  const bound = options.resolveBindings ? await options.resolveBindings(elements) : undefined;
  const { manifest, diagnostics } = buildManifest(bound?.elements ?? elements, {
    paths: [root],
    url: options.url,
    tool: options.tool ?? '@axag/compiler',
    toolVersion: options.toolVersion,
    generatedAt: options.generatedAt,
    harvest: options.harvest,
    dynamicActions,
  });

  const registry = generateToolRegistry(manifest, options.url ?? 'axag-manifest.json');
  return {
    manifest,
    registry,
    webmcpTools: registry.tools.map(toWebMcpTool),
    diagnostics: [...(bound?.diagnostics ?? []), ...diagnostics],
    files: read,
  };
}

async function parseTree(
  source: string,
  file: string,
  relative: string,
  options: CompileOptions,
  resolver: SpecResolver,
): Promise<ElementTree | undefined> {
  const extension = path.extname(file).toLowerCase();
  if (extension === '.vue') return parseVueTree(source, relative);
  if (extension === '.jsx' || extension === '.tsx') {
    return parseJsxTree(source, relative, {
      resolveSpec: expression => resolver.resolve(expression, file),
    });
  }
  if (extension === '.html' || extension === '.htm') {
    return isAngularTemplate(file, options) ? parseAngularTree(source, relative) : parseHtmlTree(source, relative);
  }
  return undefined;
}

function isAngularTemplate(file: string, options: CompileOptions): boolean {
  if (ANGULAR_TEMPLATE.test(file)) return true;
  return (options.angular ?? []).some(pattern => fg.sync(pattern, { cwd: options.root, absolute: true }).includes(file));
}

/** Elements whose `axag` value the build couldn't read; the runtime registers these. */
function findDynamicActions(tree: ElementTree): DynamicAction[] {
  const dynamic: DynamicAction[] = [];
  for (const node of walk(tree)) {
    const span = node.spans?.axag;
    if (!span || span.static) continue;
    if (hasIntent(normalizeAttributes(node.attributes))) continue;
    dynamic.push({
      source_file: tree.filePath,
      source_line: node.line,
      reason: `<${node.tagName}> has a dynamic axag value that could not be read at build time`,
    });
  }
  return dynamic;
}
