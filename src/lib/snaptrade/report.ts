import "server-only";

import { buildReport, type Report } from "@/lib/reports/build-report";
import { normalizeAccountData } from "@/lib/reports/normalize";
import type { Period } from "@/lib/reports/period";
import type { ReportAccount, ReportSettings } from "@/lib/reports/types";
import { brokerageNames } from "@/lib/view-models/accounts";
import { cachedAccountData } from "./account-cache";
import { loadAccountData } from "./account-data";
import { snaptradeGet } from "./api";
import { ReauthorizationRequired, type TokenDeps } from "./tokens";
import type { Account } from "./types";

// Reports are generated on demand from live data; nothing is stored.
export async function loadReportAccounts(
  deps: TokenDeps,
  userId: string,
  settings: ReportSettings = {},
): Promise<ReportAccount[]> {
  const raw = await cachedAccountData(userId, async () => {
    // Connections only supply brokerage names, so their failure is tolerated.
    const [response, connections] = await Promise.all([
      snaptradeGet<unknown>(deps, userId, "/accounts"),
      snaptradeGet<unknown>(deps, userId, "/authorizations").catch(
        (error: unknown) => {
          if (error instanceof ReauthorizationRequired) throw error;
          return [];
        },
      ),
    ]);
    const accounts = Array.isArray(response) ? (response as Account[]) : [];
    const names = brokerageNames(connections);
    const data = await loadAccountData(deps, userId, accounts);
    return data.map((part) => ({
      ...part,
      brokerageName: names.get(part.account.brokerage_authorization) ?? null,
    }));
  });
  // Settings are applied after the cache, so changes show immediately.
  return normalizeAccountData(raw, settings);
}

export async function generateReport(
  deps: TokenDeps,
  userId: string,
  period: Period,
  settings: ReportSettings = {},
  now: Date = new Date(),
): Promise<Report> {
  const accounts = await loadReportAccounts(deps, userId, settings);
  return buildReport({ accounts }, { period, now, settings });
}
