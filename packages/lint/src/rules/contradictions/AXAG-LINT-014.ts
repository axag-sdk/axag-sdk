import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** action-type=write with precondition containing "must exist" / "already exists". */
export const rule: LintRule = {
  id: 'AXAG-LINT-014',
  description: 'Write action with contradictory precondition',
  category: 'contradictions',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const actionType = element.attributes['axag-action-type'];
    if (actionType !== 'write') return [];

    const preRaw = element.attributes['axag-preconditions'];
    if (!preRaw) return [];

    let preconditions: string[];
    try {
      preconditions = JSON.parse(preRaw);
    } catch {
      return [];
    }

    if (!Array.isArray(preconditions)) return [];

    const contradictory = preconditions.filter(
      (p: string) => /must exist|already exists/i.test(p)
    );

    if (contradictory.length === 0) return [];

    return [{
      ruleId: 'AXAG-LINT-014',
      severity: 'warning',
      message: `Write action has contradictory precondition: "${contradictory[0]}" — write typically creates new resources`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
