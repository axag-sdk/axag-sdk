/**
 * @axag/webmcp — register AXAG actions as WebMCP tools for the time their UI is on screen.
 */

export { registerTool, registerAction, registerManifest, registerElement } from './register.js';
export type { Registration, RegisterOptions, Middleware, ExecutionContext, ToolHandler } from './register.js';
export { registerDocument } from './document.js';
export type { RegisterDocumentOptions } from './document.js';
export { getModelContext, hasWebMcp } from './model-context.js';
export type { ModelContext, WebMcpToolDefinition } from './model-context.js';
export { isOperable } from './operability.js';
export { createEnforcers, axagHeaders, withoutEnvelope, AXAG_ENVELOPE } from './enforcers.js';
export type { EnforcerOptions, Enforcers, AuditEvent, AxagEnvelope } from './enforcers.js';
export { confirmInShadowRoot } from './confirm-dialog.js';
export type { ConfirmationRequest } from './confirm-dialog.js';
export { createDefaultHandler } from './handler.js';
export type { DispatchResult } from './handler.js';
