import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** Has role-based attrs (approval-required, approval-roles) but no scope. */
export const rule: LintRule = {
  id: 'AXAG-LINT-011',
  description: 'Role-based attributes without scope declaration',
  category: 'scope',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const hasRoleAttrs = element.attributes['axag-approval-required'] !== undefined
      || element.attributes['axag-approval-roles'] !== undefined;

    if (!hasRoleAttrs) return [];
    if (element.attributes['axag-scope']) return [];

    return [{
      ruleId: 'AXAG-LINT-011',
      severity: 'warning',
      message: 'Element has role-based attributes but is missing axag-scope',
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
