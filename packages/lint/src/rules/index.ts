import type { LintRule } from '../types.js';

// Identity rules
import { rule as rule001 } from './identity/AXAG-LINT-001.js';
import { rule as rule002 } from './identity/AXAG-LINT-002.js';
import { rule as rule003 } from './identity/AXAG-LINT-003.js';

// Enum validation rules
import { rule as rule004 } from './enum-validation/AXAG-LINT-004.js';
import { rule as rule005 } from './enum-validation/AXAG-LINT-005.js';

// Safety rules
import { rule as rule006 } from './safety/AXAG-LINT-006.js';
import { rule as rule007 } from './safety/AXAG-LINT-007.js';
import { rule as rule023 } from './safety/AXAG-LINT-023.js';
import { rule as rule024 } from './safety/AXAG-LINT-024.js';
import { rule as rule025 } from './safety/AXAG-LINT-025.js';
import { rule as rule026 } from './safety/AXAG-LINT-026.js';

// Parameter rules
import { rule as rule008 } from './parameters/AXAG-LINT-008.js';
import { rule as rule009 } from './parameters/AXAG-LINT-009.js';

// Manifest rules
import { rule as rule010 } from './manifest/AXAG-LINT-010.js';

// Scope rules
import { rule as rule011 } from './scope/AXAG-LINT-011.js';
import { rule as rule018 } from './scope/AXAG-LINT-018.js';
import { rule as rule019 } from './scope/AXAG-LINT-019.js';
import { rule as rule020 } from './scope/AXAG-LINT-020.js';
import { rule as rule021 } from './scope/AXAG-LINT-021.js';
import { rule as rule022 } from './scope/AXAG-LINT-022.js';

// Contradiction rules
import { rule as rule012 } from './contradictions/AXAG-LINT-012.js';
import { rule as rule013 } from './contradictions/AXAG-LINT-013.js';
import { rule as rule014 } from './contradictions/AXAG-LINT-014.js';
import { rule as rule015 } from './contradictions/AXAG-LINT-015.js';
import { rule as rule016 } from './contradictions/AXAG-LINT-016.js';

// Unsafe mutation rules
import { rule as rule017 } from './unsafe-mutations/AXAG-LINT-017.js';

// Macro rules
import { rule as rule027 } from './macro/AXAG-LINT-027.js';
import { rule as rule028 } from './macro/AXAG-LINT-028.js';

// Harvesting rules
import { rule as rule029 } from './harvesting/AXAG-LINT-029.js';
import { rule as rule030 } from './harvesting/AXAG-LINT-030.js';
import { rule as rule031 } from './harvesting/AXAG-LINT-031.js';
import { rule as rule032 } from './harvesting/AXAG-LINT-032.js';

export const ALL_RULES: LintRule[] = [
  rule001, rule002, rule003,
  rule004, rule005,
  rule006, rule007, rule023, rule024, rule025, rule026,
  rule008, rule009,
  rule010,
  rule011, rule018, rule019, rule020, rule021, rule022,
  rule012, rule013, rule014, rule015, rule016,
  rule017,
  rule027, rule028,
  rule029, rule030, rule031, rule032,
];

export function getRuleById(id: string): LintRule | undefined {
  return ALL_RULES.find(r => r.id === id);
}

export function getRulesByCategory(category: string): LintRule[] {
  return ALL_RULES.filter(r => r.category === category);
}
