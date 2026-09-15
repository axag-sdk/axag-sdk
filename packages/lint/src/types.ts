/** A parsed element with axag-* attributes extracted from source. */
export interface AnnotatedElement {
  /** HTML tag name (button, a, input, etc.). */
  tagName: string;
  /** All axag-* attributes on the element (full attribute names as keys). */
  attributes: Record<string, string>;
  /** All HTML attributes on the element (for context checks like onclick, role). */
  allAttributes: Record<string, string>;
  /** Source file path. */
  filePath: string;
  /** Line number in source (1-based). */
  line: number;
  /** Column number in source (1-based). */
  column: number;
  /** Raw HTML snippet (optional, for error context). */
  rawHtml?: string;
}

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
