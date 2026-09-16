import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/**
 * `axag={spec}` that build-time extraction can't read. The action then exists
 * only once the page runs, so it is missing from the manifest a CI job checks.
 */
export const rule: LintRule = {
  id: 'AXAG-LINT-033',
  description: 'Dynamic axag value is registered at runtime only',
  category: 'build',
  defaultSeverity: 'info',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const bound =
      element.allAttributes.axag === '' ||
      [':axag', 'v-axag', '[axag]'].some(name => element.allAttributes[name] !== undefined);
    if (!bound || element.attributes['axag-intent']) return [];

    return [{
      ruleId: 'AXAG-LINT-033',
      severity: 'info',
      message:
        `<${element.tagName}> has a dynamic axag value. Build-time extraction can read a module-level ` +
        'const or defineAction({...}); anything else is registered at runtime and is absent from the manifest',
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
