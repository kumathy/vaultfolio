import "server-only";

import { snaptradeGet } from "./api";
import { ReauthorizationRequired, type TokenDeps } from "./tokens";
import type {
  Account,
  AccountPositionsResponse,
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

function settledValue<T>(result: PromiseSettledResult<T>): T | null {
  if (result.status === "fulfilled") return result.value;
  if (result.reason instanceof ReauthorizationRequired) throw result.reason;
  return null;
}

async function loadOneAccount(
  deps: TokenDeps,
  userId: string,
  account: Account,
): Promise<RawAccountData> {
  const id = encodeURIComponent(account.id);
  const [balances, positions, activities] = await Promise.allSettled([
    snaptradeGet<Balance[]>(deps, userId, `/accounts/${id}/balances`),
    snaptradeGet<AccountPositionsResponse>(
      deps,
      userId,
      `/accounts/${id}/positions/all`,
    ),
    loadActivities(deps, userId, account.id),
  ]);

  return {
    account,
    balances: settledValue(balances),
    positions: settledValue(positions),
    activities: settledValue(activities),
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
