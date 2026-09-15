/* ─── AXAG Attribute Constants ───────────────── */

/** All AXAG specification attributes — the CLI infers these from page context. */
export const AXAG_ATTRIBUTES = {
  /* ── Core identity ─────────────────────────── */
  INTENT: 'axag-intent',
  ENTITY: 'axag-entity',
  ACTION_TYPE: 'axag-action-type',
  DESCRIPTION: 'axag-description',

  /* ── Parameters ────────────────────────────── */
  REQUIRED_PARAMETERS: 'axag-required-parameters',
  OPTIONAL_PARAMETERS: 'axag-optional-parameters',
  PARAMETER_SCHEMA: 'axag-parameter-schema',

  /* ── Safety & governance ───────────────────── */
  RISK_LEVEL: 'axag-risk-level',
  CONFIRMATION_REQUIRED: 'axag-confirmation-required',
  APPROVAL_REQUIRED: 'axag-approval-required',
  UNDO_SUPPORTED: 'axag-undo-supported',

  /* ── Behaviour qualifiers ──────────────────── */
  IDEMPOTENT: 'axag-idempotent',
  ASYNC: 'axag-async',
  RATE_LIMIT: 'axag-rate-limit',

  /* ── Multi-tenancy ─────────────────────────── */
  TENANT_SCOPE: 'axag-tenant-scope',
  AUTH_REQUIRED: 'axag-auth-required',
} as const;

export type AxagAttribute = (typeof AXAG_ATTRIBUTES)[keyof typeof AXAG_ATTRIBUTES];

/** Valid action types from the AXAG spec. */
export const ACTION_TYPES = ['read', 'write', 'delete', 'execute'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/** Risk levels from the AXAG spec. */
export const RISK_LEVELS = ['none', 'low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Conformance levels. */
export const CONFORMANCE_LEVELS = ['A', 'AA', 'AAA'] as const;
export type ConformanceLevel = (typeof CONFORMANCE_LEVELS)[number];

/** Interactive HTML element selectors the scanner targets. */
export const INTERACTIVE_SELECTORS = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'form',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="combobox"]',
  '[role="searchbox"]',
  '[role="slider"]',
  '[contenteditable="true"]',
  '[onclick]',
  '[data-action]',
  '[data-href]',
].join(', ');

/** Default output directory for scan results. */
export const DEFAULT_OUTPUT_DIR = '.axag';

/** Scan result file names. */
export const SCAN_FILES = {
  ELEMENTS: 'elements.json',
  ANNOTATIONS: 'annotations.json',
  REPORT: 'report.json',
  CONFIG: 'axag.config.json',
} as const;
