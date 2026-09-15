/**
 * MCP Tool Generator — convert manifest actions into MCP tool definitions.
 */

import type { ManifestOutput, ManifestAction } from '../manifest/types.js';
import type { MCPToolDefinition, ToolRegistry } from './types.js';
import { buildInputSchema } from './input-schema-builder.js';

/**
 * Generate a complete MCP tool registry from a manifest.
 */
export function generateToolRegistry(
  manifest: ManifestOutput,
  sourceManifestPath: string,
): ToolRegistry {
  const tools = manifest.actions.map(action => actionToTool(action));

  return {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    source_manifest: sourceManifestPath,
    tools,
  };
}

/**
 * Convert a single manifest action into an MCP tool definition.
 */
export function actionToTool(action: ManifestAction): MCPToolDefinition {
  const { properties, required } = buildInputSchema(
    action.required_parameters,
    action.optional_parameters,
  );

  const metadata: MCPToolDefinition['metadata'] = {
    risk_level: action.risk_level ?? 'none',
    idempotent: action.idempotent ?? false,
    confirmation_required: action.confirmation_required ?? false,
    approval_required: action.approval_required ?? false,
    source_intent: action.intent,
    source_entity: action.entity,
  };

  if (action.scope) {
    metadata.scope = action.scope;
  }

  return {
    name: action.intent.replace(/\./g, '_'),
    description: action.description,
    input_schema: {
      type: 'object',
      properties,
      required,
    },
    metadata,
  };
}
