/**
 * Schema bindings — attach parameters from Zod schemas or OpenAPI operations
 * to annotated elements before the manifest is built.
 */

import path from 'node:path';
import { ATTR } from '@web-axag/core';
import type { CoreDiagnostic, ManifestSourceElement, SchemaBinding } from '@web-axag/core';

export interface BindingOptions {
  /** Intent → ref, from `bindings` in axag.config. */
  bindings?: Record<string, string>;
  /** Default OpenAPI document for `openapi:<operationId>` refs. */
  openapi?: string;
  /** Directory relative paths resolve from. */
  rootDir: string;
}

export type BindingRef =
  | { kind: 'zod'; file: string; exportName: string }
  | { kind: 'openapi'; file: string; operationId: string };

/**
 * `zod:<file>#<export>` (export defaults to `default`),
 * `openapi:<file>#<operationId>` or `openapi:<operationId>` with a default document.
 */
export function parseBindingRef(ref: string, defaultOpenApi?: string): BindingRef {
  const colon = ref.indexOf(':');
  const kind = ref.slice(0, colon);
  const rest = ref.slice(colon + 1);
  const hash = rest.lastIndexOf('#');

  if (kind === 'zod') {
    if (!rest) throw new Error(`Binding "${ref}" needs a file: zod:./schemas/user.ts#InviteUser`);
    return hash < 0
      ? { kind, file: rest, exportName: 'default' }
      : { kind, file: rest.slice(0, hash), exportName: rest.slice(hash + 1) };
  }
  if (kind === 'openapi') {
    if (hash >= 0) return { kind, file: rest.slice(0, hash), operationId: rest.slice(hash + 1) };
    if (!defaultOpenApi) {
      throw new Error(`Binding "${ref}" names no OpenAPI file; set "openapi" in axag.config or use openapi:<file>#${rest}`);
    }
    return { kind, file: defaultOpenApi, operationId: rest };
  }
  throw new Error(`Binding "${ref}" must start with zod: or openapi:`);
}

export async function resolveBindings<T extends ManifestSourceElement>(
  elements: T[],
  options: BindingOptions,
): Promise<{ elements: T[]; diagnostics: CoreDiagnostic[] }> {
  const diagnostics: CoreDiagnostic[] = [];
  const cache = new Map<string, Promise<SchemaBinding>>();

  const load = (ref: BindingRef): Promise<SchemaBinding> => {
    const file = path.resolve(options.rootDir, ref.file);
    const key = `${ref.kind}:${file}#${ref.kind === 'zod' ? ref.exportName : ref.operationId}`;
    if (!cache.has(key)) {
      cache.set(
        key,
        ref.kind === 'zod'
          ? import('@web-axag/schema-zod').then(m => m.loadZodBinding(file, ref.exportName))
          : import('@web-axag/schema-openapi').then(m => m.loadOpenApiBinding(file, ref.operationId)),
      );
    }
    return cache.get(key)!;
  };

  const resolved = await Promise.all(
    elements.map(async el => {
      const intent = el.attributes[ATTR.intent];
      const ref = el.attributes[ATTR.schema] ?? (intent ? options.bindings?.[intent] : undefined);
      if (!ref) return el;
      try {
        return { ...el, schemaBinding: await load(parseBindingRef(ref, options.openapi)) };
      } catch (err) {
        diagnostics.push({
          code: 'AXAG-CORE-006',
          severity: 'warning',
          filePath: el.filePath,
          line: el.line,
          message: `Could not load schema binding "${ref}": ${(err as Error).message}`,
        });
        return el;
      }
    }),
  );

  return { elements: resolved, diagnostics };
}
