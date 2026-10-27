import {
  accountLabel,
  accountValue,
  orderCurrencies,
  type Context,
} from "./context";
import { money, signedMoney } from "./money";
import type { Block, ReportAccount } from "./types";

export interface ContributionTotals {
  currency: string;
  contributionsCents: number;
  withdrawalsCents: number;
  transfersNetCents: number;
  netContributedCents: number;
  valueCents: number;
  growthCents: number;
}

export interface ContributionsResult {
  rows: ContributionTotals[];
  excludedAccounts: string[];
  assetTransfersWithoutValue: number;
}

// Growth compares current value with net money put in. Cash transfers count as
// money put in here; registered-room rules treat them differently (room.ts).
export function analyzeContributions(
  accounts: ReportAccount[],
  ctx: Context,
): ContributionsResult {
  const totals = new Map<
    string,
    Omit<ContributionTotals, "netContributedCents" | "growthCents">
  >();
  const entry = (currency: string) => {
    let row = totals.get(currency);
    if (!row) {
      row = {
        currency,
        contributionsCents: 0,
        withdrawalsCents: 0,
        transfersNetCents: 0,
        valueCents: 0,
      };
      totals.set(currency, row);
    }
    return row;
  };

  const excludedAccounts: string[] = [];
  let assetTransfersWithoutValue = 0;

  for (const account of accounts) {
    const value = accountValue(account);
    if (account.activities === null || value === null) {
      excludedAccounts.push(accountLabel(account, accounts));
      continue;
    }
    for (const [currency, cents] of value) entry(currency).valueCents += cents;

    for (const activity of account.activities) {
      if (activity.date > ctx.asOf) continue;
      const isTransfer =
        activity.kind === "transfer_in" || activity.kind === "transfer_out";
      if (isTransfer && activity.amountCents === 0 && activity.units !== 0) {
        assetTransfersWithoutValue += 1;
        continue;
      }
      if (activity.currency === null) continue;
      const row = entry(activity.currency);
      if (activity.kind === "contribution") {
        row.contributionsCents += activity.amountCents;
      } else if (activity.kind === "withdrawal") {
        row.withdrawalsCents -= activity.amountCents;
      } else if (isTransfer) {
        row.transfersNetCents += activity.amountCents;
      }
    }
  }

  const rows = orderCurrencies(totals.keys(), ctx.settings.baseCurrency).map(
    (currency) => {
      const row = totals.get(currency)!;
      const netContributedCents =
        row.contributionsCents - row.withdrawalsCents + row.transfersNetCents;
      return {
        ...row,
        netContributedCents,
        growthCents: row.valueCents - netContributedCents,
      };
    },
  );

  return { rows, excludedAccounts, assetTransfersWithoutValue };
}

export function renderContributions(
  result: ContributionsResult,
  ctx: Context,
): Block[] {
  const base = ctx.settings.baseCurrency;
  const heading: Block = {
    kind: "heading",
    level: 2,
    text: "Contributions and growth",
    id: "contributions-and-growth",
  };
  if (result.rows.length === 0) {
    return [
      heading,
      {
        kind: "paragraph",
        text: ["No contribution history or account values were available."],
      },
    ];
  }

  const measures: [string, (row: ContributionTotals) => string, boolean][] = [
    [
      "Contributions",
      (r) => money(r.contributionsCents, r.currency, base),
      result.rows.some((r) => r.withdrawalsCents || r.transfersNetCents),
    ],
    [
      "Withdrawals",
      (r) => money(-r.withdrawalsCents, r.currency, base),
      result.rows.some((r) => r.withdrawalsCents),
    ],
    [
      "Transfers (net)",
      (r) => signedMoney(r.transfersNetCents, r.currency, base),
      result.rows.some((r) => r.transfersNetCents),
    ],
    [
      "Total contributed",
      (r) => money(r.netContributedCents, r.currency, base),
      true,
    ],
    ["Current value", (r) => money(r.valueCents, r.currency, base), true],
    ["Net growth", (r) => signedMoney(r.growthCents, r.currency, base), true],
  ];
  const visible = measures.filter(([, , show]) => show);
  const single = result.rows.length === 1;

  return [
    heading,
    {
      kind: "table",
      columns: [
        { label: "Measure" },
        ...(single
          ? [{ label: "Amount", align: "right" as const }]
          : result.rows.map((r) => ({
              label: r.currency,
              align: "right" as const,
            }))),
      ],
      rows: visible.map(([label, format]) => [
        label,
        ...result.rows.map(format),
      ]),
    },
    {
      kind: "paragraph",
      text: [
        "Net growth is current value minus total contributed. Percentage returns are not shown, since recurring contributions make them misleading.",
      ],
    },
  ];
}
