import { changesUnits } from "./classify";
import { symbolsMatch } from "./context";
import { sumBy } from "./money";
import type { ReportAccount } from "./types";

// Units of a symbol held at the end of `date`: today's holdings with every
// later unit change undone. Working back from today keeps units bought before
// the available transaction history. `null` when holdings failed to load or
// nothing was held.
export function unitsHeldOn(
  account: ReportAccount,
  symbol: string,
  date: string,
  asOf: string,
): number | null {
  if (account.holdings === null) return null;
  const now = sumBy(
    account.holdings.filter((h) => symbolsMatch(h.symbol, symbol)),
    (h) => h.units,
  );
  const changedSince = sumBy(
    (account.activities ?? []).filter(
      (a) =>
        changesUnits(a.kind) &&
        symbolsMatch(a.symbol, symbol) &&
        a.date > date &&
        a.date <= asOf,
    ),
    (a) => a.units,
  );
  const held = now - changedSince;
  // Below a millionth of a unit is rounding left over from fractional trades.
  return held > 1e-6 ? held : null;
}

// Every symbol the account holds now or traded at any point.
export function symbolsSeen(account: ReportAccount): string[] {
  const symbols = new Set<string>();
  for (const h of account.holdings ?? []) symbols.add(h.symbol);
  for (const a of account.activities ?? []) {
    if (a.symbol && changesUnits(a.kind)) symbols.add(a.symbol);
  }
  return [...symbols];
}
