import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

const ACTION_ROLES = new Set(['button', 'link', 'menuitem', 'tab', 'switch', 'checkbox']);

function isActionable(el: AnnotatedElement): boolean {
  const type = el.allAttributes.type?.toLowerCase();
  if (el.tagName === 'button' || el.tagName === 'a') return true;
  if (el.tagName === 'input' && (type === 'submit' || type === 'button' || type === 'image')) return true;
  return ACTION_ROLES.has(el.allAttributes.role ?? '');
}

/** Annotated control has no accessible name — people using assistive tech can't tell what it does either. */
export const rule: LintRule = {
  id: 'AXAG-LINT-031',
  description: 'Annotated element has no accessible name',
  category: 'harvesting',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    if (!element.attributes['axag-intent'] || !isActionable(element) || element.accessibleName) return [];
    return [{
      ruleId: 'AXAG-LINT-031',
      severity: 'error',
      message: `<${element.tagName}> for "${element.attributes['axag-intent']}" has no accessible name. Add visible text, aria-label or aria-labelledby`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
