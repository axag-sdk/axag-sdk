import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** A harvested parameter has no label, so the agent-facing schema has no description for it. */
export const rule: LintRule = {
  id: 'AXAG-LINT-032',
  description: 'Harvested parameter has no label or description',
  category: 'harvesting',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const harvested = element.harvested;
    if (!harvested) return [];
    return [...harvested.required, ...harvested.optional]
      .filter(param => !param.description)
      .map(param => ({
        ruleId: 'AXAG-LINT-032',
        severity: 'warning' as const,
        message: `Parameter "${param.name}" has no <label>, aria-label or axag-parameter-description; a placeholder is not a label`,
        filePath: element.filePath,
        line: element.line,
        column: element.column,
      }));
  },
};
