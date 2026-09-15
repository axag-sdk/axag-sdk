import { describe, it, expect } from 'vitest';
import schema from '../schema/axag-manifest.schema.json' with { type: 'json' };
import {
  ACTION_TYPES,
  CONFORMANCE_LEVELS,
  PARAMETER_FORMATS,
  PARAMETER_TYPES,
  RISK_LEVELS,
  SCOPES,
  SPEC_VERSION,
} from '../src/index.js';

const action = schema.definitions.Action.properties;
const param = schema.definitions.Parameter.properties;

describe('vocabulary matches the manifest JSON Schema', () => {
  it.each([
    ['action_type', ACTION_TYPES, action.action_type.enum],
    ['risk_level', RISK_LEVELS, action.risk_level.enum],
    ['scope', SCOPES, action.scope.enum],
    ['conformance', CONFORMANCE_LEVELS, schema.properties.conformance.enum],
    ['parameter type', PARAMETER_TYPES, param.type.enum],
    ['parameter format', PARAMETER_FORMATS, param.format.enum],
  ])('%s', (_name, vocab, schemaEnum) => {
    expect([...vocab]).toEqual(schemaEnum);
  });

  it('schema $id carries the spec minor version', () => {
    const [major, minor] = SPEC_VERSION.split('.');
    expect(schema.$id).toContain(`/v${major}.${minor}/`);
  });
});
