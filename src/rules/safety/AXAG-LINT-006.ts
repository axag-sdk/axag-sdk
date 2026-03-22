import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** risk-level is high/critical but confirmation-required is not "true". */
export const rule: LintRule = {
  id: 'AXAG-LINT-006',
  description: 'High/critical risk without confirmation-required',
  category: 'safety',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const riskLevel = element.attributes['axag-risk-level'];
    if (!riskLevel || !['high', 'critical'].includes(riskLevel)) return [];

    const confirmation = element.attributes['axag-confirmation-required'];
    if (confirmation === 'true') return [];

    return [{
      ruleId: 'AXAG-LINT-006',
      severity: 'warning',
      message: `axag-risk-level="${riskLevel}" should have axag-confirmation-required="true"`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
      fix: { attribute: 'axag-confirmation-required', value: 'true' },
    }];
  },
};
