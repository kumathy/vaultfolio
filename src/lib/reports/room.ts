import { limitsFor } from "@/lib/limits";
import { accountLabel, inScope, type Context } from "./context";
import { money, sumBy } from "./money";
import { daysInMonth, isoDate } from "./period";
import type { Block, RegisteredType, ReportAccount, Status } from "./types";

const TYPES: RegisteredType[] = ["TFSA", "RRSP", "FHSA"];
// Registered room is set by the CRA in Canadian dollars.
const ROOM_CURRENCY = "CAD";

export interface RoomRow {
  type: RegisteredType;
  availableCents: number | null;
  contributedCents: number;
  withdrawnCents: number;
  transferredInCents: number;
  remainingCents: number | null;
  projectedCents: number | null;
  status: Status;
}

export interface RoomResult {
  year: number;
  rows: RoomRow[];
  scheduledMonthlyCents: number | null;
  otherCurrencyContributions: number;
  missingAccounts: string[];
  warnings: string[];
}

function remainingScheduledDeposits(ctx: Context, day: number): number {
  const { year } = ctx.period;
  let count = 0;
  for (let month = ctx.period.month; month <= 12; month++) {
    const due = isoDate(year, month, Math.min(day, daysInMonth(year, month)));
    if (due > ctx.evalDate) count += 1;
  }
  return count;
}

export function analyzeRoom(
  accounts: ReportAccount[],
  ctx: Context,
): RoomResult {
  const { year } = ctx.period;
  const start = `${year}-01-01`;
  const plan = ctx.settings.plan;
  const planAccounts = accounts.filter((a) => inScope(a, ctx.settings));
  const missingAccounts: string[] = [];
  const warnings: string[] = [];
  let otherCurrencyContributions = 0;

  const rows = TYPES.flatMap((type): RoomRow[] => {
    const typed = accounts.filter((a) => a.registeredType === type);
    if (typed.length === 0) return [];

    const activities = typed.flatMap((account) => {
      if (account.activities === null) {
        missingAccounts.push(accountLabel(account, accounts));
        return [];
      }
      return account.activities.filter(
        (a) => a.date >= start && a.date <= ctx.evalDate,
      );
    });
    const inCad = activities.filter((a) => a.currency === ROOM_CURRENCY);
    otherCurrencyContributions += activities.filter(
      (a) => a.kind === "contribution" && a.currency !== ROOM_CURRENCY,
    ).length;

    const contributedCents = sumBy(
      inCad.filter((a) => a.kind === "contribution"),
      (a) => a.amountCents,
    );
    const withdrawnCents = -sumBy(
      inCad.filter((a) => a.kind === "withdrawal"),
      (a) => a.amountCents,
    );
    const transferredInCents = sumBy(
      inCad.filter((a) => a.kind === "transfer_in" && a.amountCents > 0),
      (a) => a.amountCents,
    );

    const setting = ctx.settings.room?.[type];
    const availableCents =
      setting && setting.year === year ? setting.availableCents : null;
    const remainingCents =
      availableCents === null ? null : availableCents - contributedCents;

    // A projection is only meaningful when every plan account is this type.
    const projects =
      plan !== undefined &&
      planAccounts.length > 0 &&
      planAccounts.every((a) => a.registeredType === type);
    const projectedCents =
      remainingCents !== null && projects
        ? remainingCents -
          remainingScheduledDeposits(ctx, plan.contributionDay) *
            plan.monthlyAmountCents
        : null;

    let status: Status = "Not configured";
    if (remainingCents !== null) {
      status = "On track";
      if (remainingCents < 0) {
        status = "Attention";
        warnings.push(
          `${type} contributions exceed available room by ${money(-remainingCents, ROOM_CURRENCY, ROOM_CURRENCY)}.`,
        );
      } else if (projectedCents !== null && projectedCents < 0) {
        status = "Attention";
        warnings.push(
          `Scheduled contributions are projected to exceed ${type} room by ${money(-projectedCents, ROOM_CURRENCY, ROOM_CURRENCY)} by ${year}-12-31.`,
        );
      }
    }

    return [
      {
        type,
        availableCents,
        contributedCents,
        withdrawnCents,
        transferredInCents,
        remainingCents,
        projectedCents,
        status,
      },
    ];
  });

  return {
    year,
    rows,
    scheduledMonthlyCents: plan ? plan.monthlyAmountCents : null,
    otherCurrencyContributions,
    missingAccounts,
    warnings,
  };
}

export function renderRoom(result: RoomResult, ctx: Context): Block[] {
  const base = ctx.settings.baseCurrency;
  const cad = (cents: number) => money(cents, ROOM_CURRENCY, base);
  const heading: Block = {
    kind: "heading",
    level: 2,
    text: `Registered account room — ${result.year}`,
    id: "registered-account-room",
  };
  if (result.rows.length === 0) {
    return [
      heading,
      {
        kind: "paragraph",
        text: [
          "No TFSA, RRSP or FHSA accounts were identified. Account types can be tagged in Vaultfolio settings.",
        ],
      },
    ];
  }

  const anyConfigured = result.rows.some((r) => r.availableCents !== null);
  const anyProjection = result.rows.some((r) => r.projectedCents !== null);
  const right = "right" as const;

  const blocks: Block[] = [
    heading,
    {
      kind: "table",
      columns: [
        { label: "Account" },
        ...(anyConfigured
          ? [{ label: "Available at Jan 1", align: right }]
          : []),
        { label: "Contributed YTD", align: right },
        { label: "Withdrawn YTD", align: right },
        { label: "Remaining", align: anyConfigured ? right : undefined },
        ...(anyProjection
          ? [{ label: "Projected at Dec 31", align: right }]
          : []),
        { label: "Status" },
      ],
      rows: result.rows.map((row) => [
        row.type,
        ...(anyConfigured
          ? [row.availableCents === null ? "—" : cad(row.availableCents)]
          : []),
        cad(row.contributedCents),
        cad(row.withdrawnCents),
        row.remainingCents === null
          ? "Not configured"
          : cad(row.remainingCents),
        ...(anyProjection
          ? [row.projectedCents === null ? "—" : cad(row.projectedCents)]
          : []),
        row.status,
      ]),
    },
  ];

  const notes: string[] = [];
  const limits = limitsFor(result.year);
  for (const row of result.rows) {
    if (row.availableCents !== null || !limits) continue;
    if (row.type === "TFSA") {
      notes.push(
        `${result.year} annual TFSA limit, for reference: ${cad(limits.tfsaAnnualCents)}. Actual available room also includes unused room carried forward from previous years.`,
      );
    } else if (row.type === "RRSP") {
      notes.push(
        `${result.year} RRSP maximum, for reference: ${cad(limits.rrspMaximumCents)}. The deduction limit on the latest notice of assessment applies.`,
      );
    } else {
      notes.push(
        `${result.year} FHSA annual limit, for reference: ${cad(limits.fhsaAnnualCents)} (lifetime limit ${cad(limits.fhsaLifetimeCents)}).`,
      );
    }
  }
  if (limits && result.rows.some((r) => r.type === "RRSP")) {
    notes.push(
      `RRSP contributions made up to ${limits.rrspDeadline} can be deducted for ${result.year}.`,
    );
  }
  if (result.rows.some((r) => r.type === "TFSA" && r.withdrawnCents > 0)) {
    notes.push(
      "TFSA withdrawals are added back to room on January 1 of the following year.",
    );
  }
  const transferred = sumBy(result.rows, (r) => r.transferredInCents);
  if (transferred > 0) {
    notes.push(
      `Transfers in (${cad(transferred)}) are not counted as contributions. A transfer from a non-registered account is a contribution and can be reclassified in Vaultfolio settings.`,
    );
  }
  if (anyProjection && result.scheduledMonthlyCents !== null) {
    notes.push(
      `Projection assumes the scheduled ${money(result.scheduledMonthlyCents, base, base)} monthly contribution continues through December.`,
    );
  }
  if (result.otherCurrencyContributions > 0) {
    notes.push(
      "Contributions in currencies other than CAD are not included in room calculations.",
    );
  }
  if (result.missingAccounts.length > 0) {
    notes.push(
      `Transactions could not be loaded for ${result.missingAccounts.join(", ")}; room figures exclude ${result.missingAccounts.length === 1 ? "this account" : "these accounts"}.`,
    );
  }
  blocks.push(
    ...notes.map((note): Block => ({ kind: "paragraph", text: [note] })),
  );

  if (result.rows.some((r) => r.availableCents === null)) {
    blocks.push({
      kind: "callout",
      callout: "info",
      title:
        "Remaining room is not calculated: starting room has not been configured in Vaultfolio settings.",
      lines: [],
    });
  }
  return blocks;
}
