import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** Element has axag-intent but no axag-entity. */
export const rule: LintRule = {
  id: 'AXAG-LINT-002',
  description: 'Element has axag-intent but missing axag-entity',
  category: 'identity',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    if (!element.attributes['axag-intent']) return [];
    if (element.attributes['axag-entity']) return [];

    return [{
      ruleId: 'AXAG-LINT-002',
      severity: 'error',
      message: `Element has axag-intent="${element.attributes['axag-intent']}" but is missing axag-entity`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
