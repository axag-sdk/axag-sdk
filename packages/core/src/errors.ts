/**
 * Error codes an agent runtime and a server both speak.
 *
 * These are the codes the specification already defines in
 * reference/error-codes, so a refusal means the same thing wherever it is raised.
 */

export const AXAG_ERRORS = {
  AXAG_MISSING_PARAM: 400,
  AXAG_INVALID_TYPE: 400,
  AXAG_OUT_OF_RANGE: 400,
  AXAG_INVALID_ENUM: 400,
  AXAG_INVALID_FORMAT: 400,
  AXAG_PRECONDITION_FAILED: 412,
  AXAG_CONFIRMATION_MISSING: 428,
  AXAG_APPROVAL_MISSING: 428,
  AXAG_APPROVAL_INVALID: 403,
  AXAG_SCOPE_VIOLATION: 403,
  AXAG_TENANT_BOUNDARY: 403,
  AXAG_ROLE_INSUFFICIENT: 403,
  AXAG_INTENT_NOT_FOUND: 404,
} as const;

export type AxagErrorCode = keyof typeof AXAG_ERRORS;

/** The shape a refused call takes, whether it was refused in the page or on the server. */
export interface AxagRefusal {
  error: AxagErrorCode;
  /** HTTP status for the code, so a server can answer with it directly. */
  status: number;
  message: string;
  intent?: string;
  /** Extra context, e.g. the roles that may approve. */
  details?: Record<string, unknown>;
}

export class AxagError extends Error {
  readonly code: AxagErrorCode;
  readonly status: number;
  readonly intent?: string;
  readonly details?: Record<string, unknown>;

  constructor(code: AxagErrorCode, message: string, options: { intent?: string; details?: Record<string, unknown> } = {}) {
    super(message);
    this.name = 'AxagError';
    this.code = code;
    this.status = AXAG_ERRORS[code];
    this.intent = options.intent;
    this.details = options.details;
  }

  toRefusal(): AxagRefusal {
    const refusal: AxagRefusal = { error: this.code, status: this.status, message: this.message };
    if (this.intent) refusal.intent = this.intent;
    if (this.details) refusal.details = this.details;
    return refusal;
  }
}

export function refusal(
  code: AxagErrorCode,
  message: string,
  options: { intent?: string; details?: Record<string, unknown> } = {},
): AxagRefusal {
  return new AxagError(code, message, options).toRefusal();
}
