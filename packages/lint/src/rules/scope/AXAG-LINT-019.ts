import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** roles contain "superadmin" but scope is "tenant". */
export const rule: LintRule = {
  id: 'AXAG-LINT-019',
  description: 'Superadmin role with tenant scope',
  category: 'scope',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const scope = element.attributes['axag-scope'];
    if (scope !== 'tenant') return [];

    const rolesRaw = element.attributes['axag-approval-roles'];
    if (!rolesRaw) return [];

    let roles: string[];
    try {
      roles = JSON.parse(rolesRaw);
    } catch {
      return [];
    }

    if (!Array.isArray(roles) || !roles.includes('superadmin')) return [];

    return [{
      ruleId: 'AXAG-LINT-019',
      severity: 'warning',
      message: 'Approval roles contain "superadmin" but scope is "tenant" — superadmin typically requires "global" scope',
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
