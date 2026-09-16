/** A parsed element with axag-* attributes extracted from source. */
export type { AnnotatedElement } from '@axag/core';
import type { AnnotatedElement } from '@axag/core';

/** Context for the file being linted. */
export interface FileContext {
  filePath: string;
  elements: AnnotatedElement[];
  manifest?: ManifestData;
  /** Intents the server enforces, from `enforcedIntentsPath`. */
  enforcedIntents?: Set<string>;
}

/** A single diagnostic produced by a rule. */
export interface Diagnostic {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  filePath: string;
  line: number;
  column: number;
  fix?: { attribute: string; value: string };
}

/** A lint rule definition. */
export interface LintRule {
  id: string;
  description: string;
  category: string;
  defaultSeverity: 'error' | 'warning' | 'info';
  check(element: AnnotatedElement, context: FileContext): Diagnostic[];
}

/** Loaded manifest data for cross-reference rules. */
export interface ManifestData {
  version: string;
  actions: ManifestAction[];
}

export interface ManifestAction {
  intent: string;
  entity: string;
  action_type: string;
  required_parameters?: ManifestParameterData[];
  optional_parameters?: ManifestParameterData[];
  [key: string]: unknown;
}

export interface ManifestParameterData {
  name: string;
  type?: string;
  enum?: unknown[];
  /** `harvested:html`, `zod` or `openapi` for parameters not declared on the annotation. */
  source?: string;
}

/** User config from .axaglintrc.json */
export interface LintConfig {
  include: string[];
  exclude: string[];
  manifestPath?: string;
  /** JSON file listing the intents your server enforces — an array, or `{ "intents": [...] }`. */
  enforcedIntentsPath?: string;
  rules: Record<string, 'error' | 'warning' | 'info' | 'off'>;
}
