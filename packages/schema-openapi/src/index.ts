/**
 * @axag/schema-openapi — read an OpenAPI 3.0/3.1 operation's parameters and
 * JSON request body as AXAG action parameters.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { RISK_LEVELS, jsonSchemaToParameter, jsonSchemaToParameters, mergeParameters } from '@axag/core';
import type { ManifestParameter, RiskLevel, SchemaBinding } from '@axag/core';

type Json = Record<string, unknown>;

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

export async function loadOpenApiDocument(file: string, cwd = process.cwd()): Promise<Json> {
  const text = await fs.readFile(path.resolve(cwd, file), 'utf-8');
  return (/\.json$/i.test(file) ? JSON.parse(text) : parseYaml(text)) as Json;
}

export async function loadOpenApiBinding(file: string, operationId: string, cwd = process.cwd()): Promise<SchemaBinding> {
  return openApiToBinding(await loadOpenApiDocument(file, cwd), operationId);
}

/**
 * Path and query parameters plus the properties of an `application/json`
 * request body. Header and cookie parameters are left out: agents don't set them.
 */
export function openApiToBinding(document: Json, operationId: string): SchemaBinding {
  const found = findOperation(document, operationId);
  if (!found) throw new Error(`OpenAPI operation "${operationId}" not found`);
  const { operation, pathItem } = found;

  const fromParameters: { required: ManifestParameter[]; optional: ManifestParameter[] } = { required: [], optional: [] };
  const seen = new Set<string>();
  // Operation-level parameters override path-level ones with the same name and location.
  for (const raw of [...asArray(operation.parameters), ...asArray(pathItem.parameters)]) {
    const parameter = resolve(document, raw);
    if (parameter.in !== 'path' && parameter.in !== 'query') continue;
    const key = `${parameter.in}:${parameter.name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const schema = resolveDeep(document, (parameter.schema ?? {}) as Json);
    if (typeof parameter.description === 'string' && schema.description === undefined) {
      schema.description = parameter.description;
    }
    const param = jsonSchemaToParameter(String(parameter.name), schema, 'openapi');
    (parameter.required === true || parameter.in === 'path' ? fromParameters.required : fromParameters.optional).push(param);
  }

  let fromBody = { required: [] as ManifestParameter[], optional: [] as ManifestParameter[] };
  const body = operation.requestBody ? resolve(document, operation.requestBody) : undefined;
  const bodySchema = (body?.content as Json | undefined)?.['application/json'] as Json | undefined;
  if (bodySchema?.schema) {
    const schema = resolveDeep(document, bodySchema.schema as Json);
    fromBody = jsonSchemaToParameters(flattenAllOf(schema), 'openapi');
    if (body?.required !== true) {
      fromBody = { required: [], optional: [...fromBody.required, ...fromBody.optional] };
    }
  }

  const binding: SchemaBinding = { source: 'openapi', ...mergeParameters([fromParameters, fromBody]) };
  const risk = operation['x-axag-risk-level'];
  if (typeof risk === 'string' && (RISK_LEVELS as readonly string[]).includes(risk)) binding.riskLevel = risk as RiskLevel;
  const description = operation.summary ?? operation.description;
  if (typeof description === 'string') binding.description = description;
  return binding;
}

function findOperation(document: Json, operationId: string): { operation: Json; pathItem: Json } | undefined {
  for (const pathItem of Object.values((document.paths ?? {}) as Record<string, Json>)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as Json | undefined;
      if (operation?.operationId === operationId) return { operation, pathItem };
    }
  }
  return undefined;
}

function asArray(value: unknown): Json[] {
  return Array.isArray(value) ? (value as Json[]) : [];
}

/** Resolve a single local `$ref` (`#/components/...`). */
function resolve(document: Json, value: unknown): Json {
  let current = value as Json;
  const visited = new Set<string>();
  while (current && typeof current.$ref === 'string') {
    const ref = current.$ref;
    if (!ref.startsWith('#/')) throw new Error(`Only local $refs are supported, got "${ref}"`);
    if (visited.has(ref)) throw new Error(`Circular $ref "${ref}"`);
    visited.add(ref);
    current = ref
      .slice(2)
      .split('/')
      .map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'))
      .reduce<unknown>((node, part) => (node as Json | undefined)?.[part], document) as Json;
    if (current === undefined) throw new Error(`$ref "${ref}" does not resolve`);
  }
  return current;
}

/** Resolve `$ref`s throughout a schema; recursive references are cut off rather than expanded forever. */
function resolveDeep(document: Json, schema: Json, stack: string[] = []): Json {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(item => resolveDeep(document, item as Json, stack)) as unknown as Json;
  if (typeof schema.$ref === 'string') {
    if (stack.includes(schema.$ref)) return {};
    return resolveDeep(document, resolve(document, schema), [...stack, schema.$ref]);
  }
  const out: Json = {};
  for (const [key, value] of Object.entries(schema)) {
    out[key] = value && typeof value === 'object' ? resolveDeep(document, value as Json, stack) : value;
  }
  return out;
}

/** Merge `allOf` object schemas into one set of properties. */
function flattenAllOf(schema: Json): Json {
  if (!Array.isArray(schema.allOf)) return schema;
  const properties: Json = { ...((schema.properties as Json) ?? {}) };
  const required = new Set((schema.required as string[]) ?? []);
  for (const part of schema.allOf as Json[]) {
    const flat = flattenAllOf(part);
    Object.assign(properties, (flat.properties as Json) ?? {});
    for (const name of (flat.required as string[]) ?? []) required.add(name);
  }
  return { type: 'object', properties, required: [...required] };
}
