import { RISK_LEVELS } from '@axag/core';
import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

/**
 * A high-risk action the server doesn't enforce. Client-side confirmation and
 * tenant checks only guide a cooperative agent; without the server half, an
 * agent holding the page's credentials can skip them.
 *
 * Needs `enforcedIntentsPath` in the config, pointing at the list
 * `enforcer.enforcedIntents()` produces.
 */
export const rule: LintRule = {
  id: 'AXAG-LINT-037',
  description: 'High-risk action has no server-side enforcement',
  category: 'enforcement',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, context: FileContext): Diagnostic[] {
    if (!context.enforcedIntents) return [];

    const intent = element.attributes['axag-intent'];
    const risk = element.attributes['axag-risk-level'];
    if (!intent || !risk) return [];
    if (RISK_LEVELS.indexOf(risk as never) < RISK_LEVELS.indexOf('high')) return [];
    if (context.enforcedIntents.has(intent)) return [];

    return [{
      ruleId: 'AXAG-LINT-037',
      severity: 'warning',
      message:
        `"${intent}" is ${risk} risk but is not in the server's enforced intents. ` +
        'Client middleware alone does not stop an agent calling the API directly',
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }];
  },
};
