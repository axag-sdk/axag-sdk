import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** Invalid JSON in required-parameters or optional-parameters. */
export const rule: LintRule = {
  id: 'AXAG-LINT-009',
  description: 'Invalid JSON in parameter attributes',
  category: 'parameters',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const attrName of ['axag-required-parameters', 'axag-optional-parameters']) {
      const raw = element.attributes[attrName];
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          diagnostics.push({
            ruleId: 'AXAG-LINT-009',
            severity: 'error',
            message: `${attrName} must be a JSON array, got ${typeof parsed}`,
            filePath: element.filePath,
            line: element.line,
            column: element.column,
          });
        }
      } catch {
        diagnostics.push({
          ruleId: 'AXAG-LINT-009',
          severity: 'error',
          message: `${attrName} contains invalid JSON`,
          filePath: element.filePath,
          line: element.line,
          column: element.column,
        });
      }
    }

    return diagnostics;
  },
};
