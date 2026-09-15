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
    risk_level: action.risk_level ?? 'none',
    idempotent: action.idempotent ?? false,
    confirmation_required: action.confirmation_required ?? false,
    approval_required: action.approval_required ?? false,
    source_intent: action.intent,
    source_entity: action.entity,
  };
  if (action.scope) metadata.scope = action.scope;

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

function toSchemaProperty(param: ManifestParameter): JSONSchemaProperty {
  const prop: JSONSchemaProperty = { type: param.type };
  if (param.description) prop.description = param.description;
  if (param.enum && param.enum.length > 0) prop.enum = param.enum;
  if (param.min !== undefined) prop.minimum = param.min;
  if (param.max !== undefined) prop.maximum = param.max;
  if (param.maxLength !== undefined) prop.maxLength = param.maxLength;
  if (param.format) prop.format = param.format;
  if (param.default !== undefined) prop.default = param.default;
  return prop;
}
