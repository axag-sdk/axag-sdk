import { ENTITY_PATTERN } from '@axag/core';
import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** `axag-entity` that isn't a plain lowercase name, which the manifest schema rejects. */
export const rule: LintRule = {
  id: 'AXAG-LINT-035',
  description: 'axag-entity is not a lowercase name',
  category: 'identity',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const entity = element.attributes['axag-entity'];
    if (!entity || ENTITY_PATTERN.test(entity)) return [];

    return [{
      ruleId: 'AXAG-LINT-035',
      severity: 'error',
      message: `axag-entity="${entity}" must be lowercase letters and underscores, e.g. "purchase_order"`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
