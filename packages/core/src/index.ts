/**
 * @axag/core — dependency-free AXAG model. Parsers live in the
 * `@axag/core/html`, `@axag/core/jsx` and `@axag/core/dom` subpaths.
 */

export * from './vocabulary.js';
export type * from './types.js';
export { normalizeAttributes, readAttributes, hasIntent, readAnnotation, humanizeIntent } from './annotation.js';
export type { AnnotationAction, ReadResult, NormalizedAttributes } from './annotation.js';
export { MACRO_ATTRIBUTE, MACRO_KEYS, parseMacro, toMacro, sameAttributeValue } from './macro.js';
export type { MacroError, MacroParseResult, MacroConversion } from './macro.js';
export { buildManifest, determineConformance } from './manifest.js';
export type { ManifestOptions, ManifestResult } from './manifest.js';
export { generateToolRegistry, actionToTool, buildInputSchema } from './tools.js';
export { walk, ancestors, textContent, findById, selectElements, toAnnotatedElement } from './tree.js';
export type { ElementNode, ElementTree, AttributeSpan } from './tree.js';
export { formatTree } from './format.js';
export type { FormatMode, FormatResult, FormatSkip } from './format.js';
