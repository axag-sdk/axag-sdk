import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** action-type=delete but no scope declared. */
export const rule: LintRule = {
  id: 'AXAG-LINT-021',
  description: 'Delete action without scope declaration',
  category: 'scope',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const actionType = element.attributes['axag-action-type'];
    if (actionType !== 'delete') return [];

    if (element.attributes['axag-scope']) return [];

    return [{
      ruleId: 'AXAG-LINT-021',
      severity: 'warning',
      message: 'Delete action should declare axag-scope to indicate blast radius',
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
