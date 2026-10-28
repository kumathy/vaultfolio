import {
  accountLabel,
  orderCurrencies,
  symbolsMatch,
  type Context,
} from "./context";
import { money, perUnit, sumBy, units } from "./money";
import { addDays } from "./period";
import { unitsHeldOn } from "./units";
import type { Block, ReportAccount } from "./types";

export interface Payment {
  date: string;
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
  unknownPerUnit: string[];
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
  for (const symbolPayments of bySymbol.values()) {
    const { symbol, currency } = symbolPayments[0];
    if (symbolPayments.some((p) => p.perUnit === null)) {
      unknownPerUnit.push(symbol);
      continue;
    }
    // The same fund paying into two accounts on one day is one per-unit amount.
    const perDate = new Map(symbolPayments.map((p) => [p.date, p.perUnit!]));
    const perUnitTtm = [...perDate.values()].reduce((a, b) => a + b, 0);
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
    estimates,
    unknownPerUnit,
    missingAccounts,
    multipleAccounts: paying.size > 1,
  };
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
        ...(result.estimates.length > 0
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
