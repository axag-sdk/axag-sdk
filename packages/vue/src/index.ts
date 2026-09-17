/**
 * @web-axag/vue — register an agent action for as long as the component using it is mounted.
 */

export { useAxag } from './use-axag.js';
export type { UseAxagOptions, UseAxagResult } from './use-axag.js';
export { vAxag, AxagPlugin } from './directive.js';
export { defineAction } from '@web-axag/core';
export type { ActionSpec } from '@web-axag/core';
