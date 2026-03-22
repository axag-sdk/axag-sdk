import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

const TENANT_ENTITIES = ['organization', 'company', 'department', 'team', 'tenant', 'workspace', 'billing', 'subscription', 'plan', 'invoice'];

/** action-type=write, scope=user, but entity suggests tenant-level. */
export const rule: LintRule = {
  id: 'AXAG-LINT-022',
  description: 'Write action with user scope but tenant-level entity',
  category: 'scope',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const actionType = element.attributes['axag-action-type'];
    if (actionType !== 'write') return [];

    const scope = element.attributes['axag-scope'];
    if (scope !== 'user') return [];

    const entity = element.attributes['axag-entity'];
    if (!entity || !TENANT_ENTITIES.includes(entity)) return [];

    return [{
      ruleId: 'AXAG-LINT-022',
      severity: 'warning',
      message: `Entity "${entity}" suggests tenant-level but scope is "user" — consider "tenant" scope`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
