import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

const TENANT_PARAMETERS = ['tenant_id', 'tenant', 'org_id', 'organization_id', 'account_id', 'workspace_id'];

/**
 * A tenant-scoped action that takes the tenant as a parameter lets an agent
 * choose which tenant to act on. The tenant belongs to the session, so the
 * parameter should be removed and injected by the runtime instead.
 */
export const rule: LintRule = {
  id: 'AXAG-LINT-036',
  description: 'Tenant-scoped action exposes a tenant identifier as a parameter',
  category: 'enforcement',
  defaultSeverity: 'error',
  check(element: AnnotatedElement, _context: FileContext): Diagnostic[] {
    if (element.attributes['axag-scope'] !== 'tenant') return [];

    const declared = [
      ...parameterNames(element.attributes['axag-required-parameters']),
      ...parameterNames(element.attributes['axag-optional-parameters']),
      ...(element.harvested?.required ?? []).map(p => p.name),
      ...(element.harvested?.optional ?? []).map(p => p.name),
    ];
    const exposed = [...new Set(declared)].filter(name => TENANT_PARAMETERS.includes(name));
    if (exposed.length === 0) return [];

    return exposed.map(name => ({
      ruleId: 'AXAG-LINT-036',
      severity: 'error' as const,
      message:
        `"${element.attributes['axag-intent']}" is tenant-scoped but takes "${name}" as a parameter. ` +
        'Take the tenant from the session instead, so an agent cannot choose it',
      filePath: element.filePath,
      line: element.line,
      column: element.column,
    }));
  },
};

function parameterNames(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => (typeof item === 'string' ? item : (item as { name?: string })?.name)).filter((n): n is string => Boolean(n));
  } catch {
    return [];
  }
}
