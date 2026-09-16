/**
 * @axag/react — tie an agent action to a component's lifetime.
 *
 * The action is registered when the element mounts and unregistered when it
 * unmounts, through the AbortSignal WebMCP takes, so an agent's list of tools
 * matches what is on screen.
 */

export { useAxag } from './use-axag.js';
export type { UseAxagOptions, AxagProps } from './use-axag.js';
export { AxagAction } from './axag-action.js';
export type { AxagActionProps } from './axag-action.js';
export { defineAction } from '@axag/core';
export type { ActionSpec } from '@axag/core';
