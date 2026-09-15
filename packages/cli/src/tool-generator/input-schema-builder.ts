/**
 * Input Schema Builder — convert manifest parameters to JSON Schema properties.
 */

import type { ManifestParameter } from '../manifest/types.js';
import type { JSONSchemaProperty } from './types.js';

/**
 * Convert a parameter array into JSON Schema properties and required array.
 */
export function buildInputSchema(
  requiredParams: ManifestParameter[],
  optionalParams: ManifestParameter[],
): {
  properties: Record<string, JSONSchemaProperty>;
  required: string[];
} {
  const properties: Record<string, JSONSchemaProperty> = {};
  const required: string[] = [];

  for (const param of requiredParams) {
    properties[param.name] = paramToSchemaProperty(param);
    required.push(param.name);
  }

  for (const param of optionalParams) {
    properties[param.name] = paramToSchemaProperty(param);
  }

  return { properties, required };
}

function paramToSchemaProperty(param: ManifestParameter): JSONSchemaProperty {
  const prop: JSONSchemaProperty = {
    type: param.type,
  };

  if (param.description) {
    prop.description = param.description;
  }
  if (param.enum && param.enum.length > 0) {
    prop.enum = param.enum;
  }
  if (param.min !== undefined) {
    prop.minimum = param.min;
  }
  if (param.max !== undefined) {
    prop.maximum = param.max;
  }
  if (param.maxLength !== undefined) {
    prop.maxLength = param.maxLength;
  }
  if (param.format) {
    prop.format = param.format;
  }
  if (param.default !== undefined) {
    prop.default = param.default;
  }

  return prop;
}
