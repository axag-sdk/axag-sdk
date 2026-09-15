import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** Element has axag-intent but no axag-action-type. */
export const rule: LintRule = {
  id: 'AXAG-LINT-003',
  description: 'Element has axag-intent but missing axag-action-type',
  category: 'identity',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    if (!element.attributes['axag-intent']) return [];
    if (element.attributes['axag-action-type']) return [];

    return [{
      ruleId: 'AXAG-LINT-003',
      severity: 'error',
      message: `Element has axag-intent="${element.attributes['axag-intent']}" but is missing axag-action-type`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
