import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** intent value not found in loaded manifest. */
export const rule: LintRule = {
  id: 'AXAG-LINT-010',
  description: 'Intent not found in manifest',
  category: 'manifest',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, context: FileContext): Diagnostic[] {
    // Skip if no manifest loaded
    if (!context.manifest) return [];

    const intent = element.attributes['axag-intent'];
    if (!intent) return [];

    const found = context.manifest.actions.some(a => a.intent === intent);
    if (found) return [];

    return [{
      ruleId: 'AXAG-LINT-010',
      severity: 'warning',
      message: `Intent "${intent}" not found in manifest`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
