/**
 * Tool generation — manifest actions → MCP tool definitions.
 */

import type {
  JSONSchemaProperty,
  Manifest,
  ManifestAction,
  ManifestParameter,
  MCPToolDefinition,
  ToolRegistry,
} from './types.js';

export function generateToolRegistry(manifest: Manifest, sourceManifestPath: string): ToolRegistry {
  return {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    source_manifest: sourceManifestPath,
    tools: manifest.actions.map(actionToTool),
  };
}

export function actionToTool(action: ManifestAction): MCPToolDefinition {
  const { properties, required } = buildInputSchema(action.required_parameters, action.optional_parameters);

  const metadata: MCPToolDefinition['metadata'] = {
    action_type: action.action_type,
    risk_level: action.risk_level ?? 'none',
    idempotent: action.idempotent ?? false,
    confirmation_required: action.confirmation_required ?? false,
    approval_required: action.approval_required ?? false,
    source_intent: action.intent,
    source_entity: action.entity,
  };
  if (action.approval_roles?.length) metadata.approval_roles = action.approval_roles;
  if (action.async !== undefined) metadata.async = action.async;
  if (action.scope) metadata.scope = action.scope;
  if (action.tenant_boundary) metadata.tenant_boundary = action.tenant_boundary;
  if (action.required_roles?.length) metadata.required_roles = action.required_roles;
  if (action.side_effects?.length) metadata.side_effects = action.side_effects;
  if (action.preconditions?.length) metadata.preconditions = action.preconditions;
  if (action.postconditions?.length) metadata.postconditions = action.postconditions;

  return {
    name: action.intent.replace(/\./g, '_'),
    description: action.description,
    input_schema: { type: 'object', properties, required },
    metadata,
  };
}

export function buildInputSchema(
  requiredParams: ManifestParameter[],
  optionalParams: ManifestParameter[],
): { properties: Record<string, JSONSchemaProperty>; required: string[] } {
  const properties: Record<string, JSONSchemaProperty> = {};
  const required: string[] = [];

  for (const param of requiredParams) {
    properties[param.name] = toSchemaProperty(param);
    required.push(param.name);
  }
  for (const param of optionalParams) {
    properties[param.name] = toSchemaProperty(param);
  }

  return { properties, required };
}

/** Manifest formats whose JSON Schema spelling differs. */
const FORMAT_TO_JSON_SCHEMA: Record<string, string> = { url: 'uri', datetime: 'date-time' };

function toSchemaProperty(param: ManifestParameter): JSONSchemaProperty {
  const prop: JSONSchemaProperty = { type: param.type };
  if (param.description) prop.description = param.description;
  if (param.enum && param.enum.length > 0) prop.enum = param.enum;
  if (param.min !== undefined) prop.minimum = param.min;
  if (param.max !== undefined) prop.maximum = param.max;
  if (param.maxLength !== undefined) prop.maxLength = param.maxLength;
  if (param.minLength !== undefined) prop.minLength = param.minLength;
  if (param.pattern) prop.pattern = param.pattern;
  if (param.format) prop.format = FORMAT_TO_JSON_SCHEMA[param.format] ?? param.format;
  if (param.default !== undefined) prop.default = param.default;
  if (param.items) prop.items = param.items;
  if (param.properties) prop.properties = param.properties;
  return prop;
}
