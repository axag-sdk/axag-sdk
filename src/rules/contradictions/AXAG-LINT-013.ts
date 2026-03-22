import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** action-type=read but risk-level=critical. */
export const rule: LintRule = {
  id: 'AXAG-LINT-013',
  description: 'Read action with critical risk level',
  category: 'contradictions',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const actionType = element.attributes['axag-action-type'];
    if (actionType !== 'read') return [];

    const riskLevel = element.attributes['axag-risk-level'];
    if (riskLevel !== 'critical') return [];

    return [{
      ruleId: 'AXAG-LINT-013',
      severity: 'error',
      message: 'axag-action-type="read" contradicts axag-risk-level="critical" — read operations should not be critical risk',
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
