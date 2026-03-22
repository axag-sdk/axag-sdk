import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/**
 * Safety metadata mismatch for declared risk level.
 *
 * Matrix:
 * - none: no additional metadata required
 * - low: idempotent recommended
 * - medium: confirmation-required + idempotent
 * - high: confirmation-required + idempotent + preconditions
 * - critical: confirmation-required + approval-required + approval-roles + idempotent + preconditions
 */
export const rule: LintRule = {
  id: 'AXAG-LINT-026',
  description: 'Safety metadata mismatch for declared risk level',
  category: 'safety',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const riskLevel = element.attributes['axag-risk-level'];
    if (!riskLevel) return [];

    const diagnostics: Diagnostic[] = [];
    const has = (attr: string) => element.attributes[`axag-${attr}`] !== undefined;

    switch (riskLevel) {
      case 'medium':
        if (!has('confirmation-required')) {
          diagnostics.push(makeDiag(element, 'medium risk should declare axag-confirmation-required'));
        }
        if (!has('idempotent')) {
          diagnostics.push(makeDiag(element, 'medium risk should declare axag-idempotent'));
        }
        break;

      case 'high':
        if (!has('confirmation-required')) {
          diagnostics.push(makeDiag(element, 'high risk should declare axag-confirmation-required'));
        }
        if (!has('idempotent')) {
          diagnostics.push(makeDiag(element, 'high risk should declare axag-idempotent'));
        }
        if (!has('preconditions')) {
          diagnostics.push(makeDiag(element, 'high risk should declare axag-preconditions'));
        }
        break;

      case 'critical':
        if (!has('confirmation-required')) {
          diagnostics.push(makeDiag(element, 'critical risk should declare axag-confirmation-required'));
        }
        if (!has('approval-required')) {
          diagnostics.push(makeDiag(element, 'critical risk should declare axag-approval-required'));
        }
        if (!has('approval-roles')) {
          diagnostics.push(makeDiag(element, 'critical risk should declare axag-approval-roles'));
        }
        if (!has('idempotent')) {
          diagnostics.push(makeDiag(element, 'critical risk should declare axag-idempotent'));
        }
        if (!has('preconditions')) {
          diagnostics.push(makeDiag(element, 'critical risk should declare axag-preconditions'));
        }
        break;
    }

    return diagnostics;
  },
};

function makeDiag(el: AnnotatedElement, message: string): Diagnostic {
  return {
    ruleId: 'AXAG-LINT-026',
    severity: 'warning',
    message,
    filePath: el.filePath,
    line: el.line,
    column: el.column,
  };
}
