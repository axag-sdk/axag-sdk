import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** action-type is read but risk-level above low. */
export const rule: LintRule = {
  id: 'AXAG-LINT-025',
  description: 'Read action with risk-level above low',
  category: 'safety',
  defaultSeverity: 'info',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const actionType = element.attributes['axag-action-type'];
    if (actionType !== 'read') return [];

    const riskLevel = element.attributes['axag-risk-level'];
    if (!riskLevel || ['none', 'low'].includes(riskLevel)) return [];

    return [{
      ruleId: 'AXAG-LINT-025',
      severity: 'info',
      message: `Read action has axag-risk-level="${riskLevel}" — read actions are typically "none" or "low"`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
