import { limitsFor } from "@/lib/limits";
import { accountLabel, inScope, notConfigured, type Context } from "./context";
import { money, sumBy } from "./money";
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

export function analyzeRoom(
  accounts: ReportAccount[],
  ctx: Context,
): RoomResult {
  const { year } = ctx.period;
  const start = `${year}-01-01`;
  const target = ctx.settings.contributionTargetCents;
  const scoped = accounts.filter((a) => inScope(a, ctx.settings));
  // Contributions still expected this year: this month's shortfall plus the
  // target for each remaining month.
  const thisMonth = sumBy(
    scoped
      .flatMap((a) => a.activities ?? [])
      .filter(
        (a) =>
          a.kind === "contribution" &&
          a.currency === ROOM_CURRENCY &&
          a.date >= ctx.period.start &&
          a.date <= ctx.evalDate,
      ),
    (a) => a.amountCents,
  );
  const expectedCents =
    target === undefined
      ? 0
      : Math.max(0, target - thisMonth) + target * (12 - ctx.period.month);
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

    // A projection is only meaningful when every targeted account is this type.
    const projects =
      target !== undefined &&
      scoped.length > 0 &&
      scoped.every((a) => a.registeredType === type);
    const projectedCents =
      remainingCents !== null && projects
        ? remainingCents - expectedCents
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
          `Contributions at the monthly target are projected to exceed ${type} room by ${money(-projectedCents, ROOM_CURRENCY, ROOM_CURRENCY)} by ${year}-12-31.`,
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
    scheduledMonthlyCents: target ?? null,
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
  // Reference limits only for accounts without starting room configured.
  const reference = limits
    ? result.rows
        .filter((row) => row.availableCents === null)
        .map((row) =>
          row.type === "TFSA"
            ? `TFSA ${cad(limits.tfsaAnnualCents)}`
            : row.type === "RRSP"
              ? `RRSP ${cad(limits.rrspMaximumCents)} maximum`
              : `FHSA ${cad(limits.fhsaAnnualCents)} (${cad(limits.fhsaLifetimeCents)} lifetime)`,
        )
    : [];
  if (reference.length > 0) {
    notes.push(
      `${result.year} annual ${reference.length === 1 ? "limit" : "limits"}: ${reference.join("; ")}.`,
    );
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
      `Projection assumes the ${money(result.scheduledMonthlyCents, base, base)} monthly contribution target is met through December.`,
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
    blocks.push(notConfigured("Remaining room", "starting room"));
  }
  return blocks;
}
