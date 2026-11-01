import {
  accountLabel,
  orderCurrencies,
  symbolsMatch,
  type Context,
} from "./context";
import { changesUnits } from "./classify";
import { money, perUnit, sumBy, units } from "./money";
import { addDays } from "./period";
import { unitsHeldOn } from "./units";
import type { Block, ReportAccount } from "./types";

export interface Payment {
  date: string;
  accountId: string;
  account: string;
  symbol: string;
  amountCents: number;
  currency: string;
  perUnit: number | null;
}

export interface SymbolEstimate {
  symbol: string;
  currency: string;
  perUnitTtm: number;
  unitsHeld: number;
  estimateCents: number;
}

export interface DistributionsResult {
  windowStart: string;
  payments: Payment[];
  ttm: { currency: string; cents: number }[];
  estimates: SymbolEstimate[];
  // Set when a paying fund has been held less than 12 months.
  estimateAvailableFrom: string | null;
  unknownPerUnit: string[];
  // Paid into an account whose holdings failed to load, so units are unknown.
  unknownUnits: string[];
  missingAccounts: string[];
  multipleAccounts: boolean;
}

export function analyzeDistributions(
  accounts: ReportAccount[],
  ctx: Context,
): DistributionsResult {
  const windowStart = addDays(ctx.evalDate, -364);
  const payments: Payment[] = [];
  const missingAccounts: string[] = [];
  const paying = new Set<string>();

  for (const account of accounts) {
    if (account.activities === null) {
      missingAccounts.push(accountLabel(account, accounts));
      continue;
    }
    for (const activity of account.activities) {
      if (
        activity.kind !== "distribution" ||
        activity.amountCents <= 0 ||
        activity.currency === null ||
        activity.date < windowStart ||
        activity.date > ctx.evalDate
      ) {
        continue;
      }
      const symbol = activity.symbol ?? "Unknown";
      const amount = activity.amountCents / 100;
      let perUnitAmount: number | null = null;
      if (activity.price && activity.price > 0) {
        perUnitAmount = activity.price;
      } else if (activity.units > 0) {
        perUnitAmount = amount / activity.units;
      } else {
        const held = unitsHeldOn(account, symbol, activity.date, ctx.asOf);
        perUnitAmount = held ? amount / held : null;
      }
      payments.push({
        date: activity.date,
        accountId: account.id,
        account: accountLabel(account, accounts),
        symbol,
        amountCents: activity.amountCents,
        currency: activity.currency,
        perUnit: perUnitAmount,
      });
      paying.add(account.id);
    }
  }
  payments.sort((a, b) => b.date.localeCompare(a.date));

  const ttmByCurrency = new Map<string, number>();
  for (const p of payments) {
    ttmByCurrency.set(
      p.currency,
      (ttmByCurrency.get(p.currency) ?? 0) + p.amountCents,
    );
  }

  const bySymbol = new Map<string, Payment[]>();
  for (const p of payments) {
    const key = `${p.symbol.toUpperCase()}|${p.currency}`;
    bySymbol.set(key, [...(bySymbol.get(key) ?? []), p]);
  }

  const estimates: SymbolEstimate[] = [];
  const unknownPerUnit: string[] = [];
  const unknownUnits: string[] = [];
  const holdingsFailed = new Set(
    accounts.filter((a) => a.holdings === null).map((a) => a.id),
  );
  let availableFrom: string | null = null;
  for (const symbolPayments of bySymbol.values()) {
    const { symbol, currency } = symbolPayments[0];
    if (symbolPayments.some((p) => p.perUnit === null)) {
      unknownPerUnit.push(symbol);
      continue;
    }
    // Today's units come from holdings; past months count them from
    // transactions, which loaded for every paying account.
    if (
      ctx.isCurrentPeriod &&
      symbolPayments.some((p) => holdingsFailed.has(p.accountId))
    ) {
      unknownUnits.push(symbol);
      continue;
    }
    // Past months project from the units held at the month's end.
    const unitsHeld = ctx.isCurrentPeriod
      ? sumBy(
          accounts
            .flatMap((a) => a.holdings ?? [])
            .filter((h) => symbolsMatch(h.symbol, symbol)),
          (h) => h.units,
        )
      : sumBy(
          accounts,
          (a) => unitsHeldOn(a, symbol, ctx.evalDate, ctx.asOf) ?? 0,
        );
    // A fund bought within the window missed its earlier payments, so its
    // per-unit total covers less than a year.
    const since =
      unitsHeld > 0 ? heldSince(accounts, symbol, windowStart, ctx) : null;
    if (since !== null) {
      const ready = addDays(since, 365);
      if (availableFrom === null || ready > availableFrom) {
        availableFrom = ready;
      }
      continue;
    }
    // The same fund paying into two accounts on one day is one per-unit amount.
    const perDate = new Map(symbolPayments.map((p) => [p.date, p.perUnit!]));
    const perUnitTtm = [...perDate.values()].reduce((a, b) => a + b, 0);
    estimates.push({
      symbol,
      currency,
      perUnitTtm,
      unitsHeld,
      estimateCents: Math.round(perUnitTtm * unitsHeld * 100),
    });
  }

  return {
    windowStart,
    payments,
    ttm: orderCurrencies(ttmByCurrency.keys(), ctx.settings.baseCurrency).map(
      (currency) => ({ currency, cents: ttmByCurrency.get(currency)! }),
    ),
    // An estimate missing a fund would understate the total, so none is shown.
    estimates: availableFrom === null ? estimates : [],
    estimateAvailableFrom: availableFrom,
    unknownPerUnit,
    unknownUnits,
    missingAccounts,
    multipleAccounts: paying.size > 1,
  };
}

// The latest day on or after `windowStart` when the fund went from no units
// to some, or null when it was held throughout the window.
function heldSince(
  accounts: ReportAccount[],
  symbol: string,
  windowStart: string,
  ctx: Context,
): string | null {
  const held = (date: string) =>
    sumBy(accounts, (a) => unitsHeldOn(a, symbol, date, ctx.asOf) ?? 0);
  const tradeDays = new Set(
    accounts.flatMap((a) =>
      (a.activities ?? [])
        .filter(
          (x) =>
            changesUnits(x.kind) &&
            symbolsMatch(x.symbol, symbol) &&
            x.date >= windowStart &&
            x.date <= ctx.evalDate,
        )
        .map((x) => x.date),
    ),
  );
  for (const day of [...tradeDays].sort().reverse()) {
    if (held(addDays(day, -1)) === 0 && held(day) > 0) return day;
  }
  return null;
}

export function renderDistributions(
  result: DistributionsResult,
  ctx: Context,
): Block[] {
  const base = ctx.settings.baseCurrency;
  const blocks: Block[] = [
    { kind: "heading", level: 2, text: "Distributions", id: "distributions" },
  ];
  const note = (text: string): Block => ({ kind: "paragraph", text: [text] });

  if (result.payments.length === 0) {
    blocks.push(
      note("No distributions were recorded in the trailing 12 months."),
    );
  } else {
    const right = "right" as const;
    blocks.push({
      kind: "table",
      columns: [
        { label: "Paid on" },
        ...(result.multipleAccounts ? [{ label: "Account" }] : []),
        { label: "Symbol" },
        { label: "Per unit", align: right },
        { label: "Amount", align: right },
      ],
      rows: result.payments.map((p) => [
        p.date,
        ...(result.multipleAccounts ? [p.account] : []),
        p.symbol,
        p.perUnit === null ? "—" : perUnit(p.perUnit, p.currency, base),
        money(p.amountCents, p.currency, base),
      ]),
    });

    const currencies = orderCurrencies(
      [
        ...result.ttm.map((t) => t.currency),
        ...result.estimates.map((e) => e.currency),
      ],
      base,
    );
    const ttm = (c: string) =>
      result.ttm.find((t) => t.currency === c)?.cents ?? 0;
    const estimate = (c: string) =>
      sumBy(
        result.estimates.filter((e) => e.currency === c),
        (e) => e.estimateCents,
      );
    const single = currencies.length === 1;
    blocks.push({
      kind: "table",
      columns: [
        { label: "Measure" },
        ...(single
          ? [{ label: "Amount", align: right }]
          : currencies.map((c) => ({ label: c, align: right }))),
      ],
      rows: [
        [
          "Trailing 12 months",
          ...currencies.map((c) => money(ttm(c), c, base)),
        ],
        ...(result.estimateAvailableFrom !== null
          ? [
              [
                "Next 12 months (Estimate)",
                ...currencies.map(
                  () => `Available from ${result.estimateAvailableFrom}`,
                ),
              ],
            ]
          : result.estimates.length > 0
            ? [
                [
                  "Next 12 months (Estimate)",
                  ...currencies.map((c) => `~${money(estimate(c), c, base)}`),
                ],
              ]
            : []),
      ],
    });

    if (result.estimates.length > 1) {
      blocks.push({
        kind: "table",
        columns: [
          { label: "Symbol" },
          { label: "Per unit, 12 months", align: right },
          { label: "Units held", align: right },
          { label: "Estimate", align: right },
        ],
        rows: result.estimates.map((e) => [
          e.symbol,
          perUnit(e.perUnitTtm, e.currency, base),
          units(e.unitsHeld),
          `~${money(e.estimateCents, e.currency, base)}`,
        ]),
      });
    }
    if (result.estimates.length > 0) {
      blocks.push(
        note(
          `Estimate: distributions per unit over the past 12 months, multiplied by units held ${ctx.isCurrentPeriod ? "today" : "at month end"}.`,
        ),
      );
    }
    if (result.unknownPerUnit.length > 0) {
      blocks.push(
        note(
          `Per-unit amounts could not be determined for ${result.unknownPerUnit.join(", ")}; the estimate excludes ${result.unknownPerUnit.length === 1 ? "it" : "them"}.`,
        ),
      );
    }
    if (result.unknownUnits.length > 0) {
      blocks.push(
        note(
          `Units held could not be loaded for ${result.unknownUnits.join(", ")}; the estimate excludes ${result.unknownUnits.length === 1 ? "it" : "them"}.`,
        ),
      );
    }
  }
  if (result.missingAccounts.length > 0) {
    blocks.push(
      note(
        `Transactions could not be loaded for ${result.missingAccounts.join(", ")}; distributions exclude ${result.missingAccounts.length === 1 ? "this account" : "these accounts"}.`,
      ),
    );
  }
  return blocks;
}
