import { INTENT_PATTERN } from '@axag/core';
import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/**
 * `axag-intent` that doesn't match `entity.verb`. The manifest schema rejects it,
 * so this fails a build rather than producing a tool an agent can find.
 */
export const rule: LintRule = {
  id: 'AXAG-LINT-034',
  description: 'axag-intent does not match entity.verb',
  category: 'identity',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    const intent = element.attributes['axag-intent'];
    if (!intent || INTENT_PATTERN.test(intent)) return [];

    return [{
      ruleId: 'AXAG-LINT-034',
      severity: 'error',
      message: `axag-intent="${intent}" must be entity.verb in lowercase letters and underscores, e.g. "cart.add_item"`,
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
