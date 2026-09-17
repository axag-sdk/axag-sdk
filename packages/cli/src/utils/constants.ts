/* ─── AXAG Attribute Constants ───────────────── */

import { ATTR, ACTION_TYPES, RISK_LEVELS, CONFORMANCE_LEVELS } from '@web-axag/core';
import type { ConformanceLevel } from '@web-axag/core';

export { ACTION_TYPES, RISK_LEVELS, CONFORMANCE_LEVELS };
export type { ActionType, RiskLevel, ConformanceLevel } from '@web-axag/core';

/** AXAG attributes the CLI infers and validates, keyed for existing call sites. */
export const AXAG_ATTRIBUTES = {
  INTENT: ATTR.intent,
  ENTITY: ATTR.entity,
  ACTION_TYPE: ATTR.actionType,
  DESCRIPTION: ATTR.description,
  REQUIRED_PARAMETERS: ATTR.requiredParameters,
  OPTIONAL_PARAMETERS: ATTR.optionalParameters,
  RISK_LEVEL: ATTR.riskLevel,
  CONFIRMATION_REQUIRED: ATTR.confirmationRequired,
  APPROVAL_REQUIRED: ATTR.approvalRequired,
  IDEMPOTENT: ATTR.idempotent,
  ASYNC: ATTR.async,
  RATE_LIMIT: ATTR.rateLimit,
  TENANT_BOUNDARY: ATTR.tenantBoundary,
} as const;

export type AxagAttribute = (typeof AXAG_ATTRIBUTES)[keyof typeof AXAG_ATTRIBUTES];

/** Pre-1.1 CLI configs used WCAG-style level names. */
const LEGACY_CONFORMANCE: Record<string, ConformanceLevel> = { A: 'basic', AA: 'intermediate', AAA: 'full' };

/** Accept `basic | intermediate | full` or the legacy `A | AA | AAA`. */
export function toConformanceLevel(value: string): ConformanceLevel {
  const level = LEGACY_CONFORMANCE[value] ?? value;
  if (!(CONFORMANCE_LEVELS as readonly string[]).includes(level)) {
    throw new Error(`Unknown conformance level "${value}". Use one of: ${CONFORMANCE_LEVELS.join(', ')}`);
  }
  return level as ConformanceLevel;
}

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

/** Bump together with the version in package.json. */
export const CLI_VERSION = '1.1.0';

/** Default output directory for scan results. */
export const DEFAULT_OUTPUT_DIR = '.axag';

/** Scan result file names. */
export const SCAN_FILES = {
  ELEMENTS: 'elements.json',
  ANNOTATIONS: 'annotations.json',
  REPORT: 'report.json',
  CONFIG: 'axag.config.json',
} as const;
