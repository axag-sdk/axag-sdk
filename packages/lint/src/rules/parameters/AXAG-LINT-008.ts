import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** A param name appears in both required-parameters and optional-parameters. */
export const rule: LintRule = {
  id: 'AXAG-LINT-008',
  description: 'Parameter name appears in both required and optional parameters',
  category: 'parameters',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const reqRaw = element.attributes['axag-required-parameters'];
    const optRaw = element.attributes['axag-optional-parameters'];
    if (!reqRaw || !optRaw) return [];

    let reqParams: string[];
    let optParams: string[];
    try {
      reqParams = JSON.parse(reqRaw);
      optParams = JSON.parse(optRaw);
    } catch {
      // Invalid JSON is handled by AXAG-LINT-009
      return [];
    }

    if (!Array.isArray(reqParams) || !Array.isArray(optParams)) return [];

    const duplicates = reqParams.filter((p: string) => optParams.includes(p));
    if (duplicates.length === 0) return [];

    return [{
      ruleId: 'AXAG-LINT-008',
      severity: 'error',
      message: `Parameter(s) "${duplicates.join('", "')}" appear in both required and optional parameters`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
