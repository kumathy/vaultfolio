import {
  accountLabel,
  accountValue,
  orderCurrencies,
  type Context,
} from "./context";
import { money, signedMoney } from "./money";
import { daysBetween } from "./period";
import type { Activity, Block, ReportAccount } from "./types";

export interface ContributionTotals {
  currency: string;
  contributionsCents: number;
  withdrawalsCents: number;
  transfersNetCents: number;
  netContributedCents: number;
  // Past months use SnapTrade's estimated value history; null when it has no
  // value close enough to the month's end.
  valueCents: number | null;
  growthCents: number | null;
}

export interface ContributionsResult {
  rows: ContributionTotals[];
  // Last day counted: today in the current month, otherwise the month's end.
  through: string;
  // Past months: values are estimates from SnapTrade's value history.
  valuesEstimated: boolean;
  excludedAccounts: string[];
  // Past months: accounts whose value history cannot be split by currency.
  mixedCurrencyAccounts: string[];
  assetTransfersWithoutValue: number;
  // Accounts that held money before their earliest available transaction.
  incompleteHistory: { account: string; since: string | null }[];
}

// An account opened within the available history starts with money coming in.
// Any other first transaction (a purchase, distribution or withdrawal) means it
// held money before the history SnapTrade provides.
function startsWithFunding(
  activities: Activity[],
  value: Map<string, number>,
): boolean {
  if (activities.length === 0) {
    return [...value.values()].every((cents) => cents === 0);
  }
  const first = activities.reduce(
    (min, a) => (a.date < min ? a.date : min),
    activities[0].date,
  );
  return activities.some(
    (a) =>
      a.date === first &&
      (a.kind === "contribution" || a.kind === "transfer_in"),
  );
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

  const live = ctx.isCurrentPeriod;
  // Currencies missing a value for some account, so their total is unknown.
  const unvalued = new Set<string>();
  const excludedAccounts: string[] = [];
  const mixedCurrencyAccounts: string[] = [];
  const incompleteHistory: ContributionsResult["incompleteHistory"] = [];
  let assetTransfersWithoutValue = 0;

  for (const account of accounts) {
    const value = accountValue(account);
    if (account.activities === null || (live && value === null)) {
      excludedAccounts.push(accountLabel(account, accounts));
      continue;
    }
    if (live && value) {
      for (const [currency, cents] of value) {
        const row = entry(currency);
        row.valueCents = (row.valueCents ?? 0) + cents;
      }
    } else if (!live) {
      // The value history is one total in the account's currency, with other
      // currencies already converted by SnapTrade. Contributions are kept per
      // currency, so an account that used several cannot be compared.
      const used = currenciesUsed(account, ctx.evalDate);
      const estimate = estimatedValueOn(account, ctx.evalDate);
      const mixed =
        estimate !== null && [...used].some((c) => c !== estimate.currency);
      if (estimate && !mixed) {
        const row = entry(estimate.currency);
        row.valueCents = (row.valueCents ?? 0) + estimate.cents;
      } else {
        if (mixed) mixedCurrencyAccounts.push(accountLabel(account, accounts));
        for (const currency of used) unvalued.add(currency);
        unvalued.add(account.valueHistory?.currency ?? "");
      }
    }
    if (!startsWithFunding(account.activities, value ?? new Map())) {
      incompleteHistory.push({
        account: accountLabel(account, accounts),
        since: account.firstTransactionDate,
      });
    }

    for (const activity of account.activities) {
      if (activity.date > ctx.evalDate) continue;
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
      if (unvalued.has(currency) || unvalued.has("")) row.valueCents = null;
      const netContributedCents =
        row.contributionsCents - row.withdrawalsCents + row.transfersNetCents;
      return {
        ...row,
        netContributedCents,
        growthCents:
          row.valueCents === null ? null : row.valueCents - netContributedCents,
      };
    },
  );

  return {
    rows,
    through: ctx.evalDate,
    valuesEstimated: !live,
    excludedAccounts,
    mixedCurrencyAccounts,
    assetTransfersWithoutValue,
    incompleteHistory,
  };
}

function currenciesUsed(account: ReportAccount, through: string): Set<string> {
  const used = new Set<string>();
  for (const activity of account.activities ?? []) {
    if (activity.date <= through && activity.currency) {
      used.add(activity.currency);
    }
  }
  return used;
}

// SnapTrade's value history is daily but may have gaps; an older value would
// misstate the month's end.
const MAX_VALUE_AGE_DAYS = 7;

function estimatedValueOn(
  account: ReportAccount,
  date: string,
): { currency: string; cents: number } | null {
  const history = account.valueHistory;
  if (!history) return null;
  const point = history.points.findLast((p) => p.date <= date);
  if (!point || daysBetween(point.date, date) > MAX_VALUE_AGE_DAYS) return null;
  return { currency: history.currency, cents: point.cents };
}

function estimateNotes(result: ContributionsResult): Block[] {
  const known = result.rows.some((r) => r.valueCents !== null);
  const mixed = result.mixedCurrencyAccounts;
  const notes: string[] = [];
  if (known) {
    notes.push(
      "Estimate: account value at month end, from SnapTrade's account value history.",
    );
  } else if (mixed.length === 0) {
    notes.push(
      "Value and net growth are not available: SnapTrade's account value history has no value near month end.",
    );
  }
  if (mixed.length > 0) {
    notes.push(
      `Value is not available for ${mixed.join(", ")}: SnapTrade's account value history is one total across currencies, which cannot be compared with contributions in each currency.`,
    );
  }
  return notes.map((note) => ({ kind: "paragraph", text: [note] }));
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
    [
      "Value",
      (r) =>
        r.valueCents === null
          ? "Not available"
          : money(r.valueCents, r.currency, base),
      true,
    ],
    [
      "Net growth",
      (r) =>
        r.growthCents === null
          ? "Not available"
          : signedMoney(r.growthCents, r.currency, base),
      true,
    ],
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
    ...(result.valuesEstimated ? estimateNotes(result) : []),
    ...historyLine(result.incompleteHistory),
  ];
}

function historyLine(
  incomplete: ContributionsResult["incompleteHistory"],
): Block[] {
  if (incomplete.length === 0) return [];
  const parts = incomplete.map(({ account, since }) =>
    since ? `before ${since} for ${account}` : `for ${account}`,
  );
  return [
    {
      kind: "paragraph",
      text: [
        `Transactions are not available ${parts.join(" or ")}; total contributed may be understated and net growth overstated.`,
      ],
    },
  ];
}
