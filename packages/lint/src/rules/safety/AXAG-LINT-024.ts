import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** action-type is delete but risk-level below high. */
export const rule: LintRule = {
  id: 'AXAG-LINT-024',
  description: 'Delete action with risk-level below high',
  category: 'safety',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const actionType = element.attributes['axag-action-type'];
    if (actionType !== 'delete') return [];

    const riskLevel = element.attributes['axag-risk-level'];
    if (!riskLevel) return [];
    if (['high', 'critical'].includes(riskLevel)) return [];

    return [{
      ruleId: 'AXAG-LINT-024',
      severity: 'warning',
      message: `Delete action has axag-risk-level="${riskLevel}" — delete actions should typically be "high" or "critical"`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
