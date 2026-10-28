import "server-only";

import { SnapTradeApiError, snaptradeGet } from "./api";
import { ReauthorizationRequired, type TokenDeps } from "./tokens";
import type {
  Account,
  AccountPositionsResponse,
  AccountValueHistory,
  Activity,
  ActivityPage,
  Balance,
} from "./types";

const PAGE_SIZE = 1000;
// 50 pages = 50,000 transactions; a guard against a pagination loop, not a real limit.
const MAX_PAGES = 50;

// `null` marks a part that failed to load; the report keeps the parts that did.
export interface RawAccountData {
  account: Account;
  balances: Balance[] | null;
  positions: AccountPositionsResponse | null;
  activities: Activity[] | null;
  // Optional add-on: null when it is not enabled or the request failed.
  valueHistory?: AccountValueHistory | null;
  // A part failed because SnapTrade's request limit was reached.
  rateLimited?: boolean;
  // The connection's brokerage name, when GET /authorizations loaded.
  brokerageName?: string | null;
}

async function loadActivities(
  deps: TokenDeps,
  userId: string,
  accountId: string,
): Promise<Activity[]> {
  const activities: Activity[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({
      offset: String(activities.length),
      limit: String(PAGE_SIZE),
    });
    const result = await snaptradeGet<ActivityPage>(
      deps,
      userId,
      `/accounts/${encodeURIComponent(accountId)}/activities?${query}`,
    );
    const data = Array.isArray(result.data) ? result.data : [];
    activities.push(...data);
    const total = result.pagination?.total ?? activities.length;
    if (data.length === 0 || activities.length >= total) break;
  }
  return activities;
}

function settledValue<T>(
  part: string,
  result: PromiseSettledResult<T>,
): T | null {
  if (result.status === "fulfilled") return result.value;
  if (result.reason instanceof ReauthorizationRequired) throw result.reason;
  // Status only: response bodies may contain account data.
  const status =
    result.reason instanceof SnapTradeApiError
      ? `HTTP ${result.reason.status}`
      : "request failed";
  console.warn(`SnapTrade ${part} could not be loaded: ${status}`);
  return null;
}

const isRateLimited = (result: PromiseSettledResult<unknown>) =>
  result.status === "rejected" &&
  result.reason instanceof SnapTradeApiError &&
  result.reason.rateLimited;

async function loadOneAccount(
  deps: TokenDeps,
  userId: string,
  account: Account,
): Promise<RawAccountData> {
  const id = encodeURIComponent(account.id);
  const [balances, positions, activities, valueHistory] =
    await Promise.allSettled([
      snaptradeGet<Balance[]>(deps, userId, `/accounts/${id}/balances`),
      snaptradeGet<AccountPositionsResponse>(
        deps,
        userId,
        `/accounts/${id}/positions/all`,
      ),
      loadActivities(deps, userId, account.id),
      snaptradeGet<AccountValueHistory>(
        deps,
        userId,
        `/accounts/${id}/balanceHistory`,
      ),
    ]);

  return {
    account,
    balances: settledValue("balances", balances),
    positions: settledValue("positions", positions),
    activities: settledValue("activities", activities),
    valueHistory: settledValue("value history", valueHistory),
    rateLimited: [balances, positions, activities].some(isRateLimited),
  };
}

export async function loadAccountData(
  deps: TokenDeps,
  userId: string,
  accounts: Account[],
): Promise<RawAccountData[]> {
  return Promise.all(
    accounts.map((account) => loadOneAccount(deps, userId, account)),
  );
}
