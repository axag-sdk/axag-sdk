import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { LintConfig, ManifestData } from '../types.js';
import { DEFAULT_CONFIG } from './defaults.js';

/**
 * Load config from .axaglintrc.json or package.json "axag-lint" key.
 * Deep-merges with defaults.
 */
export function loadConfig(cwd: string, configPath?: string): {
  config: LintConfig;
  manifest?: ManifestData;
} {
  let userConfig: Partial<LintConfig> = {};

  // Try explicit config path first
  if (configPath && existsSync(configPath)) {
    userConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
  } else {
    // Try .axaglintrc.json
    const rcPath = join(cwd, '.axaglintrc.json');
    if (existsSync(rcPath)) {
      userConfig = JSON.parse(readFileSync(rcPath, 'utf-8'));
    } else {
      // Try package.json "axag-lint" key
      const pkgPath = join(cwd, 'package.json');
      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          if (pkg['axag-lint']) {
            userConfig = pkg['axag-lint'];
          }
        } catch {
          // Ignore parse errors in package.json
        }
      }
    }
  }

  // Deep merge with defaults
  const config: LintConfig = {
    include: userConfig.include ?? DEFAULT_CONFIG.include,
    exclude: userConfig.exclude ?? DEFAULT_CONFIG.exclude,
    manifestPath: userConfig.manifestPath,
    enforcedIntentsPath: userConfig.enforcedIntentsPath,
    rules: { ...DEFAULT_CONFIG.rules, ...userConfig.rules },
  };

  // Load manifest if specified
  let manifest: ManifestData | undefined;
  if (config.manifestPath) {
    const manifestFullPath = join(cwd, config.manifestPath);
    if (existsSync(manifestFullPath)) {
      try {
        manifest = JSON.parse(readFileSync(manifestFullPath, 'utf-8'));
      } catch {
        // Ignore invalid manifest
      }
    }
  }

  return { config, manifest };
}
