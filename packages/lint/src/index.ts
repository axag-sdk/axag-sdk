// Library entry point
export { lint } from './engine.js';
export type { LintResult } from './engine.js';
export { ALL_RULES, getRuleById, getRulesByCategory } from './rules/index.js';
export { parseFile, parseHtml, parseJsx } from './parser/index.js';
export { loadConfig } from './config/loader.js';
export { DEFAULT_CONFIG } from './config/defaults.js';
export { consoleReport } from './reporter/console-reporter.js';
export { jsonReport } from './reporter/json-reporter.js';
export { githubReport } from './reporter/github-reporter.js';

export type {
  AnnotatedElement,
  FileContext,
  Diagnostic,
  LintRule,
  ManifestData,
  ManifestAction,
  LintConfig,
} from './types.js';
