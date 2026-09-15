/**
 * Macro shorthand — `axag="write:user.deactivate!critical?approval&roles=owner,admin"`.
 *
 *   macro       = action-type ":" intent [ "!" risk ] [ "?" pair *( "&" pair ) ]
 *   pair        = key [ "=" value ]          ; a bare key means true
 *   value       = token *( "," token )       ; lists for roles / effects / req / opt
 *
 * A macro expands to the same longhand attributes an author could have written,
 * so everything downstream (lint rules, manifests, tools) sees one canonical form.
 */

import {
  ACTION_TYPES,
  ATTR,
  INTENT_PATTERN,
  RISK_LEVELS,
  SCOPES,
  TENANT_BOUNDARIES,
} from './vocabulary.js';

export const MACRO_ATTRIBUTE = 'axag';

type KeyKind = 'boolean' | 'enum' | 'list';

interface KeySpec {
  attribute: string;
  kind: KeyKind;
  values?: readonly string[];
}

/** Macro query keys, in the order `toMacro` writes them. */
export const MACRO_KEYS: Readonly<Record<string, KeySpec>> = {
  approval: { attribute: ATTR.approvalRequired, kind: 'boolean' },
  confirm: { attribute: ATTR.confirmationRequired, kind: 'boolean' },
  idempotent: { attribute: ATTR.idempotent, kind: 'boolean' },
  async: { attribute: ATTR.async, kind: 'boolean' },
  scope: { attribute: ATTR.scope, kind: 'enum', values: SCOPES },
  tenant: { attribute: ATTR.tenantBoundary, kind: 'enum', values: TENANT_BOUNDARIES },
  roles: { attribute: ATTR.approvalRoles, kind: 'list' },
  effects: { attribute: ATTR.sideEffects, kind: 'list' },
  req: { attribute: ATTR.requiredParameters, kind: 'list' },
  opt: { attribute: ATTR.optionalParameters, kind: 'list' },
};

const TOKEN = /^[A-Za-z0-9_-]+$/;

export interface MacroError {
  message: string;
  /** 1-based column within the attribute value. */
  column: number;
}

export interface MacroParseResult {
  /** Longhand attributes the macro stands for. Parts with errors are left out. */
  attributes: Record<string, string>;
  errors: MacroError[];
}

export function parseMacro(value: string): MacroParseResult {
  const attributes: Record<string, string> = {};
  const errors: MacroError[] = [];
  const fail = (message: string, offset: number) => errors.push({ message, column: offset + 1 });

  const colon = value.indexOf(':');
  if (colon < 0) {
    fail('Expected "<action-type>:<intent>", e.g. "write:user.deactivate"', 0);
    return { attributes, errors };
  }

  const queryAt = value.indexOf('?', colon);
  const head = queryAt < 0 ? value : value.slice(0, queryAt);
  const bangAt = head.indexOf('!', colon);

  const actionType = head.slice(0, colon);
  const intent = head.slice(colon + 1, bangAt < 0 ? head.length : bangAt);

  if (!(ACTION_TYPES as readonly string[]).includes(actionType)) {
    fail(`Unknown action type "${actionType}". Use one of: ${ACTION_TYPES.join(', ')}`, 0);
  }
  if (!INTENT_PATTERN.test(intent)) {
    fail(`Intent "${intent}" must look like entity.verb (lowercase letters and _)`, colon + 1);
  }
  if (errors.length > 0) return { attributes, errors };

  attributes[ATTR.actionType] = actionType;
  attributes[ATTR.intent] = intent;

  if (bangAt >= 0) {
    const risk = head.slice(bangAt + 1);
    if ((RISK_LEVELS as readonly string[]).includes(risk)) attributes[ATTR.riskLevel] = risk;
    else fail(`Unknown risk level "${risk}". Use one of: ${RISK_LEVELS.join(', ')}`, bangAt + 1);
  }

  if (queryAt < 0) return { attributes, errors };

  const seen = new Set<string>();
  let offset = queryAt + 1;
  for (const pair of value.slice(queryAt + 1).split('&')) {
    const at = offset;
    offset += pair.length + 1;

    const eq = pair.indexOf('=');
    const key = eq < 0 ? pair : pair.slice(0, eq);
    const raw = eq < 0 ? undefined : pair.slice(eq + 1);
    const spec = MACRO_KEYS[key];

    if (!spec) {
      fail(`Unknown key "${key}". Use one of: ${Object.keys(MACRO_KEYS).join(', ')}`, at);
      continue;
    }
    if (seen.has(key)) {
      fail(`Key "${key}" appears more than once`, at);
      continue;
    }
    seen.add(key);

    const valueAt = at + key.length + 1;
    if (spec.kind === 'boolean') {
      if (raw === undefined || raw === 'true' || raw === 'false') attributes[spec.attribute] = raw ?? 'true';
      else fail(`"${key}" takes true or false, got "${raw}"`, valueAt);
    } else if (raw === undefined || raw === '') {
      fail(`"${key}" needs a value`, at);
    } else if (spec.kind === 'enum') {
      if (spec.values!.includes(raw)) attributes[spec.attribute] = raw;
      else fail(`"${key}" must be one of: ${spec.values!.join(', ')}`, valueAt);
    } else {
      const items = raw.split(',');
      const bad = items.find(item => !TOKEN.test(item));
      if (bad === undefined) attributes[spec.attribute] = JSON.stringify(items);
      else fail(`"${key}" items must be letters, digits, _ or -, got "${bad}"`, valueAt);
    }
  }

  return { attributes, errors };
}

export interface MacroConversion {
  /** The macro value, e.g. `write:cart.add_item!low?idempotent=false`. */
  macro: string;
  /** Longhand attributes the macro can't express; keep them next to it. */
  remaining: Record<string, string>;
}

/**
 * Fold longhand attributes into a macro. Returns null when the element has no
 * valid intent. Values the grammar can't express stay in `remaining`.
 */
export function toMacro(longhand: Record<string, string>): MacroConversion | null {
  const remaining = { ...longhand };
  const intent = remaining[ATTR.intent];
  if (!intent || !INTENT_PATTERN.test(intent)) return null;

  const actionType = remaining[ATTR.actionType] ?? 'read';
  if (!(ACTION_TYPES as readonly string[]).includes(actionType)) return null;
  delete remaining[ATTR.intent];
  delete remaining[ATTR.actionType];
  if (remaining[ATTR.entity] === intent.split('.')[0]) delete remaining[ATTR.entity];

  let macro = `${actionType}:${intent}`;
  const risk = remaining[ATTR.riskLevel];
  if (risk !== undefined && (RISK_LEVELS as readonly string[]).includes(risk)) {
    macro += `!${risk}`;
    delete remaining[ATTR.riskLevel];
  }

  const pairs: string[] = [];
  for (const [key, spec] of Object.entries(MACRO_KEYS)) {
    const raw = remaining[spec.attribute];
    if (raw === undefined) continue;

    let pair: string | undefined;
    if (spec.kind === 'boolean') {
      if (raw === 'true') pair = key;
      else if (raw === 'false') pair = `${key}=false`;
    } else if (spec.kind === 'enum') {
      if (spec.values!.includes(raw)) pair = `${key}=${raw}`;
    } else {
      const items = parseStringArray(raw);
      if (items && items.length > 0 && items.every(item => TOKEN.test(item))) pair = `${key}=${items.join(',')}`;
    }

    if (pair !== undefined) {
      pairs.push(pair);
      delete remaining[spec.attribute];
    }
  }

  if (pairs.length > 0) macro += `?${pairs.join('&')}`;
  return { macro, remaining };
}

/** Whether two spellings of an attribute mean the same thing (`["a","b"]` vs `["a", "b"]`). */
export function sameAttributeValue(attribute: string, a: string, b: string): boolean {
  if (a === b) return true;
  const isList = Object.values(MACRO_KEYS).some(spec => spec.attribute === attribute && spec.kind === 'list');
  if (!isList) return false;
  const left = parseStringArray(a);
  const right = parseStringArray(b);
  return left !== null && right !== null && JSON.stringify(left) === JSON.stringify(right);
}

function parseStringArray(raw: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : null;
  } catch {
    return null;
  }
}
