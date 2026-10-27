import type { StoredTokens, TokenStore } from "@/lib/snaptrade/tokens";

// Serializes withLock calls through a promise chain, mirroring the row lock in
// src/db/token-store.ts.
export class MemoryTokenStore implements TokenStore {
  readonly rows = new Map<string, StoredTokens>();
  private queue: Promise<unknown> = Promise.resolve();

  async load(userId: string) {
    return this.rows.get(userId) ?? null;
  }

  async save(userId: string, tokens: StoredTokens) {
    this.rows.set(userId, tokens);
  }

  async remove(userId: string) {
    this.rows.delete(userId);
  }

  withLock(
    userId: string,
    update: (current: StoredTokens | null) => Promise<StoredTokens | null>,
  ) {
    const run = this.queue.then(async () => {
      const next = await update(this.rows.get(userId) ?? null);
      if (next) {
        this.rows.set(userId, next);
      } else {
        this.rows.delete(userId);
      }
      return next;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}
