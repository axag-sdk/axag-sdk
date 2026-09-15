/**
 * Schema Validator — validate a manifest against the AXAG JSON Schema.
 */

import _Ajv from 'ajv';
import _addFormats from 'ajv-formats';
import type { ManifestOutput } from './types.js';

// Handle ESM/CJS interop - ajv exports differently
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv = (_Ajv as any).default ?? _Ajv;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats = (_addFormats as any).default ?? _addFormats;

// Embedded schema (matches https://axag.org/schema/v1/axag-manifest.schema.json)
const SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://axag.org/schema/v1/axag-manifest.schema.json',
  title: 'AXAG Manifest',
  type: 'object',
  required: ['version', 'generated_at', 'source', 'conformance', 'actions'],
  additionalProperties: false,
  properties: {
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9]+)?$' },
    generated_at: { type: 'string', format: 'date-time' },
    source: {
      type: 'object',
      required: ['paths', 'tool', 'tool_version'],
      additionalProperties: false,
      properties: {
        url: { type: 'string' },
        paths: { type: 'array', items: { type: 'string' } },
        tool: { type: 'string' },
        tool_version: { type: 'string' },
      },
    },
    conformance: { type: 'string', enum: ['basic', 'intermediate', 'full'] },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['intent', 'entity', 'action_type', 'description'],
        additionalProperties: false,
        properties: {
          intent: { type: 'string', pattern: '^[a-z_]+\\.[a-z_]+$' },
          entity: { type: 'string', pattern: '^[a-z_]+$' },
          action_type: { type: 'string', enum: ['read', 'write', 'delete', 'navigate'] },
          operation_id: { type: 'string' },
          description: { type: 'string' },
          required_parameters: { type: 'array', items: { $ref: '#/definitions/Parameter' } },
          optional_parameters: { type: 'array', items: { $ref: '#/definitions/Parameter' } },
          risk_level: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'critical'] },
          confirmation_required: { type: 'boolean' },
          approval_required: { type: 'boolean' },
          approval_roles: { type: 'array', items: { type: 'string' } },
          idempotent: { type: 'boolean' },
          scope: { type: 'string', enum: ['user', 'tenant', 'global'] },
          side_effects: { type: 'array', items: { type: 'string' } },
          preconditions: { type: 'array', items: { type: 'string' } },
          postconditions: { type: 'array', items: { type: 'string' } },
          element_selector: { type: 'string' },
          source_file: { type: 'string' },
          source_line: { type: 'integer' },
        },
      },
    },
  },
  definitions: {
    Parameter: {
      type: 'object',
      required: ['name', 'type'],
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['string', 'number', 'boolean', 'array', 'object'] },
        description: { type: 'string' },
        enum: { type: 'array' },
        min: { type: 'number' },
        max: { type: 'number' },
        maxLength: { type: 'integer' },
        format: { type: 'string' },
        default: {},
      },
    },
  },
};

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
