/**
 * @axag/core — dependency-free AXAG model. Parsers live in the
 * `@axag/core/html`, `@axag/core/jsx` and `@axag/core/dom` subpaths.
 */

export * from './vocabulary.js';
export type * from './types.js';
export { normalizeAttributes, hasIntent, readAnnotation, humanizeIntent } from './annotation.js';
export type { AnnotationAction, ReadResult } from './annotation.js';
export { buildManifest, determineConformance } from './manifest.js';
export type { ManifestOptions, ManifestResult } from './manifest.js';
export { generateToolRegistry, actionToTool, buildInputSchema } from './tools.js';
