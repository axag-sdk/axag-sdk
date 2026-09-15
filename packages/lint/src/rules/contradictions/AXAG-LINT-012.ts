import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** approval-required=true but no approval-roles. */
export const rule: LintRule = {
  id: 'AXAG-LINT-012',
  description: 'Approval required without approval roles',
  category: 'contradictions',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const approval = element.attributes['axag-approval-required'];
    if (approval !== 'true') return [];

    const roles = element.attributes['axag-approval-roles'];
    if (roles) {
      try {
        const parsed = JSON.parse(roles);
        if (Array.isArray(parsed) && parsed.length > 0) return [];
      } catch {
        // Invalid JSON is handled by AXAG-LINT-009
      }
    }

    return [{
      ruleId: 'AXAG-LINT-012',
      severity: 'error',
      message: 'axag-approval-required="true" but no axag-approval-roles declared',
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
