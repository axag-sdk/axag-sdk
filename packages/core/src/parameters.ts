/**
 * Parameter sources and how they combine.
 *
 * Precedence, highest first: parameters declared on the annotation, then a
 * bound schema (Zod or OpenAPI), then parameters harvested from the markup.
 * A higher source decides whether a parameter is required and keeps every
 * field it sets; lower sources only fill fields it left out. A parameter
 * declared by name alone (`'["query"]'`) has no type of its own, so its type
 * also comes from a lower source when one exists.
 */

import { PARAMETER_FORMATS } from './vocabulary.js';
import type { RiskLevel } from './vocabulary.js';
import type { ManifestParameter, ParameterSource } from './types.js';

export interface ParameterSet {
  required: ManifestParameter[];
  optional: ManifestParameter[];
}

/** What a Zod or OpenAPI binding contributes to an action. */
export interface SchemaBinding extends ParameterSet {
  source: 'zod' | 'openapi';
  /** OpenAPI `x-axag-risk-level`; used only when the annotation declares no risk level. */
  riskLevel?: RiskLevel;
  /** Used only when the annotation declares no description. */
  description?: string;
}

interface Layer extends ParameterSet {
  /** Names declared without a type (`"query"` rather than `{"name":"query",...}`). */
  nameOnly?: Set<string>;
}

const FILLABLE: (keyof ManifestParameter)[] = [
  'description', 'enum', 'min', 'max', 'minLength', 'maxLength', 'pattern', 'format', 'default', 'items', 'properties',
];

export function mergeParameters(layers: Layer[]): ParameterSet {
  const merged = new Map<string, { param: ManifestParameter; required: boolean; nameOnly: boolean }>();
  const order: string[] = [];

  for (const layer of layers) {
    for (const [list, required] of [[layer.required, true], [layer.optional, false]] as const) {
      for (const param of list) {
        const existing = merged.get(param.name);
        if (!existing) {
          merged.set(param.name, {
            param: { ...param },
            required,
            nameOnly: layer.nameOnly?.has(param.name) ?? false,
          });
          order.push(param.name);
          continue;
        }

        const target = existing.param;
        if (existing.nameOnly) {
          target.type = param.type;
          existing.nameOnly = layer.nameOnly?.has(param.name) ?? false;
        }
        for (const key of FILLABLE) {
          if (target[key] === undefined && param[key] !== undefined) {
            (target as unknown as Record<string, unknown>)[key] = param[key];
          }
        }
      }
    }
  }

  const result: ParameterSet = { required: [], optional: [] };
  for (const name of order) {
    const { param, required } = merged.get(name)!;
    (required ? result.required : result.optional).push(param);
  }
  return result;
}

/** Names in a JSON parameter attribute that were written as bare strings. */
export function nameOnlyParameters(...rawAttributes: (string | undefined)[]): Set<string> {
  const names = new Set<string>();
  for (const raw of rawAttributes) {
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) for (const item of parsed) if (typeof item === 'string') names.add(item);
    } catch {
      /* reported elsewhere */
    }
  }
  return names;
}

type JsonSchema = Record<string, unknown>;

const JSON_SCHEMA_FORMATS: Record<string, string> = { uri: 'url', 'date-time': 'datetime' };

/** Convert an object JSON Schema (Zod output, an OpenAPI body) into parameters. */
export function jsonSchemaToParameters(schema: JsonSchema, source: ParameterSource): ParameterSet {
  const result: ParameterSet = { required: [], optional: [] };
  const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set((schema.required as string[] | undefined) ?? []);
  for (const [name, property] of Object.entries(properties)) {
    const param = jsonSchemaToParameter(name, property, source);
    (required.has(name) ? result.required : result.optional).push(param);
  }
  return result;
}

export function jsonSchemaToParameter(name: string, input: JsonSchema, source: ParameterSource): ManifestParameter {
  const schema = unwrapNullable(input);
  const param: ManifestParameter = { name, type: schemaType(schema) };

  if (typeof schema.description === 'string') param.description = schema.description;
  if (Array.isArray(schema.enum)) param.enum = schema.enum;
  else if (schema.const !== undefined) param.enum = [schema.const];
  // Zod's .int() emits ±Number.MAX_SAFE_INTEGER bounds; they carry no meaning for an agent.
  if (typeof schema.minimum === 'number' && schema.minimum > Number.MIN_SAFE_INTEGER) param.min = schema.minimum;
  if (typeof schema.maximum === 'number' && schema.maximum < Number.MAX_SAFE_INTEGER) param.max = schema.maximum;
  if (typeof schema.minLength === 'number') param.minLength = schema.minLength;
  if (typeof schema.maxLength === 'number') param.maxLength = schema.maxLength;
  if (typeof schema.pattern === 'string') param.pattern = schema.pattern;
  if (typeof schema.format === 'string') {
    const format = JSON_SCHEMA_FORMATS[schema.format] ?? schema.format;
    if ((PARAMETER_FORMATS as readonly string[]).includes(format)) param.format = format as ManifestParameter['format'];
  }
  if (schema.default !== undefined) param.default = schema.default;
  if (schema.items && typeof schema.items === 'object') param.items = schema.items as JsonSchema;
  if (schema.properties && typeof schema.properties === 'object') {
    param.properties = schema.properties as JsonSchema;
  }
  param.source = source;
  return param;
}

/** `anyOf: [{type: 'string'}, {type: 'null'}]` and `type: ['string', 'null']` read as the non-null branch. */
function unwrapNullable(schema: JsonSchema): JsonSchema {
  for (const key of ['anyOf', 'oneOf'] as const) {
    const branches = schema[key];
    if (Array.isArray(branches)) {
      const nonNull = (branches as JsonSchema[]).filter(b => b.type !== 'null');
      if (nonNull.length === 1) return { ...schema, ...nonNull[0], [key]: undefined };
    }
  }
  return schema;
}

function schemaType(schema: JsonSchema): ManifestParameter['type'] {
  const raw = Array.isArray(schema.type) ? (schema.type as string[]).find(t => t !== 'null') : schema.type;
  switch (raw) {
    case 'number':
    case 'integer':
    case 'boolean':
    case 'array':
    case 'object':
    case 'string':
      return raw;
    default:
      return schema.properties ? 'object' : 'string';
  }
}
