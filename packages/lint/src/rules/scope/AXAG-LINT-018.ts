import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

const PERSONAL_ENTITIES = ['profile', 'preference', 'user_settings', 'user_preference', 'my_account'];

/** scope=global but entity is personal. */
export const rule: LintRule = {
  id: 'AXAG-LINT-018',
  description: 'Global scope with personal entity',
  category: 'scope',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const scope = element.attributes['axag-scope'];
    if (scope !== 'global') return [];

    const entity = element.attributes['axag-entity'];
    if (!entity || !PERSONAL_ENTITIES.includes(entity)) return [];

    return [{
      ruleId: 'AXAG-LINT-018',
      severity: 'warning',
      message: `axag-scope="global" but entity "${entity}" is personal — consider "user" scope`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
