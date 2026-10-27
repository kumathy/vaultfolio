import { accountLabel, inScope, symbolsMatch, type Context } from "./context";
import { money, sumBy, units } from "./money";
import { addDays, daysBetween, daysInMonth, isoDate } from "./period";
import type { Activity, Block, ReportAccount, Status } from "./types";

export interface PlanCheck {
  label: string;
  status: Status;
  detail: string;
}

export interface PlanResult {
  status: "on-track" | "attention" | "not-configured";
  checks: PlanCheck[];
  warnings: string[];
}

const CASH_INFLOWS = new Set([
  "contribution",
  "transfer_in",
  "sell",
  "distribution",
  "interest",
]);

function listDeposits(deposits: Activity[], base: string): string {
  return deposits
    .map(
      (d) => `${money(d.amountCents, d.currency ?? base, base)} on ${d.date}`,
    )
    .join("; ");
}

function listPurchases(purchases: Activity[]): string {
  return purchases
    .map(
      (p) =>
        `${units(p.units)} units ${p.symbol ?? "unknown symbol"} purchased on ${p.date}`,
    )
    .join("; ");
}

function uninvestedCash(
  scoped: ReportAccount[],
  all: ReportAccount[],
  ctx: Context,
): PlanCheck[] {
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
  const checks: PlanCheck[] = [];
  const below: string[] = [];

  for (const account of scoped) {
    if (account.cash === null) continue;
    const where = named ? ` in ${accountLabel(account, all)}` : "";
    for (const cash of account.cash) {
      const amount = money(cash.cents, cash.currency, base);
      if (cash.cents < threshold) {
        below.push(amount);
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
    checks.push({
      label,
      status: "On track",
      detail:
        below.length === 1
          ? `${below[0]} (below ${money(threshold, base, base)} threshold)`
          : `All cash balances below ${money(threshold, base, base)} threshold`,
    });
  }
  return checks;
}

export function analyzePlan(
  accounts: ReportAccount[],
  ctx: Context,
): PlanResult {
  const { settings, period, evalDate } = ctx;
  const base = settings.baseCurrency;
  const plan = settings.plan;
  const scoped = accounts.filter((a) => inScope(a, settings));
  const history = scoped.flatMap((a) => a.activities ?? []);
  const inPeriod = history
    .filter((a) => a.date >= period.start && a.date <= evalDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const deposits = inPeriod.filter(
    (a) => a.kind === "contribution" && a.currency === base,
  );
  const purchases = inPeriod.filter((a) => a.kind === "buy");
  const missingHistory =
    scoped.length > 0 && scoped.every((a) => a.activities === null);

  const checks: PlanCheck[] = [];

  if (!plan) {
    checks.push(
      {
        label: "Deposits this month",
        status: "Not configured",
        detail: deposits.length
          ? listDeposits(deposits, base)
          : "None recorded",
      },
      {
        label: "Purchases this month",
        status: "Not configured",
        detail: purchases.length ? listPurchases(purchases) : "None recorded",
      },
    );
  } else if (missingHistory) {
    checks.push(
      {
        label: "Deposit received",
        status: "Not applicable",
        detail: "Transactions could not be loaded",
      },
      {
        label: "Invested per plan",
        status: "Not applicable",
        detail: "Transactions could not be loaded",
      },
    );
  } else {
    const due = isoDate(
      period.year,
      period.month,
      Math.min(plan.contributionDay, daysInMonth(period.year, period.month)),
    );
    const scheduled = money(plan.monthlyAmountCents, base, base);
    const received = sumBy(deposits, (d) => d.amountCents);

    // Activities post with a one-day delay, so a deposit is not overdue until
    // the day after it is scheduled.
    checks.push(
      received >= plan.monthlyAmountCents
        ? {
            label: "Deposit received",
            status: "On track",
            detail: listDeposits(deposits, base),
          }
        : received > 0
          ? {
              label: "Deposit received",
              status: "Attention",
              detail: `${money(received, base, base)} received of ${scheduled} scheduled`,
            }
          : evalDate <= addDays(due, 1)
            ? {
                label: "Deposit received",
                status: "Not applicable",
                detail: `${scheduled} scheduled for ${due}`,
              }
            : {
                label: "Deposit received",
                status: "Attention",
                detail: `No deposit recorded; ${scheduled} scheduled for ${due}`,
              },
    );

    if (received === 0) {
      checks.push({
        label: "Invested per plan",
        status: "Not applicable",
        detail: "No deposit to invest",
      });
    } else {
      const threshold = settings.uninvestedCashThresholdCents;
      const planPurchases = purchases.filter((p) =>
        plan.targets.some((t) => symbolsMatch(p.symbol, t.symbol)),
      );
      const shortfalls = plan.targets
        .map((target) => {
          const expected = Math.round((received * target.weightPercent) / 100);
          const bought = -sumBy(
            planPurchases.filter(
              (p) =>
                symbolsMatch(p.symbol, target.symbol) && p.currency === base,
            ),
            (p) => p.amountCents,
          );
          return { symbol: target.symbol, expected, bought };
        })
        .filter((s) => s.bought < s.expected - threshold);
      const others = [
        ...new Set(
          purchases
            .filter((p) => !planPurchases.includes(p))
            .map((p) => p.symbol ?? "unknown symbol"),
        ),
      ];
      const otherNote = others.length
        ? `; also purchased ${others.join(", ")} (not in plan)`
        : "";

      if (shortfalls.length === 0) {
        checks.push({
          label: "Invested per plan",
          status: "On track",
          detail: listPurchases(planPurchases) + otherNote,
        });
      } else {
        const firstDeposit = deposits[0].date;
        const waited = daysBetween(firstDeposit, evalDate);
        const missing = shortfalls
          .map(
            (s) =>
              `${s.symbol} ${money(s.bought, base, base)} of ${money(s.expected, base, base)}`,
          )
          .join(", ");
        checks.push(
          waited <= settings.uninvestedCashDays
            ? {
                label: "Invested per plan",
                status: "Not applicable",
                detail: `Deposit from ${firstDeposit} not yet invested (within ${settings.uninvestedCashDays}-day window)`,
              }
            : {
                label: "Invested per plan",
                status: "Attention",
                detail: `Purchased below plan: ${missing}${otherNote}`,
              },
        );
      }
    }
  }

  checks.push(...uninvestedCash(scoped, accounts, ctx));

  const attention = checks.filter((c) => c.status === "Attention");
  return {
    status: !plan
      ? "not-configured"
      : attention.length
        ? "attention"
        : "on-track",
    checks,
    warnings: attention.map((c) => `${c.label}: ${c.detail}.`),
  };
}

export function renderPlan(result: PlanResult): Block[] {
  return [
    { kind: "heading", level: 2, text: "Plan execution", id: "plan-execution" },
    {
      kind: "table",
      columns: [{ label: "Check" }, { label: "Status" }, { label: "Detail" }],
      rows: result.checks.map((c) => [c.label, c.status, c.detail]),
    },
    ...(result.status === "not-configured"
      ? [
          {
            kind: "callout" as const,
            callout: "info" as const,
            title:
              "Plan execution is not evaluated: no monthly plan has been configured in Vaultfolio settings.",
            lines: [],
          },
        ]
      : []),
  ];
}
