/**
 * Schema Validator — validate a manifest against the AXAG JSON Schema.
 */

import _Ajv from 'ajv';
import _addFormats from 'ajv-formats';
import { createRequire } from 'node:module';
import type { ManifestOutput } from './types.js';

// Handle ESM/CJS interop - ajv exports differently
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv = (_Ajv as any).default ?? _Ajv;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats = (_addFormats as any).default ?? _addFormats;

// The canonical schema ships with @axag/core.
const require = createRequire(import.meta.url);
const SCHEMA = require('@axag/core/schema.json') as object;

export function validateManifest(manifest: ManifestOutput): {
  valid: boolean;
  errors?: string[];
} {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(SCHEMA);
  const valid = validate(manifest);

  if (valid) {
    return { valid: true };
  }

  return {
    valid: false,
    errors: validate.errors?.map((e: { instancePath: string; message?: string }) => `${e.instancePath} ${e.message}`) ?? [],
  };
}
