import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import fg from 'fast-glob';
import type { Diagnostic, FileContext, ManifestData } from './types.js';
import { parseFile } from './parser/index.js';
import { loadConfig } from './config/loader.js';
import { ALL_RULES } from './rules/index.js';

export interface LintResult {
  diagnostics: Diagnostic[];
  filesScanned: number;
  elementsFound: number;
  errorCount: number;
  warningCount: number;
}

export async function lint(
  targetPath: string,
  options?: {
    format?: 'console' | 'json' | 'github';
    manifest?: string;
    configPath?: string;
  },
): Promise<LintResult> {
  const absTarget = resolve(targetPath);
  const cwd = statSync(absTarget).isDirectory() ? absTarget : resolve(absTarget, '..');

  // Load config
  const { config, manifest: configManifest } = loadConfig(cwd, options?.configPath);

  // Determine manifest source
  let manifest: ManifestData | undefined = configManifest;
  if (options?.manifest) {
    try {
      const { readFileSync } = await import('node:fs');
      manifest = JSON.parse(readFileSync(resolve(options.manifest), 'utf-8'));
    } catch {
      // Ignore invalid manifest
    }
  }

  // Discover files
  let files: string[];
  if (statSync(absTarget).isFile()) {
    files = [absTarget];
  } else {
    files = await fg(config.include, {
      cwd: absTarget,
      ignore: config.exclude,
      absolute: true,
    });
  }

  const allDiagnostics: Diagnostic[] = [];
  let totalElements = 0;

  // Process each file
  for (const filePath of files) {
    const elements = parseFile(filePath);
    totalElements += elements.length;

    const context: FileContext = {
      filePath,
      elements,
      manifest,
    };

    // Run each enabled rule against each element
    for (const element of elements) {
      for (const rule of ALL_RULES) {
        const severity = config.rules[rule.id];
        if (severity === 'off') continue;

        const diagnostics = rule.check(element, context);

        // Apply severity override from config
        for (const diag of diagnostics) {
          if (severity) {
            diag.severity = severity;
          }
          allDiagnostics.push(diag);
        }
      }
    }
  }

  // Sort diagnostics by filePath → line → column
  allDiagnostics.sort((a, b) => {
    if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
    if (a.line !== b.line) return a.line - b.line;
    return a.column - b.column;
  });

  return {
    diagnostics: allDiagnostics,
    filesScanned: files.length,
    elementsFound: totalElements,
    errorCount: allDiagnostics.filter(d => d.severity === 'error').length,
    warningCount: allDiagnostics.filter(d => d.severity === 'warning').length,
  };
}
