import { analyzeContributions, renderContributions } from "./contributions";
import { accountLabel, createContext, type Context } from "./context";
import { analyzeDistributions, renderDistributions } from "./distributions";
import { analyzeHoldings, renderHoldings } from "./holdings";
import { renderMarkdown } from "./markdown";
import { money, plainAmount, signedMoney } from "./money";
import { localDateTime, localTimestamp, type Period } from "./period";
import { analyzePlan, renderPlan } from "./plan";
import { analyzeRoom, renderRoom } from "./room";
import {
  resolveSettings,
  type Block,
  type Inline,
  type RegisteredType,
  type ReportDocument,
  type ReportInput,
  type ReportSettings,
} from "./types";

export interface BuildOptions {
  period: Period;
  now: Date;
  settings?: ReportSettings;
}

export interface Report {
  fileName: string;
  document: ReportDocument;
  markdown: string;
}

function dataNotes(
  input: ReportInput,
  ctx: Context,
  extra: string[],
): Inline[][] {
  const { accounts } = input;
  const notes: string[] = [
    "Transactions are reported by the brokerage with a one-day delay.",
  ];
  if (accounts.length === 0) {
    notes.push("No brokerage accounts were available for this report.");
  }
  for (const account of accounts) {
    const failed = [
      account.holdings === null && "holdings",
      account.cash === null && "cash balances",
      account.activities === null && "transactions",
    ].filter(Boolean);
    if (failed.length > 0) {
      notes.push(
        `${accountLabel(account, accounts)}: ${failed.join(", ")} could not be loaded; affected sections exclude this data.`,
      );
    }
  }
  const starts = accounts
    .filter((a) => a.firstTransactionDate)
    .map((a) => `${a.firstTransactionDate} (${accountLabel(a, accounts)})`);
  if (starts.length > 0) {
    notes.push(`Transaction history starts on ${starts.join(", ")}.`);
  }
  if (!ctx.isCurrentPeriod) {
    notes.push(
      `Values and holdings are as of ${ctx.asOf}; historical prices are not available.`,
    );
  }
  const asOf = accounts
    .map((a) => a.dataAsOf)
    .filter((d): d is string => d !== null && !Number.isNaN(Date.parse(d)))
    .sort()[0];
  if (asOf) {
    notes.push(
      `Holdings data as of ${localDateTime(new Date(asOf), ctx.settings.timeZone)}.`,
    );
  }
  for (const account of accounts.filter((a) => a.isPaper)) {
    notes.push(
      `${accountLabel(account, accounts)} is a paper (simulated) account.`,
    );
  }
  if (
    accounts.some((a) =>
      a.holdings?.some((h) => h.currency === null || h.valueCents === null),
    )
  ) {
    notes.push(
      "Positions without a reported price or currency are excluded from totals.",
    );
  }
  return [...notes, ...extra].map((note) => [note]);
}

export function buildReport(input: ReportInput, options: BuildOptions): Report {
  const settings = resolveSettings(options.settings);
  const ctx = createContext(options.period, options.now, settings);
  const base = settings.baseCurrency;
  const { accounts } = input;

  const holdings = analyzeHoldings(accounts, ctx);
  const contributions = analyzeContributions(accounts, ctx);
  const plan = analyzePlan(accounts, ctx);
  const room = analyzeRoom(accounts, ctx);
  const distributions = analyzeDistributions(accounts, ctx);

  const value =
    holdings.totals.find((t) => t.currency === base) ?? holdings.totals[0];
  const growth =
    contributions.rows.find((r) => r.currency === base) ??
    contributions.rows[0];
  const tfsa = room.rows.find((r) => r.type === "TFSA");

  const summary: Inline[] = [];
  if (plan.status === "on-track")
    summary.push("Monthly plan executed on schedule. ");
  if (plan.status === "attention")
    summary.push("Monthly plan needs attention. ");
  if (growth) {
    summary.push(
      "Portfolio value: ",
      { bold: money(growth.valueCents, growth.currency, base) },
      " against ",
      { bold: money(growth.netContributedCents, growth.currency, base) },
      " contributed (net growth ",
      { bold: signedMoney(growth.growthCents, growth.currency, base) },
      "). ",
    );
  } else if (value) {
    summary.push(
      "Portfolio value: ",
      { bold: money(value.cents, value.currency, base) },
      ". ",
    );
  }
  if (tfsa?.remainingCents != null) {
    summary.push(
      `TFSA room remaining for ${room.year}: `,
      { bold: money(tfsa.remainingCents, "CAD", base) },
      ".",
    );
  }
  if (summary.length === 0)
    summary.push("No account values were available for this period.");
  const trimmed = summary.map((part, i) =>
    i === summary.length - 1 && typeof part === "string"
      ? part.trimEnd()
      : part,
  );

  const warnings = [...plan.warnings, ...room.warnings];
  const extraNotes: string[] = [];
  if (contributions.rows.length > 1 || holdings.totals.length > 1) {
    extraNotes.push("Amounts are grouped by currency and not converted.");
  }
  if (contributions.assetTransfersWithoutValue > 0) {
    extraNotes.push(
      `${contributions.assetTransfersWithoutValue} asset transfer${contributions.assetTransfersWithoutValue === 1 ? " has" : "s have"} no recorded cash value; net growth includes ${contributions.assetTransfersWithoutValue === 1 ? "it" : "them"}.`,
    );
  }

  const roomValue = (type: RegisteredType) => {
    const row = room.rows.find((r) => r.type === type);
    return row?.remainingCents == null ? null : plainAmount(row.remainingCents);
  };
  const ttm = distributions.ttm.find((t) => t.currency === base);
  const distributionsKnown = accounts.some((a) => a.activities !== null);

  const document: ReportDocument = {
    frontmatter: [
      ["type", "investing-report"],
      ["period", ctx.period.id],
      ["generated_at", localTimestamp(options.now, settings.timeZone)],
      ["base_currency", base],
      [
        "portfolio_value",
        value && value.currency === base ? plainAmount(value.cents) : null,
      ],
      [
        "total_contributed",
        growth && growth.currency === base
          ? plainAmount(growth.netContributedCents)
          : null,
      ],
      [
        "net_growth",
        growth && growth.currency === base
          ? plainAmount(growth.growthCents)
          : null,
      ],
      ["plan_status", plan.status],
      ["tfsa_room_remaining", roomValue("TFSA")],
      ["rrsp_room_remaining", roomValue("RRSP")],
      ["fhsa_room_remaining", roomValue("FHSA")],
      [
        "distributions_ttm",
        distributionsKnown ? plainAmount(ttm?.cents ?? 0) : null,
      ],
    ],
    blocks: [
      {
        kind: "heading",
        level: 1,
        text: `Investing Report — ${ctx.period.label}`,
        id: "title",
      },
      {
        kind: "callout",
        callout: "summary",
        title: "Summary",
        lines: [trimmed],
      },
      ...(warnings.length > 0
        ? [
            {
              kind: "callout",
              callout: "warning",
              title: "Attention",
              lines: warnings.map((w) => [w]),
            } satisfies Block,
          ]
        : []),
      ...renderPlan(plan),
      ...renderContributions(contributions, ctx),
      ...renderHoldings(holdings, ctx),
      ...renderRoom(room, ctx),
      ...renderDistributions(distributions, ctx),
      {
        kind: "callout",
        callout: "info",
        title: "Data notes",
        lines: dataNotes(input, ctx, extraNotes),
      },
      {
        kind: "footer",
        text: `Data retrieved ${localDateTime(options.now, settings.timeZone)} via SnapTrade. For information only. Not financial advice.`,
      },
    ],
  };

  return {
    fileName: `${ctx.period.id}.md`,
    document,
    markdown: renderMarkdown(document),
  };
}
