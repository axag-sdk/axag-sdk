/**
 * Which rules a conformance level asks for.
 *
 * The levels come from the specification: basic is a usable annotation,
 * intermediate is production-ready, full is everything the vocabulary offers.
 * Grouping by category keeps a new rule at the right level automatically.
 */

import { ALL_RULES } from './rules/index.js';
import type { ConformanceLevel } from '@web-axag/core';

const CATEGORIES: Record<ConformanceLevel, string[]> = {
  // Is the annotation there, and does it say something valid?
  basic: ['identity', 'enum-validation', 'parameters', 'macro'],
  // Is it safe to act on, and scoped to the right data?
  intermediate: ['safety', 'scope', 'harvesting'],
  // Does it hold together, and is it enforced?
  full: ['contradictions', 'unsafe-mutations', 'manifest', 'build', 'enforcement'],
};

const ORDER: ConformanceLevel[] = ['basic', 'intermediate', 'full'];

/** Categories a level includes, with everything the levels below it. */
export function categoriesFor(level: ConformanceLevel): Set<string> {
  const included = ORDER.slice(0, ORDER.indexOf(level) + 1).flatMap(name => CATEGORIES[name]);
  return new Set(included);
}

/** Rule severities that switch off anything above `level`. */
export function rulesForLevel(level: ConformanceLevel): Record<string, 'off'> {
  const wanted = categoriesFor(level);
  const off: Record<string, 'off'> = {};
  for (const rule of ALL_RULES) {
    if (!wanted.has(rule.category)) off[rule.id] = 'off';
  }
  return off;
}
