import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** A control in the action's form has no name, so it can't become a parameter. */
export const rule: LintRule = {
  id: 'AXAG-LINT-029',
  description: 'Form control has no name and cannot become a parameter',
  category: 'harvesting',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const intent = element.attributes['axag-intent'];
    return (element.harvested?.unnamed ?? []).map(control => ({
      ruleId: 'AXAG-LINT-029',
      severity: 'warning' as const,
      message: `<${control.tagName}> is submitted with "${intent}" but has no name, id or axag-parameter, so agents can't fill it`,
      filePath: element.filePath,
      line: control.line,
      column: control.column,
    }));
  },
};
