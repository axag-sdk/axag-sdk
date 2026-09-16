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
export { generateToolRegistry, actionToTool, buildInputSchema, toWebMcpTool } from './tools.js';
export { walk, ancestors, textContent, findById, selectElements, toAnnotatedElement, createNode, appendChild } from './tree.js';
export type { ElementNode, ElementTree, AttributeSpan } from './tree.js';
export { defineAction, specToAttributes } from './spec.js';
export type { ActionSpec, SpecParameter } from './spec.js';
export { formatTree } from './format.js';
export { harvestParameters, parameterScope, coveringIntent, accessibleName, labelFor, toSnakeCase } from './harvest.js';
export type { HarvestResult, UnnamedControl } from './harvest.js';
export { mergeParameters, jsonSchemaToParameters, jsonSchemaToParameter, nameOnlyParameters } from './parameters.js';
export type { ParameterSet, SchemaBinding } from './parameters.js';
export type { FormatMode, FormatResult, FormatSkip } from './format.js';
