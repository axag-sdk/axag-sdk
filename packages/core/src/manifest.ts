/**
 * Manifest generation — annotated elements → AXAG semantic manifest.
 */

import { readAnnotation } from './annotation.js';
import { mergeParameters, nameOnlyParameters } from './parameters.js';
import { ATTR, SPEC_VERSION } from './vocabulary.js';
import type { ConformanceLevel } from './vocabulary.js';
import type { CoreDiagnostic, DynamicAction, Manifest, ManifestAction, ManifestSourceElement } from './types.js';

export interface ManifestOptions {
  paths: string[];
  url?: string;
  tool?: string;
  toolVersion?: string;
  /** Override the timestamp (useful for reproducible builds). */
  generatedAt?: string;
  /** Add parameters harvested from form markup (default true). */
  harvest?: boolean;
  /** Annotations that could not be read statically, recorded for runtimes. */
  dynamicActions?: DynamicAction[];
}

export interface ManifestResult {
  manifest: Manifest;
  diagnostics: CoreDiagnostic[];
}

export function buildManifest(elements: ManifestSourceElement[], options: ManifestOptions): ManifestResult {
  const diagnostics: CoreDiagnostic[] = [];
  const byIntent = new Map<string, ManifestAction>();

  for (const el of elements) {
    const read = readAnnotation(el.attributes);
    for (const d of [...(el.diagnostics ?? []), ...read.diagnostics]) {
      diagnostics.push({ ...d, filePath: el.filePath, line: el.line });
    }
    if (!read.action) continue;

    const existing = byIntent.get(read.action.intent);
    if (existing) {
      diagnostics.push({
        code: 'AXAG-CORE-003',
        severity: 'warning',
        filePath: el.filePath,
        line: el.line,
        message:
          `Duplicate intent "${read.action.intent}" — keeping the declaration at ` +
          `${existing.source_file}:${existing.source_line}`,
      });
      continue;
    }

    const action: ManifestAction = { ...read.action, source_file: el.filePath, source_line: el.line };

    const binding = el.schemaBinding;
    const harvested = options.harvest === false ? undefined : el.harvested;
    if (binding || harvested) {
      const declared = {
        required: action.required_parameters,
        optional: action.optional_parameters,
        nameOnly: nameOnlyParameters(el.attributes[ATTR.requiredParameters], el.attributes[ATTR.optionalParameters]),
      };
      const merged = mergeParameters([declared, ...(binding ? [binding] : []), ...(harvested ? [harvested] : [])]);
      action.required_parameters = merged.required;
      action.optional_parameters = merged.optional;
    }
    if (binding?.riskLevel && action.risk_level === undefined) action.risk_level = binding.riskLevel;
    if (binding?.description && el.attributes[ATTR.description] === undefined) action.description = binding.description;

    if (el.selector) action.element_selector = el.selector;
    byIntent.set(action.intent, action);
  }

  const actions = [...byIntent.values()].sort((a, b) => a.intent.localeCompare(b.intent));

  const manifest: Manifest = {
    version: SPEC_VERSION,
    generated_at: options.generatedAt ?? new Date().toISOString(),
    source: {
      url: options.url,
      paths: options.paths,
      tool: options.tool ?? '@axag/core',
      tool_version: options.toolVersion ?? SPEC_VERSION,
    },
    conformance: determineConformance(actions),
    actions,
  };
  if (options.dynamicActions?.length) manifest.dynamic_actions = options.dynamicActions;

  return { manifest, diagnostics };
}

export function determineConformance(actions: ManifestAction[]): ConformanceLevel {
  if (actions.length === 0) return 'basic';

  const hasAllBasic = actions.every(a => a.intent && a.entity && a.action_type && a.description);
  if (!hasAllBasic) return 'basic';

  const hasRiskAndSafety = actions.every(
    a => a.risk_level !== undefined && (a.action_type === 'read' || a.idempotent !== undefined),
  );
  if (!hasRiskAndSafety) return 'basic';

  const hasFull =
    actions.every(a => a.scope !== undefined) &&
    actions.some(a => (a.preconditions?.length ?? 0) > 0 || (a.side_effects?.length ?? 0) > 0);

  return hasFull ? 'full' : 'intermediate';
}
