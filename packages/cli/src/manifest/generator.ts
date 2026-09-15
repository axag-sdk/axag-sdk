/**
 * Manifest Generator — convert extracted annotated elements into an AXAG manifest.
 */

import type { AnnotatedElement } from '../scanner/html-extractor.js';
import type { ManifestOutput, ManifestAction, ManifestParameter } from './types.js';

/**
 * Generate a manifest from annotated elements.
 */
export function generateManifest(
  elements: AnnotatedElement[],
  options: {
    paths: string[];
    url?: string;
  },
): ManifestOutput {
  const actionsMap = new Map<string, ManifestAction>();

  for (const el of elements) {
    const intent = el.attributes['axag-intent'];
    if (!intent) continue;

    const action = mapElementToAction(el);

    // Deduplicate by intent — if duplicate, keep first and warn
    if (actionsMap.has(intent)) {
      // Could log a warning here
      continue;
    }
    actionsMap.set(intent, action);
  }

  // Sort actions alphabetically by intent
  const actions = Array.from(actionsMap.values()).sort((a, b) =>
    a.intent.localeCompare(b.intent),
  );

  // Determine conformance level
  const conformance = determineConformance(actions);

  return {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    source: {
      url: options.url,
      paths: options.paths,
      tool: 'axag-cli',
      tool_version: '1.0.0',
    },
    conformance,
    actions,
  };
}

function mapElementToAction(el: AnnotatedElement): ManifestAction {
  const attrs = el.attributes;
  const intent = attrs['axag-intent'];
  const entity = attrs['axag-entity'] || intent.split('.')[0];
  const actionType = (attrs['axag-action-type'] || 'read') as ManifestAction['action_type'];
  const description = attrs['axag-description'] || humanizeIntent(intent);

  const action: ManifestAction = {
    intent,
    entity,
    action_type: actionType,
    operation_id: intent.replace(/\./g, '_'),
    description,
    required_parameters: parseParameters(attrs['axag-required-parameters']),
    optional_parameters: parseParameters(attrs['axag-optional-parameters']),
    source_file: el.filePath,
    source_line: el.line,
  };

  // Optional fields — only include if present
  if (attrs['axag-risk-level']) {
    action.risk_level = attrs['axag-risk-level'] as ManifestAction['risk_level'];
  }
  if (attrs['axag-confirmation-required']) {
    action.confirmation_required = attrs['axag-confirmation-required'] === 'true';
  }
  if (attrs['axag-approval-required']) {
    action.approval_required = attrs['axag-approval-required'] === 'true';
  }
  if (attrs['axag-approval-roles']) {
    try {
      action.approval_roles = JSON.parse(attrs['axag-approval-roles']);
    } catch { /* skip */ }
  }
  if (attrs['axag-idempotent']) {
    action.idempotent = attrs['axag-idempotent'] === 'true';
  }
  if (attrs['axag-scope']) {
    action.scope = attrs['axag-scope'] as ManifestAction['scope'];
  }
  if (attrs['axag-side-effects']) {
    try {
      action.side_effects = JSON.parse(attrs['axag-side-effects']);
    } catch { /* skip */ }
  }
  if (attrs['axag-preconditions']) {
    try {
      action.preconditions = JSON.parse(attrs['axag-preconditions']);
    } catch { /* skip */ }
  }
  if (attrs['axag-postconditions']) {
    try {
      action.postconditions = JSON.parse(attrs['axag-postconditions']);
    } catch { /* skip */ }
  }

  return action;
}

function parseParameters(raw?: string): ManifestParameter[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: string | { name: string; type?: string; description?: string }) => {
      if (typeof item === 'string') {
        return { name: item, type: 'string' as const };
      }
      return {
        name: item.name,
        type: (item.type || 'string') as ManifestParameter['type'],
        description: item.description,
      };
    });
  } catch {
    return [];
  }
}

function humanizeIntent(intent: string): string {
  return intent
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function determineConformance(actions: ManifestAction[]): 'basic' | 'intermediate' | 'full' {
  if (actions.length === 0) return 'basic';

  const hasAllBasic = actions.every(a => a.intent && a.entity && a.action_type && a.description);
  if (!hasAllBasic) return 'basic';

  const hasRiskAndSafety = actions.every(a =>
    a.risk_level !== undefined &&
    (a.action_type === 'read' || a.idempotent !== undefined),
  );
  if (!hasRiskAndSafety) return 'basic';

  const hasFull = actions.every(a =>
    a.scope !== undefined &&
    (a.action_type === 'read' || a.risk_level !== undefined),
  ) && actions.some(a => (a.preconditions?.length ?? 0) > 0 || (a.side_effects?.length ?? 0) > 0);

  return hasFull ? 'full' : 'intermediate';
}
