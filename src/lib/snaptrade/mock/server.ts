import "server-only";

import { SnapTradeApiError } from "../errors";
import type { ActivityPage } from "../types";
import type { MockScenario } from "./config";
import { mockData, type MockAccount, type MockPart } from "./scenarios";

const PARTS: Record<string, MockPart> = {
  balances: "balances",
  "positions/all": "positions",
  activities: "activities",
  balanceHistory: "valueHistory",
};

// A short delay, so loading states are visible as they are with the real API.
const LATENCY_MS = 150;

// Answers the GET paths Vaultfolio calls with generated data in SnapTrade's
// response shapes. Unknown paths return 404, like the real API.
export async function mockGet(
  scenario: MockScenario,
  url: URL,
): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  const data = mockData(scenario);
  const path = url.pathname;

  if (path === "/accounts") return data.accounts.map((a) => a.account);
  if (path === "/authorizations") return data.authorizations;

  const match = /^\/accounts\/([^/]+)\/(.+)$/.exec(path);
  const account = match
    ? data.accounts.find((a) => a.account.id === decodeURIComponent(match[1]))
    : undefined;
  const part = match ? PARTS[match[2]] : undefined;
  if (!account || !part) throw new SnapTradeApiError(404, path);

  const failure = account.failures[part];
  if (failure) throw new SnapTradeApiError(failure, path);
  return part === "activities" ? activityPage(account, url) : account[part];
}

function activityPage(account: MockAccount, url: URL): ActivityPage {
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? 1000);
  return {
    data: account.activities.slice(offset, offset + limit),
    pagination: { offset, limit, total: account.activities.length },
  };
}
