import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** axag macro and a longhand attribute set the same field to different values. */
export const rule: LintRule = {
  id: 'AXAG-LINT-028',
  description: 'axag macro conflicts with a longhand attribute',
  category: 'macro',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    return (element.diagnostics ?? [])
      .filter(d => d.code === 'AXAG-CORE-005')
      .map(d => ({
        ruleId: 'AXAG-LINT-028',
        severity: 'error' as const,
        message: `${d.message}. Remove one of them.`,
        filePath: element.filePath,
        line: element.line,
        column: element.column,
      }));
  },
};
