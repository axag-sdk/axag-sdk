import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';
import { DEFAULT_OUTPUT_DIR } from './constants.js';

/** Configuration schema validated with Zod. */
export const ConfigSchema = z.object({
  /** Output directory for scan artefacts. */
  outputDir: z.string().default(DEFAULT_OUTPUT_DIR),

  /** Domain hint for annotation inference. */
  domain: z
    .enum([
      'ecommerce',
      'analytics',
      'crm',
      'travel',
      'support',
      'enterprise',
      'marketing',
      'jobs',
      'general',
    ])
    .default('general'),

  /** AI-powered inference settings. */
  ai: z
    .object({
      enabled: z.boolean().default(false),
      provider: z.enum(['openai', 'anthropic']).default('openai'),
      model: z.string().default('gpt-4o'),
      apiKey: z.string().optional(),
    })
    .default({}),

  /** Scanner settings. */
  scanner: z
    .object({
      maxPages: z.number().int().positive().default(10),
      headless: z.boolean().default(true),
      timeout: z.number().int().positive().default(30_000),
      waitForSelector: z.string().optional(),
      excludePatterns: z.array(z.string()).default([]),
    })
    .default({}),

  /** Validation settings. */
  validation: z
    .object({
      conformanceLevel: z.enum(['A', 'AA', 'AAA']).default('A'),
      strict: z.boolean().default(false),
    })
    .default({}),
});

export type AxagConfig = z.infer<typeof ConfigSchema>;

const explorer = cosmiconfig('axag', {
  searchPlaces: [
    'axag.config.json',
    'axag.config.js',
    'axag.config.ts',
    '.axagrc',
    '.axagrc.json',
    '.axagrc.yaml',
    '.axagrc.yml',
    'package.json',
  ],
});

/**
 * Load configuration from cosmiconfig, merge with CLI overrides, and validate.
 */
export async function loadConfig(
  overrides: Partial<AxagConfig> = {},
): Promise<AxagConfig> {
  const result = await explorer.search();
  const fileConfig = result?.config ?? {};
  const merged = deepMerge(fileConfig, overrides);
  return ConfigSchema.parse(merged);
}

/** Deep-merge two objects (second wins). */
function deepMerge(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...a };
  for (const key of Object.keys(b)) {
    if (
      typeof b[key] === 'object' &&
      b[key] !== null &&
      !Array.isArray(b[key]) &&
      typeof a[key] === 'object' &&
      a[key] !== null
    ) {
      result[key] = deepMerge(
        a[key] as Record<string, unknown>,
        b[key] as Record<string, unknown>,
      );
    } else {
      result[key] = b[key];
    }
  }
  return result;
}
