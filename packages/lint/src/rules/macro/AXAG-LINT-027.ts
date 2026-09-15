import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** axag macro value doesn't match the grammar. */
export const rule: LintRule = {
  id: 'AXAG-LINT-027',
  description: 'Invalid axag macro syntax',
  category: 'macro',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    return (element.diagnostics ?? [])
      .filter(d => d.code === 'AXAG-CORE-004')
      .map(d => ({
        ruleId: 'AXAG-LINT-027',
        severity: 'error' as const,
        message: `${d.message} (in axag="${element.allAttributes.axag}")`,
        filePath: element.filePath,
        line: element.line,
        column: element.column,
      }));
  },
};
