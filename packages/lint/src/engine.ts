import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
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
    format?: 'console' | 'json' | 'github' | 'sarif';
    manifest?: string;
    configPath?: string;
    /** Only lint files changed since this git ref, e.g. `origin/main`. */
    changedSince?: string;
    /** Rule severities to apply on top of the config, e.g. to enforce a conformance level. */
    rules?: Record<string, 'error' | 'warning' | 'info' | 'off'>;
  },
): Promise<LintResult> {
  const absTarget = resolve(targetPath);
  const cwd = statSync(absTarget).isDirectory() ? absTarget : resolve(absTarget, '..');

  // Load config
  const { config, manifest: configManifest } = loadConfig(cwd, options?.configPath);
  if (options?.rules) Object.assign(config.rules, options.rules);

  // Determine manifest source
  let manifest: ManifestData | undefined = configManifest;
  if (options?.manifest) {
    try {
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

  if (options?.changedSince) {
    const changed = changedFiles(cwd, options.changedSince);
    if (changed) files = files.filter(file => changed.has(resolve(file)));
  }

  const enforcedIntents = loadEnforcedIntents(cwd, config.enforcedIntentsPath);

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
      enforcedIntents,
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

/** The intents a server says it enforces, for AXAG-LINT-037. */
function loadEnforcedIntents(cwd: string, path?: string): Set<string> | undefined {
  if (!path) return undefined;
  try {
    const parsed: unknown = JSON.parse(readFileSync(resolve(cwd, path), 'utf-8'));
    const intents = Array.isArray(parsed) ? parsed : (parsed as { intents?: unknown }).intents;
    if (!Array.isArray(intents)) return undefined;
    return new Set(intents.filter((intent): intent is string => typeof intent === 'string'));
  } catch {
    return undefined;
  }
}

/**
 * Files changed since a git ref, absolute. Returns undefined when git can't
 * answer, so a run outside a repository lints everything rather than nothing.
 */
function changedFiles(cwd: string, ref: string): Set<string> | undefined {
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf-8' }).trim();
    const changed = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', `${ref}...HEAD`], {
      cwd,
      encoding: 'utf-8',
    });
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd, encoding: 'utf-8' });
    const staged = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', '--cached'], { cwd, encoding: 'utf-8' });

    return new Set(
      [changed, untracked, staged]
        .flatMap(output => output.split('\n'))
        .filter(Boolean)
        .map(file => resolve(root, file)),
    );
  } catch {
    return undefined;
  }
}
