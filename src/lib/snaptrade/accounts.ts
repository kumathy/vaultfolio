import "server-only";

import {
  normalizeAccounts,
  normalizeConnections,
  type AccountView,
  type ConnectionView,
} from "@/lib/view-models/accounts";
import { SnapTradeApiError, snaptradeGet } from "./api";
import { ReauthorizationRequired, type TokenDeps } from "./tokens";

export interface AccountsOverview {
  accounts: AccountView[] | null;
  connections: ConnectionView[] | null;
  retrievedAt: Date;
}

function logFailure(path: string, reason: unknown) {
  const status = reason instanceof SnapTradeApiError ? reason.status : "n/a";
  const kind = reason instanceof Error ? reason.name : typeof reason;
  console.warn(`SnapTrade ${path} failed`, { status, kind });
}

// The two requests are independent: one failing leaves the other section
// visible with a partial-data notice (null = failed to load).
export async function loadAccountsOverview(
  deps: TokenDeps,
  userId: string,
): Promise<AccountsOverview> {
  const [accounts, connections] = await Promise.allSettled([
    snaptradeGet<unknown>(deps, userId, "/accounts").then(normalizeAccounts),
    snaptradeGet<unknown>(deps, userId, "/authorizations").then(
      normalizeConnections,
    ),
  ]);

  for (const result of [accounts, connections]) {
    if (
      result.status === "rejected" &&
      result.reason instanceof ReauthorizationRequired
    ) {
      throw result.reason;
    }
  }
  if (accounts.status === "rejected") logFailure("/accounts", accounts.reason);
  if (connections.status === "rejected") {
    logFailure("/authorizations", connections.reason);
  }

  return {
    accounts: accounts.status === "fulfilled" ? accounts.value : null,
    connections: connections.status === "fulfilled" ? connections.value : null,
    retrievedAt: new Date(),
  };
}
