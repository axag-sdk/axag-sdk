/**
 * axag-cli — public API for programmatic usage.
 */

export { scanUrl, scanDirectory } from './scanner/index.js';
export { inferAnnotations } from './annotator/index.js';
export { interactiveReview } from './interactive/index.js';
export { generateReport } from './reporter/index.js';
export { applyAnnotations } from './applier/index.js';
export { loadConfig } from './utils/config.js';
export type {
  ScannedElement,
  InferredAnnotation,
  ScanResult,
  ScanReport,
  PageResult,
  ValidationRuleResult,
} from './types/index.js';
