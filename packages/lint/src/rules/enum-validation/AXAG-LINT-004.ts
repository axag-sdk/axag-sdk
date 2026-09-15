import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

const VALID_ACTION_TYPES = ['read', 'write', 'delete', 'navigate'];

/** axag-action-type value not in allowed enum. */
export const rule: LintRule = {
  id: 'AXAG-LINT-004',
  description: 'Invalid axag-action-type value',
  category: 'enum-validation',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const value = element.attributes['axag-action-type'];
    if (!value) return [];
    if (VALID_ACTION_TYPES.includes(value)) return [];

    return [{
      ruleId: 'AXAG-LINT-004',
      severity: 'error',
      message: `Invalid axag-action-type="${value}". Must be one of: ${VALID_ACTION_TYPES.join(', ')}`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
