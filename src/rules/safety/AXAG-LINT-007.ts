import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** action-type is write/delete but idempotent not declared. */
export const rule: LintRule = {
  id: 'AXAG-LINT-007',
  description: 'Write/delete action without idempotent declaration',
  category: 'safety',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const actionType = element.attributes['axag-action-type'];
    if (!actionType || !['write', 'delete'].includes(actionType)) return [];

    if (element.attributes['axag-idempotent'] !== undefined) return [];

    return [{
      ruleId: 'AXAG-LINT-007',
      severity: 'warning',
      message: `axag-action-type="${actionType}" should declare axag-idempotent`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
