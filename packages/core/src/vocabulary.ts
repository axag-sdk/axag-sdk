/**
 * Canonical AXAG vocabulary — the single source of attribute names and enum
 * values for every AXAG tool. Enum values are checked against
 * schema/axag-manifest.schema.json by tests/vocabulary.test.ts.
 */

/** Version of the manifest schema this package emits and validates against. */
export const SPEC_VERSION = '1.1.0';

/** Reserved attribute prefix. */
export const ATTRIBUTE_PREFIX = 'axag-';

export const ATTR = {
  /** Macro shorthand that expands to the attributes below. */
  macro: 'axag',

  /* ── Identity ──────────────────────────────── */
  intent: 'axag-intent',
  entity: 'axag-entity',
  actionType: 'axag-action-type',
  description: 'axag-description',
  operationId: 'axag-operation-id',

  /* ── Parameters ────────────────────────────── */
  requiredParameters: 'axag-required-parameters',
  optionalParameters: 'axag-optional-parameters',
  /** `#id` of the form whose controls supply parameters. */
  paramsFrom: 'axag-params-from',
  /** Schema binding, e.g. `zod:./schemas/user.ts#DeactivateUser` or `openapi:deactivateUser`. */
  schema: 'axag-schema',

  /* ── Parameter declarations on form controls ─ */
  parameter: 'axag-parameter',
  parameterType: 'axag-parameter-type',
  parameterRequired: 'axag-parameter-required',
  parameterDescription: 'axag-parameter-description',
  parameterFormat: 'axag-parameter-format',
  parameterEnum: 'axag-parameter-enum',
  parameterMin: 'axag-parameter-min',
  parameterMax: 'axag-parameter-max',
  parameterPattern: 'axag-parameter-pattern',
  parameterMinLength: 'axag-parameter-min-length',
  parameterMaxLength: 'axag-parameter-max-length',

  /* ── State ─────────────────────────────────── */
  preconditions: 'axag-preconditions',
  postconditions: 'axag-postconditions',
  sideEffects: 'axag-side-effects',

  /* ── Safety ────────────────────────────────── */
  riskLevel: 'axag-risk-level',
  confirmationRequired: 'axag-confirmation-required',
  confirmationMessage: 'axag-confirmation-message',
  approvalRequired: 'axag-approval-required',
  approvalRoles: 'axag-approval-roles',
  approvalCount: 'axag-approval-count',
  idempotent: 'axag-idempotent',
  async: 'axag-async',
  rateLimit: 'axag-rate-limit',

  /* ── Scope ─────────────────────────────────── */
  scope: 'axag-scope',
  tenantBoundary: 'axag-tenant-boundary',
  requiredRoles: 'axag-required-roles',
} as const;

export type AttributeName = (typeof ATTR)[keyof typeof ATTR];

export const ACTION_TYPES = ['read', 'write', 'delete', 'navigate'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const RISK_LEVELS = ['none', 'low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const SCOPES = ['public', 'user', 'tenant', 'global'] as const;
export type Scope = (typeof SCOPES)[number];

export const TENANT_BOUNDARIES = ['strict', 'relaxed'] as const;
export type TenantBoundary = (typeof TENANT_BOUNDARIES)[number];

export const CONFORMANCE_LEVELS = ['basic', 'intermediate', 'full'] as const;
export type ConformanceLevel = (typeof CONFORMANCE_LEVELS)[number];

export const PARAMETER_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'] as const;
export type ParameterType = (typeof PARAMETER_TYPES)[number];

export const PARAMETER_FORMATS = ['email', 'url', 'date', 'datetime', 'uuid'] as const;
export type ParameterFormat = (typeof PARAMETER_FORMATS)[number];

/** `entity.verb` */
export const INTENT_PATTERN = /^[a-z_]+\.[a-z_]+$/;
export const ENTITY_PATTERN = /^[a-z_]+$/;

/** Attributes whose values are JSON string arrays. */
export const JSON_ARRAY_ATTRIBUTES: readonly AttributeName[] = [
  ATTR.requiredParameters,
  ATTR.optionalParameters,
  ATTR.preconditions,
  ATTR.postconditions,
  ATTR.sideEffects,
  ATTR.approvalRoles,
  ATTR.requiredRoles,
];

/** Enum-valued attributes and their allowed values. */
export const ENUM_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
  [ATTR.actionType]: ACTION_TYPES,
  [ATTR.riskLevel]: RISK_LEVELS,
  [ATTR.scope]: SCOPES,
  [ATTR.tenantBoundary]: TENANT_BOUNDARIES,
};

export function isAxagAttribute(name: string): boolean {
  return name.startsWith(ATTRIBUTE_PREFIX);
}
