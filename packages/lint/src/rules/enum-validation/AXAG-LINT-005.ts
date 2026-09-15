import { RISK_LEVELS } from '@axag/core';
import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

const VALID_RISK_LEVELS: readonly string[] = RISK_LEVELS;

/** axag-risk-level value not in allowed enum. */
export const rule: LintRule = {
  id: 'AXAG-LINT-005',
  description: 'Invalid axag-risk-level value',
  category: 'enum-validation',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const value = element.attributes['axag-risk-level'];
    if (!value) return [];
    if (VALID_RISK_LEVELS.includes(value)) return [];

    return [{
      ruleId: 'AXAG-LINT-005',
      severity: 'error',
      message: `Invalid axag-risk-level="${value}". Must be one of: ${VALID_RISK_LEVELS.join(', ')}`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
