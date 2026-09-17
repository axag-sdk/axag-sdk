/**
 * @web-axag/schema-zod — turn a Zod 4 object schema into AXAG action parameters,
 * so forms and APIs share one definition instead of re-declaring it in attributes.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';
import { toJSONSchema } from 'zod';
import type { ZodType } from 'zod';
import { jsonSchemaToParameters } from '@web-axag/core';
import type { SchemaBinding } from '@web-axag/core';

/** Convert a Zod object schema. Uses the input side, which is what an agent sends. */
export function zodToBinding(schema: unknown): SchemaBinding {
  if (!schema || typeof schema !== 'object' || !('_zod' in schema)) {
    throw new Error('Expected a Zod 4 schema. Zod 3 schemas are not supported; upgrade to zod@4 or import from "zod/v4".');
  }
  const json = toJSONSchema(schema as ZodType, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>;
  if (json.type !== 'object' || !json.properties) {
    throw new Error(`Expected a z.object() schema, got JSON Schema type "${String(json.type)}"`);
  }
  const { required, optional } = jsonSchemaToParameters(json, 'zod');
  const binding: SchemaBinding = { source: 'zod', required, optional };
  if (typeof json.description === 'string') binding.description = json.description;
  return binding;
}

/**
 * Load `exportName` from a .ts/.js module and convert it. TypeScript is
 * transpiled on the fly, so schemas can be imported straight from app code.
 */
export async function loadZodBinding(file: string, exportName: string, cwd = process.cwd()): Promise<SchemaBinding> {
  const absolute = path.resolve(cwd, file);
  const jiti = createJiti(pathToFileURL(absolute).href, { interopDefault: false });
  const module = (await jiti.import(absolute)) as Record<string, unknown>;
  const schema = module[exportName];
  if (schema === undefined) {
    const available = Object.keys(module).join(', ') || 'none';
    throw new Error(`${file} has no export "${exportName}" (exports: ${available})`);
  }
  return zodToBinding(schema);
}
