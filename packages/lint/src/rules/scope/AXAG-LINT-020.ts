import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/** Same entity in same file with different scopes. File-level rule. */
export const rule: LintRule = {
  id: 'AXAG-LINT-020',
  description: 'Same entity with different scopes in the same file',
  category: 'scope',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, context: FileContext): Diagnostic[] {
    const entity = element.attributes['axag-entity'];
    const scope = element.attributes['axag-scope'];
    if (!entity || !scope) return [];

    // Check if any other element in the same file has the same entity but different scope
    for (const other of context.elements) {
      if (other === element) continue;
      const otherEntity = other.attributes['axag-entity'];
      const otherScope = other.attributes['axag-scope'];
      if (otherEntity === entity && otherScope && otherScope !== scope) {
        return [{
          ruleId: 'AXAG-LINT-020',
          severity: 'warning',
          message: `Entity "${entity}" has scope="${scope}" here but scope="${otherScope}" at line ${other.line}`,
          filePath: element.filePath,
          line: element.line,
          column: element.column,
        }];
      }
    }

    return [];
  },
};
