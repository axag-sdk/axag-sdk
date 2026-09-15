/* ─── Core Type Definitions for axag-cli ─────── */

import type { ActionType, RiskLevel, ConformanceLevel } from '../utils/constants.js';

/** A single interactive element discovered during a scan. */
export interface ScannedElement {
  /** Unique ID assigned by the scanner. */
  id: string;
  /** CSS selector path to the element. */
  selector: string;
  /** HTML tag name (button, a, input, etc.). */
  tagName: string;
  /** Visible text content (trimmed). */
  textContent: string;
  /** Existing HTML attributes. */
  attributes: Record<string, string>;
  /** ARIA attributes already present. */
  ariaAttributes: Record<string, string>;
  /** Element's role (explicit or implicit). */
  role: string | null;
  /** URL of the page where this element was found. */
  pageUrl: string;
  /** XPath to the element. */
  xpath: string;
  /** Parent context — nearest landmark/section heading. */
  parentContext: string;
  /** Screenshot data URI (thumbnail) if captured. */
  screenshot?: string;
  /** Whether the element already has any axag-* attributes. */
  hasExistingAnnotations: boolean;
  /** Existing axag-* attributes if any. */
  existingAnnotations: Record<string, string>;
}

/** An inferred AXAG annotation for one element. */
export interface InferredAnnotation {
  /** Reference to the ScannedElement.id. */
  elementId: string;
  /** The selector for applying this annotation. */
  selector: string;
  /** The page URL where the element lives. */
  pageUrl: string;
  /** Inferred axag-intent value. */
  intent: string;
  /** Inferred axag-entity value. */
  entity: string;
  /** Inferred axag-action-type. */
  actionType: ActionType;
  /** Inferred axag-description. */
  description: string;
  /** Inferred required parameters. */
  requiredParameters: string[];
  /** Inferred optional parameters. */
  optionalParameters: string[];
  /** Inferred risk level. */
  riskLevel: RiskLevel;
  /** Whether confirmation should be required. */
  confirmationRequired: boolean;
  /** Whether the action is idempotent. */
  idempotent: boolean;
  /** Whether the action is async. */
  async: boolean;
  /** Confidence score 0-1 for this inference. */
  confidence: number;
  /** Reasoning for the inference (shown during review). */
  reasoning: string;
  /** The full set of axag-* attributes to apply. */
  attributes: Record<string, string>;
  /** User review status. */
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  /** User modifications (if status === 'modified'). */
  userOverrides?: Record<string, string>;
}

/** A complete scan result persisted to disk. */
export interface ScanResult {
  /** Scan metadata. */
  meta: {
    scannedAt: string;
    target: string;
    targetType: 'url' | 'directory';
    domain: string;
    pagesScanned: number;
    totalElements: number;
    totalAnnotations: number;
    scanDurationMs: number;
    cliVersion: string;
  };
  /** All discovered pages. */
  pages: PageResult[];
  /** All discovered elements. */
  elements: ScannedElement[];
  /** All inferred annotations. */
  annotations: InferredAnnotation[];
}

/** Results for a single page. */
export interface PageResult {
  url: string;
  title: string;
  elementCount: number;
  annotationCount: number;
}

/** Report output. */
export interface ScanReport {
  meta: ScanResult['meta'];
  summary: {
    totalElements: number;
    annotated: number;
    accepted: number;
    rejected: number;
    modified: number;
    pending: number;
    coveragePercent: number;
    averageConfidence: number;
    riskDistribution: Record<RiskLevel, number>;
    actionTypeDistribution: Record<ActionType, number>;
  };
  pages: PageResult[];
  annotations: InferredAnnotation[];
  conformance: {
    level: ConformanceLevel;
    passed: number;
    failed: number;
    warnings: number;
    rules: ValidationRuleResult[];
  };
}

/** Individual validation rule result. */
export interface ValidationRuleResult {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  passed: boolean;
  message: string;
  elementId?: string;
  selector?: string;
}
