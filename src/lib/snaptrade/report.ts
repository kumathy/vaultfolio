import "server-only";

import { buildReport, type Report } from "@/lib/reports/build-report";
import { normalizeAccountData } from "@/lib/reports/normalize";
import type { Period } from "@/lib/reports/period";
import type { ReportAccount, ReportSettings } from "@/lib/reports/types";
import { loadAccountData } from "./account-data";
import { snaptradeGet } from "./api";
import type { TokenDeps } from "./tokens";
import type { Account } from "./types";

// Reports are generated on demand from live data; nothing is stored.
export async function loadReportAccounts(
  deps: TokenDeps,
  userId: string,
  settings: ReportSettings = {},
): Promise<ReportAccount[]> {
  const response = await snaptradeGet<unknown>(deps, userId, "/accounts");
  const accounts = Array.isArray(response) ? (response as Account[]) : [];
  return normalizeAccountData(
    await loadAccountData(deps, userId, accounts),
    settings,
  );
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
