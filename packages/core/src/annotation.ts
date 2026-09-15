/**
 * Annotation reader — the only place attribute strings become typed values.
 */

import { MACRO_ATTRIBUTE, parseMacro, sameAttributeValue } from './macro.js';
import { ATTR, ENUM_ATTRIBUTES, isAxagAttribute } from './vocabulary.js';
import type { ActionType, RiskLevel, Scope, TenantBoundary } from './vocabulary.js';
import type { CoreDiagnostic, ManifestAction, ManifestParameter } from './types.js';

/** Fields of a manifest action that come from the annotation itself. */
export type AnnotationAction = Omit<ManifestAction, 'source_file' | 'source_line' | 'element_selector'>;

export interface ReadResult {
  /** `null` when the element has no axag-intent. */
  action: AnnotationAction | null;
  diagnostics: CoreDiagnostic[];
}

export interface NormalizedAttributes {
  /** Canonical longhand axag-* attributes, with any `axag` macro expanded. */
  attributes: Record<string, string>;
  /** Macro syntax errors and macro/longhand conflicts. */
  diagnostics: CoreDiagnostic[];
}

/**
 * Reduce an element's attributes to canonical longhand axag-* attributes.
 * An `axag` macro is expanded; where it disagrees with a longhand attribute
 * the longhand value is kept and the conflict is reported.
 */
export function readAttributes(all: Record<string, string>): NormalizedAttributes {
  const attributes: Record<string, string> = {};
  const diagnostics: CoreDiagnostic[] = [];
  for (const [name, value] of Object.entries(all)) {
    if (isAxagAttribute(name)) attributes[name] = value;
  }

  // An empty macro is treated as absent: in JSX it is a dynamic `axag={spec}`.
  const macro = all[MACRO_ATTRIBUTE]?.trim();
  if (!macro) return { attributes, diagnostics };

  const parsed = parseMacro(macro);
  for (const error of parsed.errors) {
    diagnostics.push({
      code: 'AXAG-CORE-004',
      severity: 'error',
      attribute: MACRO_ATTRIBUTE,
      column: error.column,
      message: `Invalid axag macro at column ${error.column}: ${error.message}`,
    });
  }
  for (const [name, value] of Object.entries(parsed.attributes)) {
    const longhand = attributes[name];
    if (longhand === undefined) {
      attributes[name] = value;
    } else if (!sameAttributeValue(name, longhand, value)) {
      diagnostics.push({
        code: 'AXAG-CORE-005',
        severity: 'error',
        attribute: name,
        message: `axag macro sets ${name}="${value}" but the element also has ${name}="${longhand}"`,
      });
    }
  }
  // The grammar derives the entity from the intent; it only fills a gap, so it never conflicts.
  const intent = parsed.attributes[ATTR.intent];
  if (intent && attributes[ATTR.entity] === undefined) attributes[ATTR.entity] = intent.split('.')[0];
  return { attributes, diagnostics };
}

export function normalizeAttributes(all: Record<string, string>): Record<string, string> {
  return readAttributes(all).attributes;
}

/** Whether the attributes declare an intent, directly or through a macro. */
export function hasIntent(attrs: Record<string, string>): boolean {
  return Boolean(attrs[ATTR.intent]) || Boolean(normalizeAttributes(attrs)[ATTR.intent]);
}

/** Read normalized axag-* attributes into a manifest action. */
export function readAnnotation(attrs: Record<string, string>): ReadResult {
  const diagnostics: CoreDiagnostic[] = [];
  const intent = attrs[ATTR.intent];
  if (!intent) return { action: null, diagnostics };

  for (const [attribute, allowed] of Object.entries(ENUM_ATTRIBUTES)) {
    const value = attrs[attribute];
    if (value !== undefined && !allowed.includes(value)) {
      diagnostics.push({
        code: 'AXAG-CORE-002',
        severity: 'error',
        attribute,
        message: `Invalid ${attribute}="${value}". Must be one of: ${allowed.join(', ')}`,
      });
    }
  }

  const jsonArray = (attribute: string): unknown[] | undefined => {
    const raw = attrs[attribute];
    if (raw === undefined) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* reported below */
    }
    diagnostics.push({
      code: 'AXAG-CORE-001',
      severity: 'error',
      attribute,
      message: `${attribute} must be a JSON array`,
    });
    return undefined;
  };

  const action: AnnotationAction = {
    intent,
    entity: attrs[ATTR.entity] || intent.split('.')[0],
    action_type: (attrs[ATTR.actionType] || 'read') as ActionType,
    operation_id: attrs[ATTR.operationId] || intent.replace(/\./g, '_'),
    description: attrs[ATTR.description] || humanizeIntent(intent),
    required_parameters: toParameters(jsonArray(ATTR.requiredParameters)),
    optional_parameters: toParameters(jsonArray(ATTR.optionalParameters)),
  };

  // Optional fields are only present when declared.
  if (attrs[ATTR.riskLevel]) action.risk_level = attrs[ATTR.riskLevel] as RiskLevel;
  if (attrs[ATTR.confirmationRequired]) {
    action.confirmation_required = attrs[ATTR.confirmationRequired] === 'true';
  }
  if (attrs[ATTR.approvalRequired]) action.approval_required = attrs[ATTR.approvalRequired] === 'true';
  const approvalRoles = jsonArray(ATTR.approvalRoles);
  if (approvalRoles) action.approval_roles = approvalRoles.map(String);
  if (attrs[ATTR.idempotent]) action.idempotent = attrs[ATTR.idempotent] === 'true';
  if (attrs[ATTR.async]) action.async = attrs[ATTR.async] === 'true';
  if (attrs[ATTR.scope]) action.scope = attrs[ATTR.scope] as Scope;
  if (attrs[ATTR.tenantBoundary]) action.tenant_boundary = attrs[ATTR.tenantBoundary] as TenantBoundary;
  const requiredRoles = jsonArray(ATTR.requiredRoles);
  if (requiredRoles) action.required_roles = requiredRoles.map(String);
  const sideEffects = jsonArray(ATTR.sideEffects);
  if (sideEffects) action.side_effects = sideEffects.map(String);
  const preconditions = jsonArray(ATTR.preconditions);
  if (preconditions) action.preconditions = preconditions.map(String);
  const postconditions = jsonArray(ATTR.postconditions);
  if (postconditions) action.postconditions = postconditions.map(String);

  return { action, diagnostics };
}

type RawParameter = string | (Partial<ManifestParameter> & { name: string });

const PARAMETER_FIELDS = [
  'description', 'enum', 'min', 'max', 'maxLength', 'minLength', 'pattern', 'format', 'default', 'items', 'properties',
] as const;

function toParameters(items: unknown[] | undefined): ManifestParameter[] {
  if (!items) return [];
  const params: ManifestParameter[] = [];
  for (const item of items as RawParameter[]) {
    if (typeof item === 'string') {
      params.push({ name: item, type: 'string' });
      continue;
    }
    if (!item || typeof item.name !== 'string') continue;
    const param: ManifestParameter = { name: item.name, type: item.type || 'string' };
    for (const key of PARAMETER_FIELDS) {
      if (item[key] !== undefined) (param as unknown as Record<string, unknown>)[key] = item[key];
    }
    params.push(param);
  }
  return params;
}

export function humanizeIntent(intent: string): string {
  return intent
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
