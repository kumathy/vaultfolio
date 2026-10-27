import {
  accountLabel,
  inScope,
  orderCurrencies,
  symbolsMatch,
  type Context,
} from "./context";
import { money, percent, units } from "./money";
import type { Block, ReportAccount } from "./types";

export interface HoldingRow {
  account: string;
  symbol: string;
  units: number | null;
  valueCents: number | null;
  currency: string | null;
  weight: number | null;
  targetPercent: number | null;
}

export interface HoldingsResult {
  rows: HoldingRow[];
  totals: { currency: string; cents: number }[];
  showTargets: boolean;
}

export function analyzeHoldings(
  accounts: ReportAccount[],
  ctx: Context,
): HoldingsResult {
  const plan = ctx.settings.plan;
  const rows: HoldingRow[] = [];

  for (const account of accounts) {
    const name = accountLabel(account, accounts);
    const target = (symbol: string) =>
      plan && inScope(account, ctx.settings)
        ? (plan.targets.find((t) => symbolsMatch(symbol, t.symbol))
            ?.weightPercent ?? 0)
        : null;

    const holdings = [...(account.holdings ?? [])].sort(
      (a, b) => (b.valueCents ?? 0) - (a.valueCents ?? 0),
    );
    for (const holding of holdings) {
      rows.push({
        account: name,
        symbol: holding.symbol,
        units: holding.units,
        valueCents: holding.valueCents,
        currency: holding.currency,
        weight: null,
        targetPercent: target(holding.symbol),
      });
    }
    for (const cash of (account.cash ?? []).filter((c) => c.cents !== 0)) {
      rows.push({
        account: name,
        symbol: "Cash",
        units: null,
        valueCents: cash.cents,
        currency: cash.currency,
        weight: null,
        targetPercent: null,
      });
    }
  }

  const totalsByCurrency = new Map<string, number>();
  for (const row of rows) {
    if (row.currency && row.valueCents !== null) {
      totalsByCurrency.set(
        row.currency,
        (totalsByCurrency.get(row.currency) ?? 0) + row.valueCents,
      );
    }
  }
  for (const row of rows) {
    const total = row.currency ? totalsByCurrency.get(row.currency) : undefined;
    if (total && total > 0 && row.valueCents !== null) {
      row.weight = row.valueCents / total;
    }
  }

  return {
    rows,
    totals: orderCurrencies(
      totalsByCurrency.keys(),
      ctx.settings.baseCurrency,
    ).map((currency) => ({
      currency,
      cents: totalsByCurrency.get(currency) ?? 0,
    })),
    showTargets: plan !== undefined,
  };
}

export function renderHoldings(result: HoldingsResult, ctx: Context): Block[] {
  const base = ctx.settings.baseCurrency;
  const heading: Block = {
    kind: "heading",
    level: 2,
    text: "Holdings",
    id: "holdings",
  };
  if (result.rows.length === 0) {
    return [
      heading,
      {
        kind: "paragraph",
        text: ["No holdings or cash balances were reported."],
      },
    ];
  }

  return [
    heading,
    {
      kind: "table",
      columns: [
        { label: "Account" },
        { label: "Symbol" },
        { label: "Units", align: "right" },
        { label: "Value", align: "right" },
        { label: "Weight", align: "right" },
        ...(result.showTargets
          ? [{ label: "Target", align: "right" as const }]
          : []),
      ],
      rows: result.rows.map((row) => [
        row.account,
        row.symbol,
        row.units === null ? "—" : units(row.units),
        row.valueCents === null || row.currency === null
          ? "Not reported"
          : money(row.valueCents, row.currency, base),
        row.weight === null ? "—" : percent(row.weight),
        ...(result.showTargets
          ? [
              row.targetPercent === null
                ? "—"
                : percent(row.targetPercent / 100),
            ]
          : []),
      ]),
    },
    ...(result.totals.length > 1
      ? [
          {
            kind: "paragraph" as const,
            text: [
              "Weights are calculated within each currency, since amounts are not converted.",
            ],
          },
        ]
      : []),
  ];
}
