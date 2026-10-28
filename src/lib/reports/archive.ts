import { strToU8, zipSync } from "fflate";
import { buildReport } from "./build-report";
import { localDate, periodOf, periodsBetween, type Period } from "./period";
import {
  resolveSettings,
  type ReportAccount,
  type ReportSettings,
} from "./types";

// First month with any history; reports before it would be empty.
export function firstReportPeriod(accounts: ReportAccount[]): string | null {
  const dates = accounts.flatMap((account) => [
    ...(account.firstTransactionDate ? [account.firstTransactionDate] : []),
    ...(account.activities?.slice(0, 1).map((a) => a.date) ?? []),
  ]);
  return dates.length > 0 ? periodOf(dates.sort()[0]) : null;
}

// Months with reports, oldest first: first history month through this month.
export function availablePeriods(
  accounts: ReportAccount[],
  now: Date,
  settings: ReportSettings = {},
): Period[] {
  const current = periodOf(localDate(now, resolveSettings(settings).timeZone));
  return periodsBetween(firstReportPeriod(accounts) ?? current, current);
}

// Every month's report, oldest first, from one set of account data.
export function buildAllReports(
  accounts: ReportAccount[],
  now: Date,
  settings: ReportSettings = {},
): { period: string; report: ReturnType<typeof buildReport> }[] {
  return availablePeriods(accounts, now, settings).map((period) => ({
    period: period.id,
    report: buildReport({ accounts }, { period, now, settings }),
  }));
}

export interface Archive {
  fileName: string;
  periods: string[];
  bytes: Uint8Array;
}

export function buildArchive(
  accounts: ReportAccount[],
  year: number,
  now: Date,
  settings: ReportSettings = {},
): Archive | null {
  const periods = availablePeriods(accounts, now, settings).filter(
    (p) => p.year === year,
  );
  if (periods.length === 0) return null;

  const files: Record<string, Uint8Array> = {};
  for (const period of periods) {
    const report = buildReport({ accounts }, { period, now, settings });
    files[report.fileName] = strToU8(report.markdown);
  }
  return {
    fileName: `vaultfolio-reports-${year}.zip`,
    periods: periods.map((p) => p.id),
    bytes: zipSync(files, { level: 6, mtime: now }),
  };
}
