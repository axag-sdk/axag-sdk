/**
 * Express adapter.
 *
 * `axagGuard` checks a request before your handler runs; `axagConfirmRoute`
 * issues the token the page asks for once a person has confirmed.
 */

import { AxagError } from '@web-axag/core';
import type { Actor, AxagRequest, Enforcer } from './enforcer.js';

/** The slice of Express this adapter uses, so the package needs no Express types. */
interface Request {
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  path?: string;
  method?: string;
}
interface Response {
  status: (code: number) => Response;
  json: (body: unknown) => unknown;
}
type Next = (error?: unknown) => void;

export interface GuardOptions {
  /** Who is calling, from your session. */
  actorOf: (request: Request) => Actor | Promise<Actor>;
  /**
   * Which action this request is. Defaults to the `X-AXAG-Intent` header the
   * page's enforcers send; give your own when you route by path.
   */
  intentOf?: (request: Request) => string | undefined;
  /** Skip requests that carry no intent (default true), so ordinary traffic passes through. */
  ignoreUnannotated?: boolean;
}

export function axagGuard(enforcer: Enforcer, options: GuardOptions) {
  const intentOf = options.intentOf ?? (request => headerValue(request, 'x-axag-intent'));

  return async function guard(request: Request, response: Response, next: Next): Promise<void> {
    const intent = intentOf(request);
    if (!intent) {
      if (options.ignoreUnannotated === false) {
        response.status(400).json({ error: 'AXAG_INTENT_NOT_FOUND', message: 'No intent on this request' });
        return;
      }
      next();
      return;
    }

    try {
      await enforcer.check(toAxagRequest(request, intent, await options.actorOf(request)));
      next();
    } catch (error) {
      if (error instanceof AxagError) {
        const refusal = error.toRefusal();
        response.status(refusal.status).json(refusal);
        return;
      }
      next(error);
    }
  };
}

/** `app.post('/axag/confirm', express.json(), axagConfirmRoute(enforcer, { actorOf }))` */
export function axagConfirmRoute(enforcer: Enforcer, options: Pick<GuardOptions, 'actorOf'>) {
  return async function confirm(request: Request, response: Response): Promise<void> {
    const body = (request.body ?? {}) as { intent?: string; parameters?: Record<string, unknown> };
    if (!body.intent) {
      response.status(400).json({ error: 'AXAG_INTENT_NOT_FOUND', message: 'No intent in the request body' });
      return;
    }
    try {
      const confirmation = await enforcer.issueConfirmation({
        intent: body.intent,
        parameters: body.parameters,
        actor: await options.actorOf(request),
      });
      response.json({ confirmation });
    } catch (error) {
      if (error instanceof AxagError) {
        const refusal = error.toRefusal();
        response.status(refusal.status).json(refusal);
        return;
      }
      throw error;
    }
  };
}

function toAxagRequest(request: Request, intent: string, actor: Actor): AxagRequest {
  return {
    intent,
    parameters: (request.body ?? {}) as Record<string, unknown>,
    headers: request.headers,
    actor,
  };
}

function headerValue(request: Request, name: string): string | undefined {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}
