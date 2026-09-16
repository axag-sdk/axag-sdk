import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

const INTERACTIVE_TAGS = ['button', 'a', 'input', 'form', 'select', 'textarea'];

function isInteractive(el: AnnotatedElement): boolean {
  if (INTERACTIVE_TAGS.includes(el.tagName)) return true;
  if (el.allAttributes['onclick'] !== undefined) return true;
  if (el.allAttributes['role'] === 'button') return true;
  if (el.allAttributes['type'] === 'submit') return true;
  if (el.tagName === 'a' && el.allAttributes['href'] !== undefined) return true;
  return false;
}

/** Attribute spellings a framework uses to bind a spec: JSX, Vue, Angular. */
const DYNAMIC_BINDINGS = ['axag', ':axag', 'v-axag', '[axag]'];

function hasDynamicBinding(el: AnnotatedElement): boolean {
  return DYNAMIC_BINDINGS.some(name => el.allAttributes[name] !== undefined);
}

/** Interactive element has no axag-intent. */
export const rule: LintRule = {
  id: 'AXAG-LINT-001',
  description: 'Interactive element missing axag-intent attribute',
  category: 'identity',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    // Only flag interactive elements that have NO axag-intent
    if (!isInteractive(element)) return [];
    if (element.attributes['axag-intent']) return [];
    // A submit button of an annotated form, or a form feeding an annotated action, is already covered.
    if (element.coveredBy) return [];
    // Bound at runtime: annotated, just not in a form this linter can read. AXAG-LINT-033 covers it.
    if (hasDynamicBinding(element)) return [];

    return [{
      ruleId: 'AXAG-LINT-001',
      severity: 'error',
      message: `Interactive <${element.tagName}> element is missing axag-intent attribute`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
