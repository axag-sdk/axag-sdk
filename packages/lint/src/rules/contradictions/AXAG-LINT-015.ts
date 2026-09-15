import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** action-type=navigate but side-effects declared. */
export const rule: LintRule = {
  id: 'AXAG-LINT-015',
  description: 'Navigate action with side effects',
  category: 'contradictions',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const actionType = element.attributes['axag-action-type'];
    if (actionType !== 'navigate') return [];

    const sideEffects = element.attributes['axag-side-effects'];
    if (!sideEffects) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(sideEffects);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    return [{
      ruleId: 'AXAG-LINT-015',
      severity: 'warning',
      message: 'axag-action-type="navigate" should not declare side effects — navigation is purely navigational',
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
