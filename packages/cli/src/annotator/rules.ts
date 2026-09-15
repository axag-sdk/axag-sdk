/**
 * AXAG Annotation Rules — heuristic inference for axag-* attributes
 * based on element tag, text content, role, and page context.
 */

import type { ScannedElement, InferredAnnotation } from '../types/index.js';
import type { PageContext } from '../scanner/context-analyzer.js';
import { AXAG_ATTRIBUTES, ACTION_TYPES, RISK_LEVELS } from '../utils/constants.js';
import type { ActionType, RiskLevel } from '../utils/constants.js';

interface PatternMatch {
  pattern: RegExp;
  intent: string;
  entity: string;
  actionType: ActionType;
  riskLevel: RiskLevel;
  confirmationRequired: boolean;
  idempotent: boolean;
}

/**
 * Pattern library — maps text/role patterns to AXAG annotation values.
 * Ordered by specificity (most specific first).
 */
const PATTERNS: PatternMatch[] = [
  /* ── Destructive actions ───────────────────── */
  { pattern: /delete|remove|destroy|trash|discard|clear|wipe|purge|reset/i, intent: '{entity}.delete', entity: '', actionType: 'delete', riskLevel: 'high', confirmationRequired: true, idempotent: true },
  { pattern: /deactivate|disable|suspend|revoke|ban/i, intent: '{entity}.deactivate', entity: '', actionType: 'write', riskLevel: 'critical', confirmationRequired: true, idempotent: true },
  { pattern: /cancel|abort|terminate/i, intent: '{entity}.cancel', entity: '', actionType: 'write', riskLevel: 'medium', confirmationRequired: true, idempotent: false },
  { pattern: /archive|hide/i, intent: '{entity}.archive', entity: '', actionType: 'write', riskLevel: 'low', confirmationRequired: false, idempotent: true },

  /* ── Write / Create actions ────────────────── */
  { pattern: /checkout|purchase|pay|buy now/i, intent: 'order.checkout', entity: 'order', actionType: 'write', riskLevel: 'high', confirmationRequired: true, idempotent: false },
  { pattern: /add to cart|add item/i, intent: 'cart.add', entity: 'cart', actionType: 'write', riskLevel: 'none', confirmationRequired: false, idempotent: false },
  { pattern: /subscribe|newsletter|opt.in|mailing.list/i, intent: 'subscription.subscribe', entity: 'subscription', actionType: 'write', riskLevel: 'low', confirmationRequired: false, idempotent: true },
  { pattern: /unsubscribe|opt.out/i, intent: 'subscription.unsubscribe', entity: 'subscription', actionType: 'write', riskLevel: 'low', confirmationRequired: true, idempotent: true },
  { pattern: /submit|create|\bnew\b|add|post|publish/i, intent: '{entity}.create', entity: '', actionType: 'write', riskLevel: 'low', confirmationRequired: false, idempotent: false },
  { pattern: /save|update|edit|modify|change/i, intent: '{entity}.update', entity: '', actionType: 'write', riskLevel: 'low', confirmationRequired: false, idempotent: true },
  { pattern: /upload|import|attach/i, intent: '{entity}.upload', entity: 'file', actionType: 'write', riskLevel: 'low', confirmationRequired: false, idempotent: false },

  /* ── Read actions ──────────────────────────── */
  { pattern: /search|find|look up|query/i, intent: '{entity}.search', entity: '', actionType: 'read', riskLevel: 'none', confirmationRequired: false, idempotent: true },
  { pattern: /filter|sort|refine/i, intent: '{entity}.filter', entity: '', actionType: 'read', riskLevel: 'none', confirmationRequired: false, idempotent: true },
  { pattern: /view|show|display|open|details|expand/i, intent: '{entity}.view', entity: '', actionType: 'read', riskLevel: 'none', confirmationRequired: false, idempotent: true },
  { pattern: /download|export/i, intent: '{entity}.export', entity: '', actionType: 'read', riskLevel: 'none', confirmationRequired: false, idempotent: true },
  { pattern: /refresh|reload|sync/i, intent: '{entity}.refresh', entity: '', actionType: 'read', riskLevel: 'none', confirmationRequired: false, idempotent: true },

  /* ── Execute actions ───────────────────────── */
  { pattern: /run|execute|trigger|start|launch/i, intent: '{entity}.execute', entity: 'process', actionType: 'execute', riskLevel: 'medium', confirmationRequired: true, idempotent: false },
  { pattern: /deploy|release|promote/i, intent: '{entity}.deploy', entity: 'deployment', actionType: 'execute', riskLevel: 'critical', confirmationRequired: true, idempotent: false },
  { pattern: /send|notify|email|share/i, intent: '{entity}.send', entity: 'message', actionType: 'execute', riskLevel: 'medium', confirmationRequired: true, idempotent: false },

  /* ── Auth actions ──────────────────────────── */
  { pattern: /log\s*in|sign\s*in|authenticate/i, intent: 'session.login', entity: 'session', actionType: 'write', riskLevel: 'none', confirmationRequired: false, idempotent: true },
  { pattern: /log\s*out|sign\s*out/i, intent: 'session.logout', entity: 'session', actionType: 'write', riskLevel: 'low', confirmationRequired: true, idempotent: true },
  { pattern: /register|sign\s*up/i, intent: 'user.register', entity: 'user', actionType: 'write', riskLevel: 'low', confirmationRequired: false, idempotent: false },

  /* ── Navigation (lowest priority) ──────────── */
  { pattern: /next|previous|back|forward|close|dismiss/i, intent: 'navigation.{action}', entity: 'page', actionType: 'read', riskLevel: 'none', confirmationRequired: false, idempotent: true },
];

/**
 * Infer the entity name from surrounding context, form fields, page headings, etc.
 */
function inferEntity(element: ScannedElement, context: PageContext): string {
  // Check form fields for entity clues
  if (element.tagName === 'form' || element.role === 'form') {
    const formContext = context.forms.find(
      (f) => f.submitLabel.toLowerCase().includes(element.textContent.toLowerCase()),
    );
    if (formContext && formContext.fields.length > 0) {
      return deriveEntityFromFields(formContext.fields);
    }
  }

  // Check parent context (heading)
  if (element.parentContext && element.parentContext !== 'page') {
    const words = element.parentContext.toLowerCase().split(/\s+/);
    // Try to find a noun — last significant word
    const candidate = words.filter((w) => w.length > 3).pop();
    if (candidate) return candidate;
  }

  // Check page title
  if (context.title) {
    const words = context.title.toLowerCase().split(/[\s\-|]+/);
    const candidate = words.filter((w) => w.length > 3 && !isStopWord(w)).shift();
    if (candidate) return candidate;
  }

  // Fallback: infer from element text
  const text = element.textContent.toLowerCase();
  const words = text.split(/\s+/).filter((w) => w.length > 3 && !isStopWord(w));
  return words[words.length - 1] || 'item';
}

function deriveEntityFromFields(fields: string[]): string {
  // Common field name → entity mapping
  const fieldHints: Record<string, string> = {
    email: 'user',
    username: 'user',
    password: 'user',
    name: 'contact',
    phone: 'contact',
    subject: 'ticket',
    message: 'message',
    title: 'post',
    description: 'item',
    amount: 'payment',
    quantity: 'order',
    address: 'address',
    city: 'address',
    search: 'search',
    query: 'search',
  };

  for (const field of fields) {
    const lower = field.toLowerCase();
    for (const [key, entity] of Object.entries(fieldHints)) {
      if (lower.includes(key)) return entity;
    }
  }

  return 'item';
}

function isStopWord(word: string): boolean {
  const stops = new Set([
    'the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'more', 'about',
    'home', 'page', 'site', 'here', 'click', 'button', 'link', 'all', 'new',
  ]);
  return stops.has(word);
}

/**
 * Infer required/optional parameters from form fields and element context.
 */
function inferParameters(
  element: ScannedElement,
  context: PageContext,
): { required: string[]; optional: string[] } {
  const required: string[] = [];
  const optional: string[] = [];

  // Check if this element is inside/associated with a form
  for (const form of context.forms) {
    for (const field of form.fields) {
      // Simple heuristic: first 2 fields required, rest optional
      if (required.length < 2) {
        required.push(field);
      } else {
        optional.push(field);
      }
    }
  }

  // For search elements, add 'query' as required
  if (/search|find|look/i.test(element.textContent)) {
    if (!required.includes('query')) required.unshift('query');
  }

  return { required, optional };
}

/**
 * Apply pattern-based inference to produce an annotation for a single element.
 */
export function inferAnnotation(
  element: ScannedElement,
  context: PageContext,
  domainHint?: string,
): InferredAnnotation {
  const text = element.textContent || '';
  const role = element.role || '';
  const matchText = `${text} ${role}`.trim();

  // Find the best matching pattern
  let bestMatch: PatternMatch | null = null;
  for (const pattern of PATTERNS) {
    if (pattern.pattern.test(matchText)) {
      bestMatch = pattern;
      break;
    }
  }

  const entity = inferEntity(element, context);
  const { required, optional } = inferParameters(element, context);

  // Build the annotation
  let intent: string;
  let actionType: ActionType;
  let riskLevel: RiskLevel;
  let confirmationRequired: boolean;
  let idempotent: boolean;
  let confidence: number;
  let reasoning: string;

  if (bestMatch) {
    intent = bestMatch.intent.replace('{entity}', entity).replace('{action}', text.toLowerCase().split(/\s+/)[0] || 'navigate');
    actionType = bestMatch.actionType;
    riskLevel = bestMatch.riskLevel;
    confirmationRequired = bestMatch.confirmationRequired;
    idempotent = bestMatch.idempotent;
    confidence = 0.75;
    reasoning = `Matched pattern "${bestMatch.pattern.source}" from element text "${text}".`;
  } else if (element.tagName === 'a' && element.parentContext === 'nav') {
    // Navigation links get a navigation-specific annotation
    const slug = text.toLowerCase().replace(/\s+/g, '-') || 'page';
    intent = `navigation.goto-${slug}`;
    actionType = 'read';
    riskLevel = 'none';
    confirmationRequired = false;
    idempotent = true;
    confidence = 0.7;
    reasoning = `Link inside <nav> — inferred as site navigation to "${text}".`;
  } else if (element.tagName === 'a') {
    // Links outside nav get a generic navigate annotation
    const slug = text.toLowerCase().replace(/\s+/g, '-') || 'page';
    intent = `${entity}.navigate-${slug}`;
    actionType = 'read';
    riskLevel = 'none';
    confirmationRequired = false;
    idempotent = true;
    confidence = 0.5;
    reasoning = `Link element — inferred as navigation to "${text}".`;
  } else if (element.tagName === 'input' || element.tagName === 'textarea' || element.tagName === 'select') {
    // Form inputs get a generic input annotation
    const fieldName = element.attributes.name || element.attributes.placeholder || element.attributes.id || 'field';
    intent = `form.input-${fieldName.toLowerCase().replace(/\s+/g, '-')}`;
    actionType = 'write';
    riskLevel = 'none';
    confirmationRequired = false;
    idempotent = true;
    confidence = 0.5;
    reasoning = `Form input "${fieldName}" — inferred as data entry field.`;
  } else {
    // Fallback: generic annotation
    intent = `${entity}.interact`;
    actionType = 'read';
    riskLevel = 'none';
    confirmationRequired = false;
    idempotent = true;
    confidence = 0.3;
    reasoning = `No strong pattern match for "${text}". Defaulted to generic read action.`;
  }

  // Boost confidence if domain hint matches inferred domain
  if (domainHint && context.inferredDomain === domainHint) {
    confidence = Math.min(1, confidence + 0.1);
    reasoning += ` Domain hint "${domainHint}" matches inferred domain.`;
  }

  const description = buildDescription(text, entity, actionType);

  // Build the complete attribute set
  const attributes: Record<string, string> = {
    [AXAG_ATTRIBUTES.INTENT]: intent,
    [AXAG_ATTRIBUTES.ENTITY]: entity,
    [AXAG_ATTRIBUTES.ACTION_TYPE]: actionType,
    [AXAG_ATTRIBUTES.DESCRIPTION]: description,
    [AXAG_ATTRIBUTES.RISK_LEVEL]: riskLevel,
    [AXAG_ATTRIBUTES.IDEMPOTENT]: String(idempotent),
  };

  if (required.length > 0) {
    attributes[AXAG_ATTRIBUTES.REQUIRED_PARAMETERS] = JSON.stringify(required);
  }
  if (optional.length > 0) {
    attributes[AXAG_ATTRIBUTES.OPTIONAL_PARAMETERS] = JSON.stringify(optional);
  }
  if (confirmationRequired) {
    attributes[AXAG_ATTRIBUTES.CONFIRMATION_REQUIRED] = 'true';
  }

  return {
    elementId: element.id,
    selector: element.selector,
    pageUrl: element.pageUrl,
    intent,
    entity,
    actionType,
    description,
    requiredParameters: required,
    optionalParameters: optional,
    riskLevel,
    confirmationRequired,
    idempotent,
    async: false,
    confidence,
    reasoning,
    attributes,
    status: 'pending',
  };
}

function buildDescription(text: string, entity: string, actionType: ActionType): string {
  if (text.length > 5) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  const verb = actionType === 'read' ? 'View' : actionType === 'write' ? 'Modify' : actionType === 'delete' ? 'Remove' : 'Execute';
  return `${verb} ${entity}`;
}
