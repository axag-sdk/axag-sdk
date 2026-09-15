/**
 * Manifest Generator — convert extracted annotated elements into an AXAG manifest.
 */

import { buildManifest } from '@axag/core';
import type { ManifestOptions, ManifestResult, ManifestSourceElement } from '@axag/core';
import type { ManifestOutput } from './types.js';
import { CLI_VERSION } from '../utils/constants.js';

/** Generate a manifest and the diagnostics found while reading annotations. */
export function generateManifestWithDiagnostics(
  elements: ManifestSourceElement[],
  options: Pick<ManifestOptions, 'paths' | 'url'>,
): ManifestResult {
  return buildManifest(elements, { ...options, tool: 'axag-cli', toolVersion: CLI_VERSION });
}

/** Generate a manifest from annotated elements. */
export function generateManifest(
  elements: ManifestSourceElement[],
  options: Pick<ManifestOptions, 'paths' | 'url'>,
): ManifestOutput {
  return generateManifestWithDiagnostics(elements, options).manifest;
}
