import { localDate, type Period } from "./period";
import type { ReportAccount, ResolvedSettings } from "./types";

export interface Context {
  period: Period;
  // Retrieval date in the report's time zone.
  asOf: string;
  // Last day the period's activity checks cover: today, or the period's end.
  evalDate: string;
  isCurrentPeriod: boolean;
  settings: ResolvedSettings;
}

export function createContext(
  period: Period,
  now: Date,
  settings: ResolvedSettings,
): Context {
  const asOf = localDate(now, settings.timeZone);
  return {
    period,
    asOf,
    evalDate: asOf < period.end ? asOf : period.end,
    isCurrentPeriod: asOf >= period.start && asOf <= period.end,
    settings,
  };
}

export function accountLabel(
  account: ReportAccount,
  accounts: ReportAccount[],
): string {
  const sameName = accounts.filter((a) => a.name === account.name);
  if (sameName.length < 2) return account.name;
  const sameInstitution = sameName.filter(
    (a) => a.institution === account.institution,
  );
  if (sameInstitution.length > 1 && account.numberSuffix) {
    return `${account.name} ••${account.numberSuffix}`;
  }
  return `${account.name} (${account.institution})`;
}

// Value per currency from holdings and cash; null when either failed to load.
export function accountValue(
  account: ReportAccount,
): Map<string, number> | null {
  if (account.holdings === null || account.cash === null) return null;
  const totals = new Map<string, number>();
  const add = (currency: string | null, cents: number | null) => {
    if (currency === null || cents === null) return;
    totals.set(currency, (totals.get(currency) ?? 0) + cents);
  };
  for (const holding of account.holdings)
    add(holding.currency, holding.valueCents);
  for (const cash of account.cash) add(cash.currency, cash.cents);
  return totals;
}

export function inScope(account: ReportAccount, settings: ResolvedSettings) {
  const ids = settings.plan?.accountIds;
  return !ids || ids.length === 0 || ids.includes(account.id);
}

export const symbolsMatch = (a: string | null, b: string) =>
  a !== null && a.toUpperCase() === b.toUpperCase();

// Base currency first, then alphabetical.
export function orderCurrencies(currencies: Iterable<string>, base: string) {
  return [...new Set(currencies)].sort((a, b) =>
    a === base ? -1 : b === base ? 1 : a.localeCompare(b),
  );
}
