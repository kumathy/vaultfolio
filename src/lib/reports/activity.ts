import { accountLabel, inScope, notConfigured, type Context } from "./context";
import { money, sumBy, units } from "./money";
import { addDays, daysBetween } from "./period";
import type { Activity, Block, ReportAccount, Status } from "./types";

// Monthly totals only: deposits can be daily, weekly, biweekly, monthly or
// manual, so no schedule or deposit day is assumed.

export interface ActivityRow {
  label: string;
  // null for factual rows that are not judged.
  status: Status | null;
  detail: string;
}

export type ContributionStatus =
  "on-track" | "in-progress" | "attention" | "not-configured";

export interface ActivityResult {
  contributionStatus: ContributionStatus;
  contributedCents: number;
  targetCents: number | null;
  rows: ActivityRow[];
  warnings: string[];
}

const CASH_INFLOWS = new Set([
  "contribution",
  "transfer_in",
  "sell",
  "distribution",
  "interest",
]);

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
const unitCount = (n: number) => `${units(n)} ${n === 1 ? "unit" : "units"}`;

function bySymbol(
  activities: Activity[],
  base: string,
  describe: (symbol: string, items: Activity[], base: string) => string,
): string {
  const groups = new Map<string, Activity[]>();
  for (const a of activities) {
    const key = a.symbol ?? "Unknown";
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  // Largest amounts first; amounts in other currencies are compared as-is.
  const size = (items: Activity[]) =>
    Math.abs(sumBy(items, (a) => a.amountCents));
  return [...groups]
    .sort(([, a], [, b]) => size(b) - size(a))
    .map(([symbol, items]) => describe(symbol, items, base))
    .join("; ");
}

const currencyOf = (items: Activity[], base: string) =>
  items[0].currency ?? base;

function uninvestedCash(
  scoped: ReportAccount[],
  all: ReportAccount[],
  ctx: Context,
): ActivityRow[] {
  const label = "Uninvested cash";
  if (!ctx.isCurrentPeriod) {
    return [
      {
        label,
        status: "Not applicable",
        detail: "Cash balances are available for the current month only",
      },
    ];
  }

  const { uninvestedCashDays: days, uninvestedCashThresholdCents: threshold } =
    ctx.settings;
  const base = ctx.settings.baseCurrency;
  const named = scoped.length > 1;
  const checks: ActivityRow[] = [];
  const below: { amount: string; currency: string }[] = [];

  for (const account of scoped) {
    if (account.cash === null) continue;
    const where = named ? ` in ${accountLabel(account, all)}` : "";
    for (const cash of account.cash) {
      const amount = money(cash.cents, cash.currency, base);
      if (cash.cents < threshold) {
        below.push({ amount, currency: cash.currency });
        continue;
      }
      const activities = (account.activities ?? []).filter(
        (a) => a.date <= ctx.asOf,
      );
      const lastPurchase = activities
        .filter((a) => a.kind === "buy" || a.kind === "reinvestment")
        .at(-1)?.date;
      const idleSince = activities.find(
        (a) =>
          CASH_INFLOWS.has(a.kind) &&
          a.amountCents > 0 &&
          (lastPurchase === undefined || a.date > lastPurchase),
      )?.date;

      if (!idleSince) {
        checks.push({
          label,
          status: "Not applicable",
          detail: `${amount}${where}; arrival date not found in transaction history`,
        });
        continue;
      }
      const age = daysBetween(idleSince, ctx.asOf);
      checks.push(
        age > days
          ? {
              label,
              status: "Attention",
              detail: `${amount}${where} uninvested since ${idleSince} (${age} days)`,
            }
          : {
              label,
              status: "On track",
              detail: `${amount}${where} since ${idleSince} (${age} days, within ${days}-day window)`,
            },
      );
    }
  }

  if (checks.length === 0) {
    // The minimum is the same figure in each currency, so it is stated in the
    // balance's own currency rather than implying a conversion.
    const currencies = [...new Set(below.map((b) => b.currency))];
    const limits = (currencies.length ? currencies : [base]).map((c) =>
      money(threshold, c, base),
    );
    checks.push({
      label,
      status: "On track",
      detail:
        below.length === 1
          ? `${below[0].amount} (below ${limits[0]} threshold)`
          : `All cash balances below ${limits.join(" and ")} ${limits.length > 1 ? "thresholds" : "threshold"}`,
    });
  }
  return checks;
}

export function analyzeActivity(
  accounts: ReportAccount[],
  ctx: Context,
): ActivityResult {
  const { settings, period, evalDate } = ctx;
  const base = settings.baseCurrency;
  const scoped = accounts.filter((a) => inScope(a, settings));
  const inPeriod = scoped
    .flatMap((a) => a.activities ?? [])
    .filter((a) => a.date >= period.start && a.date <= evalDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  const deposits = inPeriod.filter(
    (a) => a.kind === "contribution" && a.currency === base,
  );
  const purchases = inPeriod.filter((a) => a.kind === "buy");
  const distributions = inPeriod.filter(
    (a) => a.kind === "distribution" && a.amountCents > 0,
  );
  const contributedCents = sumBy(deposits, (d) => d.amountCents);
  const target = settings.contributionTargetCents ?? null;
  // Activities post a day late, so a month is final from the second day after it.
  const monthClosed = ctx.asOf > addDays(period.end, 1);

  let contributionStatus: ContributionStatus = "not-configured";
  let contributions: ActivityRow;
  const deposited = count(deposits.length, "deposit");
  if (target === null) {
    contributions = {
      label: "Contributions",
      status: "Not configured",
      detail: deposits.length
        ? `${money(contributedCents, base, base)} (${deposited})`
        : "None recorded",
    };
  } else {
    const progress = `${money(contributedCents, base, base)} of ${money(target, base, base)} target`;
    if (contributedCents >= target) {
      contributionStatus = "on-track";
      contributions = {
        label: "Contributions",
        status: "On track",
        detail: `${progress} (${deposited})`,
      };
    } else if (monthClosed) {
      contributionStatus = "attention";
      contributions = {
        label: "Contributions",
        status: "Attention",
        detail: `${progress} (${deposited})`,
      };
    } else {
      contributionStatus = "in-progress";
      contributions = {
        label: "Contributions",
        status: "In progress",
        detail: `${progress} so far (${deposited})`,
      };
    }
  }

  const rows: ActivityRow[] = [
    contributions,
    {
      label: "Purchases",
      status: null,
      detail: purchases.length
        ? bySymbol(
            purchases,
            base,
            (symbol, items, b) =>
              `${unitCount(sumBy(items, (p) => p.units))} ${symbol} (${money(-sumBy(items, (p) => p.amountCents), currencyOf(items, b), b)})`,
          )
        : "None recorded",
    },
    {
      label: "Distributions",
      status: null,
      detail: distributions.length
        ? bySymbol(
            distributions,
            base,
            (symbol, items, b) =>
              `${money(
                sumBy(items, (d) => d.amountCents),
                currencyOf(items, b),
                b,
              )} from ${symbol}`,
          )
        : "None recorded",
    },
    ...uninvestedCash(scoped, accounts, ctx),
  ];

  const attention = rows.filter((r) => r.status === "Attention");
  return {
    contributionStatus,
    contributedCents,
    targetCents: target,
    rows,
    warnings: attention.map((r) => `${r.label}: ${r.detail}.`),
  };
}

export function renderActivity(result: ActivityResult): Block[] {
  return [
    {
      kind: "heading",
      level: 2,
      text: "Monthly activity",
      id: "monthly-activity",
    },
    {
      kind: "table",
      columns: [{ label: "Activity" }, { label: "Detail" }],
      // A status is shown only where something was checked. "Not applicable"
      // rows are left out, and a missing target is noted once below.
      rows: result.rows
        .filter((r) => r.status !== "Not applicable")
        .map((r) => [
          r.label,
          r.status && r.status !== "Not configured"
            ? `${r.detail} — ${r.status}`
            : r.detail,
        ]),
    },
    ...(result.contributionStatus === "not-configured"
      ? [notConfigured("Contribution progress", "monthly contribution target")]
      : []),
  ];
}
