import "server-only";

import {
  brokerageNames,
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

// Normalizing can also throw on a malformed response; that counts as a failed
// request for this section only.
function settle<T>(
  result: PromiseSettledResult<unknown>,
  normalize: (raw: unknown) => T,
): PromiseSettledResult<T> {
  if (result.status === "rejected") return result;
  try {
    return { status: "fulfilled", value: normalize(result.value) };
  } catch (reason) {
    return { status: "rejected", reason };
  }
}

// The two requests are independent: one failing leaves the other section
// visible with a partial-data notice (null = failed to load).
export async function loadAccountsOverview(
  deps: TokenDeps,
  userId: string,
): Promise<AccountsOverview> {
  const [rawAccounts, rawConnections] = await Promise.allSettled([
    snaptradeGet<unknown>(deps, userId, "/accounts"),
    snaptradeGet<unknown>(deps, userId, "/authorizations"),
  ]);
  // Accounts are grouped under their connection's brokerage name when the
  // connections loaded, and under their institution_name otherwise.
  const names =
    rawConnections.status === "fulfilled"
      ? brokerageNames(rawConnections.value)
      : new Map<string, string>();
  const [accounts, connections] = [
    settle(rawAccounts, (raw) => normalizeAccounts(raw, names)),
    settle(rawConnections, normalizeConnections),
  ];

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
