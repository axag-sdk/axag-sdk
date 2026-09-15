import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** write/delete, idempotent=false or missing, no side-effects declared. */
export const rule: LintRule = {
  id: 'AXAG-LINT-017',
  description: 'Non-idempotent mutation without side effects declaration',
  category: 'unsafe-mutations',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const actionType = element.attributes['axag-action-type'];
    if (!actionType || !['write', 'delete'].includes(actionType)) return [];

    const idempotent = element.attributes['axag-idempotent'];
    if (idempotent === 'true') return [];

    const sideEffects = element.attributes['axag-side-effects'];
    if (sideEffects) {
      try {
        const parsed = JSON.parse(sideEffects);
        if (Array.isArray(parsed) && parsed.length > 0) return [];
      } catch {
        // Invalid JSON, still flag
      }
    }

    return [{
      ruleId: 'AXAG-LINT-017',
      severity: 'warning',
      message: `Non-idempotent ${actionType} action should declare axag-side-effects`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
