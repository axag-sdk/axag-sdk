import type {
  ActionType,
  ConformanceLevel,
  ParameterFormat,
  ParameterType,
  RiskLevel,
  Scope,
  TenantBoundary,
} from './vocabulary.js';

/* ─── Source elements ─────────────────────────── */

/** An element read from source (HTML, JSX) or a live DOM. */
export interface AnnotatedElement {
  /** Lower-cased tag name, or `component` for JSX member expressions. */
  tagName: string;
  /** Normalized axag-* attributes. */
  attributes: Record<string, string>;
  /** Every attribute on the element as written. */
  allAttributes: Record<string, string>;
  /** Source file path, or the page URL for DOM elements. */
  filePath: string;
  /** 1-based line. */
  line: number;
  /** 1-based column. */
  column: number;
  /** Truncated outer HTML, when the adapter can produce it. */
  rawHtml?: string;
  /** CSS selector path, for DOM elements. */
  selector?: string;
  /** Problems found while normalizing attributes (macro errors, conflicts). */
  diagnostics?: CoreDiagnostic[];
}

/** The minimum a manifest generator needs from an element. */
export type ManifestSourceElement = Pick<AnnotatedElement, 'attributes' | 'filePath' | 'line'> &
  Partial<Pick<AnnotatedElement, 'selector' | 'diagnostics'>>;

/** Decides which elements an adapter returns. */
export type ElementFilter = (el: Pick<AnnotatedElement, 'tagName' | 'allAttributes'>) => boolean;

/* ─── Diagnostics ─────────────────────────────── */

export type CoreDiagnosticCode =
  | 'AXAG-CORE-001' // invalid JSON array attribute
  | 'AXAG-CORE-002' // value outside the attribute's enum
  | 'AXAG-CORE-003' // duplicate intent in one manifest
  | 'AXAG-CORE-004' // invalid axag macro
  | 'AXAG-CORE-005'; // axag macro disagrees with a longhand attribute

export interface CoreDiagnostic {
  code: CoreDiagnosticCode;
  severity: 'error' | 'warning';
  message: string;
  attribute?: string;
  /** 1-based column within the attribute value, for macro errors. */
  column?: number;
  filePath?: string;
  line?: number;
}

/* ─── Manifest ────────────────────────────────── */

export interface ManifestParameter {
  name: string;
  type: ParameterType;
  description?: string;
  enum?: unknown[];
  min?: number;
  max?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  format?: ParameterFormat;
  default?: unknown;
  /** JSON Schema for array elements. */
  items?: Record<string, unknown>;
  /** JSON Schema properties for object parameters. */
  properties?: Record<string, unknown>;
}

export interface ManifestAction {
  intent: string;
  entity: string;
  action_type: ActionType;
  operation_id: string;
  description: string;
  required_parameters: ManifestParameter[];
  optional_parameters: ManifestParameter[];
  risk_level?: RiskLevel;
  confirmation_required?: boolean;
  approval_required?: boolean;
  approval_roles?: string[];
  idempotent?: boolean;
  async?: boolean;
  scope?: Scope;
  tenant_boundary?: TenantBoundary;
  required_roles?: string[];
  side_effects?: string[];
  preconditions?: string[];
  postconditions?: string[];
  element_selector?: string;
  source_file: string;
  source_line: number;
}

export interface Manifest {
  version: string;
  generated_at: string;
  source: {
    url?: string;
    paths: string[];
    tool: string;
    tool_version: string;
  };
  conformance: ConformanceLevel;
  actions: ManifestAction[];
}

/* ─── Tool registry ───────────────────────────── */

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  format?: string;
  default?: unknown;
  items?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required: string[];
  };
  metadata: {
    action_type: string;
    risk_level: string;
    idempotent: boolean;
    confirmation_required: boolean;
    approval_required: boolean;
    approval_roles?: string[];
    async?: boolean;
    scope?: string;
    tenant_boundary?: string;
    required_roles?: string[];
    side_effects?: string[];
    preconditions?: string[];
    postconditions?: string[];
    source_intent: string;
    source_entity: string;
  };
}

export interface ToolRegistry {
  schema_version: string;
  generated_at: string;
  source_manifest: string;
  tools: MCPToolDefinition[];
}
