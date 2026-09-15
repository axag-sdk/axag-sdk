/** A parsed element with axag-* attributes extracted from source. */
export type { AnnotatedElement } from '@axag/core';
import type { AnnotatedElement } from '@axag/core';

/** Context for the file being linted. */
export interface FileContext {
  filePath: string;
  elements: AnnotatedElement[];
  manifest?: ManifestData;
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
  required_parameters?: Array<{ name: string }>;
  optional_parameters?: Array<{ name: string }>;
  [key: string]: unknown;
}

/** User config from .axaglintrc.json */
export interface LintConfig {
  include: string[];
  exclude: string[];
  manifestPath?: string;
  rules: Record<string, 'error' | 'warning' | 'info' | 'off'>;
}
