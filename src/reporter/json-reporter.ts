import type { LintResult } from '../engine.js';

interface JsonOutput {
  results: Array<{
    filePath: string;
    diagnostics: Array<{
      ruleId: string;
      severity: string;
      message: string;
      line: number;
      column: number;
    }>;
  }>;
  summary: {
    errors: number;
    warnings: number;
    files: number;
    elements: number;
  };
}

export function jsonReport(result: LintResult): string {
  // Group diagnostics by file
  const fileMap = new Map<string, Array<{
    ruleId: string;
    severity: string;
    message: string;
    line: number;
    column: number;
  }>>();

  for (const diag of result.diagnostics) {
    if (!fileMap.has(diag.filePath)) {
      fileMap.set(diag.filePath, []);
    }
    fileMap.get(diag.filePath)!.push({
      ruleId: diag.ruleId,
      severity: diag.severity,
      message: diag.message,
      line: diag.line,
      column: diag.column,
    });
  }

  const output: JsonOutput = {
    results: Array.from(fileMap.entries()).map(([filePath, diagnostics]) => ({
      filePath,
      diagnostics,
    })),
    summary: {
      errors: result.errorCount,
      warnings: result.warningCount,
      files: result.filesScanned,
      elements: result.elementsFound,
    },
  };

  return JSON.stringify(output, null, 2);
}
