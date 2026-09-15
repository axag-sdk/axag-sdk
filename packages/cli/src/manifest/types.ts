/* ─── Manifest Output Types ───────────────────── */

export interface ManifestOutput {
  version: string;
  generated_at: string;
  source: {
    url?: string;
    paths: string[];
    tool: string;
    tool_version: string;
  };
  conformance: 'basic' | 'intermediate' | 'full';
  actions: ManifestAction[];
}

export interface ManifestAction {
  intent: string;
  entity: string;
  action_type: 'read' | 'write' | 'delete' | 'navigate';
  operation_id: string;
  description: string;
  required_parameters: ManifestParameter[];
  optional_parameters: ManifestParameter[];
  risk_level?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confirmation_required?: boolean;
  approval_required?: boolean;
  approval_roles?: string[];
  idempotent?: boolean;
  scope?: 'user' | 'tenant' | 'global';
  side_effects?: string[];
  preconditions?: string[];
  postconditions?: string[];
  element_selector?: string;
  source_file: string;
  source_line: number;
}

export interface ManifestParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: unknown[];
  min?: number;
  max?: number;
  maxLength?: number;
  format?: string;
  default?: unknown;
}
