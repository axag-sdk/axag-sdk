/* ─── MCP Tool Definition Types ───────────────── */

export interface MCPToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required: string[];
  };
  metadata: {
    risk_level: string;
    idempotent: boolean;
    confirmation_required: boolean;
    approval_required: boolean;
    scope?: string;
    source_intent: string;
    source_entity: string;
  };
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  format?: string;
  default?: unknown;
}

export interface ToolRegistry {
  schema_version: string;
  generated_at: string;
  source_manifest: string;
  tools: MCPToolDefinition[];
}
