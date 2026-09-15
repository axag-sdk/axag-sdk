import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** action-type is write/delete but risk-level not declared. */
export const rule: LintRule = {
  id: 'AXAG-LINT-023',
  description: 'Write/delete action without risk-level',
  category: 'safety',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const actionType = element.attributes['axag-action-type'];
    if (!actionType || !['write', 'delete'].includes(actionType)) return [];

    if (element.attributes['axag-risk-level'] !== undefined) return [];

    return [{
      ruleId: 'AXAG-LINT-023',
      severity: 'error',
      message: `axag-action-type="${actionType}" must declare axag-risk-level`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
