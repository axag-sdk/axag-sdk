import type { LintRule, AnnotatedElement, FileContext, Diagnostic } from '../../types.js';

const SCHEMA_SOURCES = new Set(['zod', 'openapi']);

/** The form disagrees with the linked Zod/OpenAPI schema recorded in the manifest. */
export const rule: LintRule = {
  id: 'AXAG-LINT-030',
  description: 'Form constraint disagrees with the linked schema',
  category: 'harvesting',
  defaultSeverity: 'warning',
  check(element: AnnotatedElement, context: FileContext): Diagnostic[] {
    const harvested = element.harvested;
    const intent = element.attributes['axag-intent'];
    if (!harvested || !intent || !context.manifest) return [];
    const action = context.manifest.actions.find(a => a.intent === intent);
    if (!action) return [];

    const schemaParams = new Map<string, { required: boolean; type?: string; enum?: unknown[]; source?: string }>();
    for (const p of action.required_parameters ?? []) schemaParams.set(p.name, { ...p, required: true });
    for (const p of action.optional_parameters ?? []) schemaParams.set(p.name, { ...p, required: false });

    const diagnostics: Diagnostic[] = [];
    const report = (message: string) =>
      diagnostics.push({
        ruleId: 'AXAG-LINT-030',
        severity: 'warning',
        message: `${message} — the form and the API may have drifted`,
        filePath: element.filePath,
        line: element.line,
        column: element.column,
      });

    for (const [list, required] of [[harvested.required, true], [harvested.optional, false]] as const) {
      for (const field of list) {
        const schema = schemaParams.get(field.name);
        if (!schema?.source || !SCHEMA_SOURCES.has(schema.source)) continue;
        const where = `"${field.name}" (${schema.source})`;

        if (schema.required !== required) {
          report(`${where} is ${schema.required ? 'required' : 'optional'} in the schema but ${required ? 'required' : 'optional'} in the form`);
        }
        if (schema.type && !compatibleTypes(schema.type, field.type)) {
          report(`${where} is ${schema.type} in the schema but ${field.type} in the form`);
        }
        if (schema.enum && field.enum && !sameSet(schema.enum, field.enum)) {
          report(`${where} allows ${JSON.stringify(schema.enum)} in the schema but ${JSON.stringify(field.enum)} in the form`);
        }
      }
    }
    return diagnostics;
  },
};

function compatibleTypes(a: string, b: string): boolean {
  const numeric = (t: string) => t === 'number' || t === 'integer';
  return a === b || (numeric(a) && numeric(b));
}

function sameSet(a: unknown[], b: unknown[]): boolean {
  const left = new Set(a.map(String));
  return left.size === new Set(b.map(String)).size && b.every(v => left.has(String(v)));
}
