import "server-only";

import { buildReport, type Report } from "@/lib/reports/build-report";
import { normalizeAccountData } from "@/lib/reports/normalize";
import type { Period } from "@/lib/reports/period";
import type { ReportSettings } from "@/lib/reports/types";
import { loadAccountData } from "./account-data";
import { snaptradeGet } from "./api";
import type { TokenDeps } from "./tokens";
import type { Account } from "./types";

// Reports are generated on demand from live data; nothing is stored.
export async function generateReport(
  deps: TokenDeps,
  userId: string,
  period: Period,
  settings: ReportSettings = {},
  now: Date = new Date(),
): Promise<Report> {
  const response = await snaptradeGet<unknown>(deps, userId, "/accounts");
  const accounts = Array.isArray(response) ? (response as Account[]) : [];
  const raw = await loadAccountData(deps, userId, accounts);
  return buildReport(
    { accounts: normalizeAccountData(raw, settings) },
    { period, now, settings },
  );
}
