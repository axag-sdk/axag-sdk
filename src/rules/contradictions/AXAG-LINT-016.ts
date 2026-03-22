import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** scope is not tenant but roles contain tenant-specific names (tenant_admin). */
export const rule: LintRule = {
  id: 'AXAG-LINT-016',
  description: 'Tenant-specific role name with non-tenant scope',
  category: 'contradictions',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const scope = element.attributes['axag-scope'];
    if (scope === 'tenant') return [];

    const rolesRaw = element.attributes['axag-approval-roles'];
    if (!rolesRaw) return [];

    let roles: string[];
    try {
      roles = JSON.parse(rolesRaw);
    } catch {
      return [];
    }

    if (!Array.isArray(roles)) return [];

    const tenantRoles = roles.filter((r: string) => /^tenant_/i.test(r));
    if (tenantRoles.length === 0) return [];

    return [{
      ruleId: 'AXAG-LINT-016',
      severity: 'warning',
      message: `Role "${tenantRoles[0]}" suggests tenant scope but scope is "${scope || 'not declared'}"`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
