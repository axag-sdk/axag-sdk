/**
 * Confirmation tokens.
 *
 * A token is proof that a person saw *this* action with *these* parameters and
 * agreed to it. It is bound to the intent, a hash of the parameters and the
 * actor, can be used once, and expires — so it can't be replayed for a second
 * call, a different tenant, or different arguments.
 */

import { createHash, randomUUID } from 'node:crypto';

export interface ConfirmationRecord {
  intent: string;
  parametersHash: string;
  actorId: string;
  expiresAt: number;
}

export interface ConfirmationStore {
  issue: (record: ConfirmationRecord) => Promise<string> | string;
  /** Returns the record and invalidates the token. */
  consume: (token: string) => Promise<ConfirmationRecord | undefined> | ConfirmationRecord | undefined;
}

/** Fine for one process. Use a shared store when the app runs on more than one. */
export class MemoryConfirmationStore implements ConfirmationStore {
  private readonly tokens = new Map<string, ConfirmationRecord>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  issue(record: ConfirmationRecord): string {
    const token = randomUUID();
    this.tokens.set(token, record);
    this.sweep();
    return token;
  }

  consume(token: string): ConfirmationRecord | undefined {
    const record = this.tokens.get(token);
    if (!record) return undefined;
    this.tokens.delete(token);
    return record.expiresAt >= this.now() ? record : undefined;
  }

  private sweep(): void {
    const now = this.now();
    for (const [token, record] of this.tokens) {
      if (record.expiresAt < now) this.tokens.delete(token);
    }
  }
}

/** Stable across key order, so the same call hashes the same way. */
export function hashParameters(parameters: unknown): string {
  return createHash('sha256').update(stableStringify(parameters)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => key !== '_axag')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
  return `{${entries.join(',')}}`;
}
