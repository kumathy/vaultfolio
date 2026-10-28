import "server-only";

import type { RawAccountData } from "./account-data";

// SnapTrade allows Personal users 10 requests per minute per account
// (https://docs.snaptrade.com/docs/ratelimiting.md), and each report needs
// three or more per account. Every month's report is built from the same
// data, so the last complete fetch is reused for a minute. It lives only in
// this server process's memory and is never written to disk or the database.
const TTL_MS = 60_000;

interface Entry {
  expiresAt: number;
  data: Promise<RawAccountData[]>;
}

const entries = new Map<string, Entry>();

const complete = (data: RawAccountData[]) =>
  data.every((a) => a.balances && a.positions && a.activities);

export async function cachedAccountData(
  userId: string,
  load: () => Promise<RawAccountData[]>,
  now: () => number = Date.now,
): Promise<RawAccountData[]> {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now()) entries.delete(key);
  }
  const hit = entries.get(userId);
  if (hit) return hit.data;

  // Stored before it settles, so concurrent requests share one fetch.
  const data = load();
  entries.set(userId, { expiresAt: now() + TTL_MS, data });
  try {
    const result = await data;
    // Partial results are not kept, so the next request retries the failures.
    if (!complete(result)) entries.delete(userId);
    return result;
  } catch (error) {
    entries.delete(userId);
    throw error;
  }
}

export function clearAccountData(userId: string): void {
  entries.delete(userId);
}
