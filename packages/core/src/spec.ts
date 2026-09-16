/**
 * Action specs — the object form of an annotation.
 *
 * `defineAction` is what framework bindings and build-time extraction share: it
 * is an identity function at runtime, and `specToAttributes` turns the object
 * into the same axag-* attribute record the HTML and JSX readers produce, so a
 * spec and an annotated element travel the same path from here on.
 */

import { ATTR } from './vocabulary.js';
import type { ActionType, RiskLevel, Scope, TenantBoundary } from './vocabulary.js';
import type { ManifestParameter } from './types.js';

/** A parameter written by name, or with its type and constraints. */
export type SpecParameter = string | (Partial<ManifestParameter> & { name: string });

export interface ActionSpec {
  intent: string;
  entity?: string;
  actionType?: ActionType;
  description?: string;
  operationId?: string;
  requiredParameters?: SpecParameter[];
  optionalParameters?: SpecParameter[];
  riskLevel?: RiskLevel;
  confirmationRequired?: boolean;
  approvalRequired?: boolean;
  approvalRoles?: string[];
  idempotent?: boolean;
  async?: boolean;
  scope?: Scope;
  tenantBoundary?: TenantBoundary;
  requiredRoles?: string[];
  sideEffects?: string[];
  preconditions?: string[];
  postconditions?: string[];
  /** Called when an agent invokes the action. Ignored by build-time extraction. */
  handler?: (args: Record<string, unknown>) => unknown;
}

/** Identity at runtime; a marker that build-time extraction looks for. */
export function defineAction<T extends ActionSpec>(spec: T): T {
  return spec;
}

const STRING_FIELDS = [
  ['intent', ATTR.intent],
  ['entity', ATTR.entity],
  ['actionType', ATTR.actionType],
  ['description', ATTR.description],
  ['operationId', ATTR.operationId],
  ['riskLevel', ATTR.riskLevel],
  ['scope', ATTR.scope],
  ['tenantBoundary', ATTR.tenantBoundary],
] as const;

const BOOLEAN_FIELDS = [
  ['confirmationRequired', ATTR.confirmationRequired],
  ['approvalRequired', ATTR.approvalRequired],
  ['idempotent', ATTR.idempotent],
  ['async', ATTR.async],
] as const;

const JSON_FIELDS = [
  ['requiredParameters', ATTR.requiredParameters],
  ['optionalParameters', ATTR.optionalParameters],
  ['approvalRoles', ATTR.approvalRoles],
  ['requiredRoles', ATTR.requiredRoles],
  ['sideEffects', ATTR.sideEffects],
  ['preconditions', ATTR.preconditions],
  ['postconditions', ATTR.postconditions],
] as const;

/** Flatten a spec into axag-* attributes. `handler` and unknown keys are dropped. */
export function specToAttributes(spec: ActionSpec): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const [key, attribute] of STRING_FIELDS) {
    const value = spec[key];
    if (typeof value === 'string') attributes[attribute] = value;
  }
  for (const [key, attribute] of BOOLEAN_FIELDS) {
    const value = spec[key];
    if (typeof value === 'boolean') attributes[attribute] = String(value);
  }
  for (const [key, attribute] of JSON_FIELDS) {
    const value = spec[key];
    if (Array.isArray(value) && value.length > 0) attributes[attribute] = JSON.stringify(value);
  }
  return attributes;
}
