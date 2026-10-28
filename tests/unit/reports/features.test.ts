import { describe, expect, it } from "vitest";
import {
  EXAMPLE_ACCOUNT_DATA,
  EXAMPLE_SETTINGS,
} from "../../fixtures/reports/xeqt-tfsa";
import type { ReportSettings } from "@/lib/reports/types";
import { act, rawAccount } from "../../fixtures/reports/builders";
import { report, rowWith, tableRow } from "./helpers";

const targets = (overrides: ReportSettings = {}): ReportSettings => ({
  contributionTargetCents: 300_00,
  allocation: [{ symbol: "XEQT", weightPercent: 100 }],
  ...overrides,
});

const cashAccount = (activities: ReturnType<typeof act.deposit>[]) => [
  rawAccount({ id: "cash", cash: [["CAD", 300]], activities }),
];

describe("monthly activity", () => {
  it("shows progress toward the target while the month is open", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      period: "2026-11",
      now: "2026-11-05T15:00:00Z",
      settings: EXAMPLE_SETTINGS,
    });
    expect(tableRow(r.markdown, "Contributions")).toEqual([
      "Contributions",
      "$0.00 of $300.00 target so far (0 deposits) — In progress",
    ]);
    expect(r.frontmatter.contribution_status).toBe("in-progress");
    expect(r.markdown).toContain(
      "Contributions this month: **$0.00** of **$300.00** target so far.",
    );
    expect(r.markdown).not.toContain("Contributions: $0.00");
  });

  it("flags a shortfall only after the month has ended", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      period: "2026-11",
      now: "2026-12-03T15:00:00Z",
      settings: EXAMPLE_SETTINGS,
    });
    expect(tableRow(r.markdown, "Contributions")).toEqual([
      "Contributions",
      "$0.00 of $300.00 target (0 deposits) — Attention",
    ]);
    expect(r.frontmatter.contribution_status).toBe("attention");
    expect(r.markdown).toContain("> [!warning] Attention\n> Contributions:");
    expect(r.markdown).toContain(
      "Contributions below target: **$0.00** of **$300.00**.",
    );
  });

  it("adds up deposits made on any schedule", () => {
    const weekly = report(
      cashAccount([
        act.deposit("2026-10-02", 75),
        act.deposit("2026-10-09", 75),
        act.deposit("2026-10-16", 75),
        act.deposit("2026-10-23", 75),
      ]),
      { settings: targets() },
    );
    expect(tableRow(weekly.markdown, "Contributions")).toEqual([
      "Contributions",
      "$300.00 of $300.00 target (4 deposits) — On track",
    ]);
    expect(weekly.frontmatter.contribution_status).toBe("on-track");
    expect(weekly.markdown).toContain(
      "Contribution target met: **$300.00** of **$300.00**.",
    );
  });

  it("gives a recent deposit time to be invested", () => {
    const r = report(cashAccount([act.deposit("2026-10-25", 300)]), {
      settings: targets(),
    });
    expect(tableRow(r.markdown, "Uninvested cash")).toEqual([
      "Uninvested cash",
      "$300.00 since 2026-10-25 (2 days, within 5-day window) — On track",
    ]);
    expect(r.markdown).not.toContain("[!warning]");
  });

  it("flags cash left uninvested beyond the window, with or without targets", () => {
    const raw = cashAccount([act.deposit("2026-10-01", 300)]);
    for (const settings of [targets(), {}]) {
      const r = report(raw, { settings });
      expect(tableRow(r.markdown, "Uninvested cash")).toEqual([
        "Uninvested cash",
        "$300.00 uninvested since 2026-10-01 (26 days) — Attention",
      ]);
      expect(r.markdown).toContain("> [!warning] Attention");
    }
  });

  it("reports a US-only portfolio in USD and counts its deposits", () => {
    const r = report(
      [
        rawAccount({
          id: "us",
          rawType: "Individual",
          cash: [["USD", 4]],
          positions: [["VOO", 1, 296, "USD"]],
          activities: [
            act.deposit("2026-10-02", 300, "USD"),
            act.buy("2026-10-03", "VOO", 1, 296, "USD"),
          ],
        }),
      ],
      { settings: targets({ allocation: undefined }) },
    );
    expect(r.frontmatter.base_currency).toBe("USD");
    expect(tableRow(r.markdown, "Contributions")).toEqual([
      "Contributions",
      "$300.00 of $300.00 target (1 deposit) — On track",
    ]);
    // No amount carries a currency code, and CAD appears nowhere.
    expect(r.markdown).not.toMatch(/\d USD/);
    expect(r.markdown).not.toContain("CAD");
  });

  it("reports no uninvested cash when every balance is zero", () => {
    const r = report(
      [
        rawAccount({
          id: "tfsa",
          cash: [["CAD", 0]],
          positions: [["XEQT", 13.5, 37]],
          activities: [
            act.deposit("2026-10-01", 500),
            act.buy("2026-10-02", "XEQT", 13.5, 500),
          ],
        }),
      ],
      { settings: {} },
    );
    expect(tableRow(r.markdown, "Uninvested cash")).toEqual([
      "Uninvested cash",
      "None — On track",
    ]);
  });

  it("states the uninvested cash minimum in the balance's own currency", () => {
    const usd = report(
      // A TFSA keeps CAD as the base while holding only USD cash.
      [rawAccount({ id: "usd", cash: [["USD", 20]], activities: [] })],
      { settings: {} },
    );
    expect(tableRow(usd.markdown, "Uninvested cash")).toEqual([
      "Uninvested cash",
      "$20.00 USD (below $25.00 USD threshold) — On track",
    ]);

    const mixed = report(
      [
        rawAccount({
          id: "mixed",
          cash: [
            ["CAD", 4],
            ["USD", 20],
          ],
          activities: [],
        }),
      ],
      { settings: {} },
    );
    expect(tableRow(mixed.markdown, "Uninvested cash")).toEqual([
      "Uninvested cash",
      "All cash balances below $25.00 and $25.00 USD thresholds — On track",
    ]);
  });

  it("lists purchases by symbol and compares holdings with the target allocation", () => {
    const r = report(
      [
        rawAccount({
          id: "tfsa",
          cash: [["CAD", 200]],
          positions: [
            ["XEQT", 20, 35],
            ["VFV", 1, 100],
            ["SHOP", 1, 100],
          ],
          activities: [
            act.deposit("2026-10-01", 1000),
            act.buy("2026-10-02", "XEQT", 20, 700),
            act.buy("2026-10-02", "VFV", 1, 100),
            act.buy("2026-10-03", "SHOP", 1, 100),
          ],
        }),
      ],
      {
        settings: targets({
          contributionTargetCents: 1000_00,
          allocation: [
            { symbol: "XEQT", weightPercent: 70 },
            { symbol: "VFV", weightPercent: 30 },
          ],
        }),
      },
    );
    expect(tableRow(r.markdown, "Purchases")).toEqual([
      "Purchases",
      "20 units XEQT ($700.00); 1 unit VFV ($100.00); 1 unit SHOP ($100.00)",
    ]);
    expect(tableRow(r.markdown, "Account")).toEqual([
      "Account",
      "Symbol",
      "Units",
      "Value",
      "Weight",
      "Target",
    ]);
    expect(rowWith(r.section("Holdings"), "SHOP")?.slice(-2)).toEqual([
      "9.1%",
      "0.0%",
    ]);
  });

  it("explains data missing because of SnapTrade's request limit", () => {
    const r = report([
      rawAccount({
        id: "tfsa",
        name: "TFSA",
        activities: null,
        rateLimited: true,
      }),
    ]);
    expect(r.markdown).toContain(
      "TFSA: transactions could not be loaded because SnapTrade's per-account request limit was reached; reloading after a minute retries. Affected sections exclude this data.",
    );
  });

  it("notes the holdings sync time only when it is more than a day old", () => {
    const at = (holdingsAsOf: string) =>
      report([rawAccount({ id: "tfsa", holdingsAsOf })]).markdown;
    expect(at("2026-10-27T12:00:00Z")).not.toContain("Holdings last synced");
    expect(at("2026-10-25T12:00:00Z")).toContain(
      "Holdings last synced by SnapTrade 2026-10-25 08:00 EDT.",
    );
  });

  it("hides zero cash balances from holdings", () => {
    const r = report([
      rawAccount({
        id: "tfsa",
        cash: [
          ["CAD", 0],
          ["USD", 12.5],
        ],
        positions: [["XEQT", 10, 35]],
      }),
    ]);
    const holdings = r.section("Holdings");
    expect(rowWith(holdings, "$0.00")).toBeUndefined();
    expect(rowWith(holdings, "$12.50 USD")).toBeDefined();
    expect(rowWith(holdings, "XEQT")).toBeDefined();
  });

  it("lists observed activity and notes the missing target once", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA);
    expect(tableRow(r.markdown, "Contributions")).toEqual([
      "Contributions",
      "$300.00 (1 deposit)",
    ]);
    expect(r.frontmatter).not.toHaveProperty("contribution_status");
    expect(
      r.markdown.match(/no monthly contribution target is set/g),
    ).toHaveLength(1);
    expect(r.markdown).not.toContain("| Target");
  });

  it("reports a past month as a month-end record", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      period: "2026-09",
      settings: EXAMPLE_SETTINGS,
    });
    // October's 300.00 deposit and 9-unit purchase come after this month.
    expect(tableRow(r.markdown, "Total contributed")).toEqual([
      "Total contributed",
      "$3,600.00",
    ]);
    expect(rowWith(r.section("Holdings"), "XEQT")).toEqual([
      "TFSA",
      "XEQT",
      "106",
    ]);
    expect(r.markdown).toContain("multiplied by units held at month end.");
  });

  const valued = (history?: [string, number][]) =>
    report(
      [
        rawAccount({
          id: "tfsa",
          name: "TFSA",
          positions: [["XEQT", 30, 35]],
          activities: [
            act.deposit("2026-08-01", 1000),
            act.buy("2026-08-02", "XEQT", 30, 1000),
          ],
          valueHistory: history,
        }),
      ],
      { period: "2026-09" },
    );

  it("estimates a past month's value from SnapTrade's value history", () => {
    const r = valued([
      ["2026-09-28", 1040],
      ["2026-09-30", 1052.5],
      ["2026-10-01", 1060],
    ]);
    expect(tableRow(r.markdown, "Value")).toEqual(["Value", "$1,052.50"]);
    expect(tableRow(r.markdown, "Net growth")).toEqual([
      "Net growth",
      "+$52.50",
    ]);
    expect(r.frontmatter).toMatchObject({
      portfolio_value: "1052.50",
      total_contributed: "1000.00",
      net_growth: "52.50",
    });
    expect(r.markdown).toContain(
      "Estimated portfolio value: **$1,052.50** against **$1,000.00** contributed (net growth **+$52.50**).",
    );
    expect(r.markdown).toContain(
      "Estimate: account value at month end, from SnapTrade's account value history.",
    );
  });

  it("shows no value when the history is missing or too far from the month's end", () => {
    for (const r of [valued(), valued([["2026-09-20", 1040]])]) {
      expect(tableRow(r.markdown, "Value")?.[1]).toBe("Not available");
      expect(r.frontmatter).not.toHaveProperty("portfolio_value");
      expect(r.frontmatter).not.toHaveProperty("net_growth");
      expect(r.markdown).toContain(
        "Value and net growth are not available: SnapTrade's account value history has no value near month end.",
      );
    }
  });

  it("lists symbols sold since a past month at that month's units", () => {
    const r = report(
      [
        rawAccount({
          id: "tfsa",
          name: "TFSA",
          positions: [["XEQT", 10, 35]],
          activities: [
            act.deposit("2026-08-01", 450),
            act.buy("2026-08-02", "XEQT", 10, 350),
            act.buy("2026-08-02", "VFV", 1, 100),
            act.sell("2026-10-05", "VFV", 1, 105),
          ],
        }),
      ],
      { period: "2026-08" },
    );
    expect(rowWith(r.section("Holdings"), "VFV")).toEqual(["TFSA", "VFV", "1"]);
    expect(rowWith(r.section("Holdings"), "XEQT")?.[2]).toBe("10");
  });

  it("does not judge cash in a past month", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      period: "2026-09",
      settings: EXAMPLE_SETTINGS,
    });
    expect(tableRow(r.markdown, "Uninvested cash")).toBeUndefined();
    expect(tableRow(r.markdown, "Contributions")).toEqual([
      "Contributions",
      "$300.00 of $300.00 target (1 deposit) — On track",
    ]);
  });
});

describe("contributions and growth", () => {
  it("notes missing history only when an account held money before it", () => {
    const opened = report([
      rawAccount({
        id: "tfsa",
        name: "TFSA",
        positions: [["XEQT", 10, 35]],
        firstTransactionDate: "2026-03-20",
        activities: [
          act.deposit("2026-03-20", 350),
          act.buy("2026-03-21", "XEQT", 10, 350),
        ],
      }),
    ]);
    expect(opened.markdown).not.toContain("Transactions are not available");

    const older = report([
      rawAccount({
        id: "tfsa",
        name: "TFSA",
        positions: [["XEQT", 20, 35]],
        firstTransactionDate: "2026-03-20",
        activities: [act.buy("2026-03-20", "XEQT", 10, 350)],
      }),
      rawAccount({
        id: "rrsp",
        name: "RRSP",
        rawType: "RRSP",
        positions: [["VFV", 1, 100]],
        activities: [],
      }),
    ]);
    expect(older.section("Contributions and growth")).toContain(
      "Transactions are not available before 2026-03-20 for TFSA or for RRSP; total contributed may be understated and net growth overstated.",
    );
  });

  it("keeps currencies apart without converting", () => {
    const r = report([
      rawAccount({
        id: "margin",
        rawType: "Margin",
        cash: [
          ["CAD", 100],
          ["USD", 50],
        ],
        positions: [["AAPL", 2, 250, "USD"]],
        activities: [
          act.deposit("2026-01-05", 1000),
          act.deposit("2026-01-05", 600, "USD"),
          act.buy("2026-01-06", "AAPL", 2, 550, "USD"),
        ],
      }),
    ]);
    // No registered account, and USD holds more value, so USD is the base.
    expect(tableRow(r.markdown, "Measure")).toEqual(["Measure", "USD", "CAD"]);
    expect(tableRow(r.markdown, "Total contributed")).toEqual([
      "Total contributed",
      "$600.00",
      "$1,000.00 CAD",
    ]);
    expect(tableRow(r.markdown, "Net growth")).toEqual([
      "Net growth",
      "-$50.00",
      "-$900.00 CAD",
    ]);
    expect(r.frontmatter.base_currency).toBe("USD");
    expect(r.frontmatter.portfolio_value).toBe("550.00");
    expect(r.markdown).toContain(
      "Amounts are grouped by currency and not converted.",
    );
    expect(r.markdown).toContain("Weights are calculated within each currency");
  });

  it("shows withdrawals and transfers when present", () => {
    const r = report([
      rawAccount({
        id: "tfsa",
        cash: [["CAD", 1300]],
        activities: [
          act.deposit("2026-02-01", 1000),
          act.withdrawal("2026-03-01", 200),
          act.transferIn("2026-04-01", 500),
        ],
      }),
    ]);
    const growth = r.section("Contributions and growth");
    expect(tableRow(growth, "Contributions")?.[1]).toBe("$1,000.00");
    expect(tableRow(growth, "Withdrawals")?.[1]).toBe("-$200.00");
    expect(tableRow(growth, "Transfers (net)")?.[1]).toBe("+$500.00");
    expect(tableRow(growth, "Total contributed")?.[1]).toBe("$1,300.00");
    expect(tableRow(growth, "Net growth")?.[1]).toBe("$0.00");
  });

  it("leaves out accounts whose transactions failed to load", () => {
    const r = report([
      ...EXAMPLE_ACCOUNT_DATA,
      rawAccount({
        id: "broken",
        name: "RRSP",
        rawType: "RRSP",
        cash: [["CAD", 50]],
        activities: null,
      }),
    ]);
    expect(tableRow(r.markdown, "Total contributed")?.[1]).toBe("$3,900.00");
    expect(r.markdown).toContain("RRSP: transactions could not be loaded");
  });
});

describe("registered account room", () => {
  const tfsa = (activities: ReturnType<typeof act.deposit>[], cash = 0) =>
    rawAccount({ id: "tfsa", cash: [["CAD", cash]], activities });

  it("restores TFSA withdrawals only from the next calendar year", () => {
    const r = report(
      [
        tfsa([
          act.deposit("2025-05-01", 5000),
          act.withdrawal("2025-08-01", 2000),
          act.deposit("2026-02-01", 2000),
          act.withdrawal("2026-06-01", 500),
        ]),
      ],
      {
        settings: { room: { TFSA: { year: 2026, availableCents: 7_000_00 } } },
      },
    );
    expect(tableRow(r.room(), "TFSA")).toEqual([
      "TFSA",
      "$7,000.00",
      "$2,000.00",
      "$500.00",
      "$5,000.00",
      "On track",
    ]);
    expect(r.markdown).toContain(
      "TFSA withdrawals are added back to room on January 1 of the following year.",
    );
  });

  it("does not count transfers in as contributions unless corrected", () => {
    const transfer = act.transferIn("2026-03-01", 4000);
    const raw = [tfsa([act.deposit("2026-02-01", 1000), transfer])];
    const room = { TFSA: { year: 2026, availableCents: 7_000_00 } };

    const before = report(raw, { settings: { room } });
    expect(tableRow(before.room(), "TFSA")?.[2]).toBe("$1,000.00");
    expect(before.markdown).toContain(
      "Transfers in ($4,000.00) are not counted as contributions.",
    );

    const corrected = report(raw, {
      settings: { room, activityKinds: { [transfer.id!]: "contribution" } },
    });
    expect(tableRow(corrected.room(), "TFSA")?.[2]).toBe("$5,000.00");
  });

  it("warns about an over-contribution", () => {
    const r = report([tfsa([act.deposit("2026-02-01", 1500)])], {
      settings: { room: { TFSA: { year: 2026, availableCents: 1_000_00 } } },
    });
    expect(tableRow(r.room(), "TFSA")?.slice(-2)).toEqual([
      "-$500.00",
      "Attention",
    ]);
    expect(r.markdown).toContain(
      "> TFSA contributions exceed available room by $500.00.",
    );
  });

  it("warns when the contribution target will exceed room by December 31", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      settings: {
        ...EXAMPLE_SETTINGS,
        room: { TFSA: { year: 2026, availableCents: 3_500_00 } },
      },
    });
    expect(tableRow(r.room(), "TFSA")?.slice(-3)).toEqual([
      "$500.00",
      "-$100.00",
      "Attention",
    ]);
    expect(r.markdown).toContain(
      "> Contributions at the monthly target are projected to exceed TFSA room by $100.00 by 2026-12-31.",
    );
    expect(r.frontmatter.contribution_status).toBe("on-track");
  });

  it("projects this month's unmet target plus each remaining month", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      period: "2026-11",
      now: "2026-11-05T15:00:00Z",
      settings: EXAMPLE_SETTINGS,
    });
    // $4,000.00 remaining, less $300.00 still expected in November and December.
    expect(tableRow(r.room(), "TFSA")?.slice(-3)).toEqual([
      "$4,000.00",
      "$3,400.00",
      "On track",
    ]);
  });

  it("shows remaining room without a projection when no target is set", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      settings: { room: EXAMPLE_SETTINGS.room },
    });
    expect(r.section("Registered")).not.toContain("Projected at Dec 31");
    expect(tableRow(r.room(), "TFSA")?.slice(-2)).toEqual([
      "$4,000.00",
      "On track",
    ]);
  });

  it("raises no room warnings when starting room is missing, even with a target", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, { settings: targets() });
    expect(tableRow(r.room(), "TFSA")?.slice(-2)).toEqual([
      "Not configured",
      "Not configured",
    ]);
    expect(r.frontmatter).not.toHaveProperty("tfsa_room_remaining");
    expect(r.markdown).not.toContain("[!warning]");
  });

  it("ignores room settings entered for another year", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      settings: { room: { TFSA: { year: 2025, availableCents: 6_000_00 } } },
    });
    expect(r.frontmatter).not.toHaveProperty("tfsa_room_remaining");
  });

  it("covers RRSP and FHSA with their reference limits and deadline", () => {
    const r = report([
      rawAccount({
        id: "rrsp",
        rawType: "RRSP",
        activities: [act.deposit("2026-03-01", 1000)],
      }),
      rawAccount({
        id: "fhsa",
        rawType: "FHSA",
        activities: [act.deposit("2026-04-01", 2000)],
      }),
    ]);
    expect(tableRow(r.room(), "RRSP")?.[1]).toBe("$1,000.00");
    expect(tableRow(r.room(), "FHSA")?.[1]).toBe("$2,000.00");
    expect(r.markdown).toContain(
      "2026 annual limits: RRSP $33,810.00 maximum; FHSA $8,000.00 ($40,000.00 lifetime).",
    );
    expect(r.markdown).toContain(
      "RRSP contributions made up to 2027-03-01 can be deducted for 2026.",
    );
    expect(r.frontmatter).not.toHaveProperty("rrsp_room_remaining");
  });

  it("uses account tags to classify accounts", () => {
    const raw = [
      rawAccount({
        id: "acc",
        rawType: "Margin",
        activities: [act.deposit("2026-02-01", 100)],
      }),
    ];
    expect(report(raw).markdown).toContain(
      "No TFSA, RRSP or FHSA accounts were identified.",
    );
    expect(
      tableRow(
        report(raw, { settings: { accountTypes: { acc: "TFSA" } } }).room(),
        "TFSA",
      )?.[1],
    ).toBe("$100.00");
  });
});

describe("distributions", () => {
  it("reports zero distributions as a known zero", () => {
    const r = report([
      rawAccount({
        id: "stocks",
        rawType: "Margin",
        positions: [["SHOP", 10, 150]],
        activities: [
          act.deposit("2026-01-02", 1500),
          act.buy("2026-01-03", "SHOP", 10, 1500),
        ],
      }),
    ]);
    expect(r.section("Distributions")).toContain(
      "No distributions were recorded in the trailing 12 months.",
    );
    expect(r.frontmatter.distributions_ttm).toBe("0.00");
  });

  it("counts a fund paid into two accounts on one day as one per-unit amount", () => {
    const r = report([
      rawAccount({
        id: "tfsa",
        positions: [["XEQT", 10, 35]],
        activities: [act.dividend("2026-09-29", "XEQT", 1, 0.1)],
      }),
      rawAccount({
        id: "margin",
        name: "Margin",
        rawType: "Margin",
        positions: [["XEQT", 20, 35]],
        activities: [act.dividend("2026-09-29", "XEQT", 2, 0.1)],
      }),
    ]);
    expect(tableRow(r.markdown, "Paid on")).toEqual([
      "Paid on",
      "Account",
      "Symbol",
      "Per unit",
      "Amount",
    ]);
    expect(tableRow(r.markdown, "Trailing 12 months")?.[1]).toBe("$3.00");
    expect(tableRow(r.markdown, "Next 12 months (Estimate)")?.[1]).toBe(
      "~$3.00",
    );
  });

  it("excludes a symbol whose per-unit amount cannot be determined", () => {
    const r = report([
      rawAccount({
        id: "tfsa",
        activities: [act.dividend("2026-09-29", "OLD", 5)],
      }),
    ]);
    expect(tableRow(r.markdown, "2026-09-29")).toEqual([
      "2026-09-29",
      "OLD",
      "—",
      "$5.00",
    ]);
    expect(r.markdown).toContain(
      "Per-unit amounts could not be determined for OLD",
    );
    expect(r.markdown).not.toContain("multiplied by units held today");
  });

  it("only includes the trailing 12 months", () => {
    const r = report([
      rawAccount({
        id: "tfsa",
        positions: [["XEQT", 10, 35]],
        activities: [
          act.dividend("2025-10-27", "XEQT", 1, 0.1),
          act.dividend("2025-10-28", "XEQT", 2, 0.2),
        ],
      }),
    ]);
    expect(r.frontmatter.distributions_ttm).toBe("2.00");
  });
});

describe("report-level states", () => {
  it("produces a useful report with no accounts", () => {
    const r = report([]);
    expect(r.markdown).toContain(
      "No account values were available for this period.",
    );
    expect(r.markdown).toContain(
      "No brokerage accounts were available for this report.",
    );
    expect(r.frontmatter).not.toHaveProperty("portfolio_value");
    expect(r.frontmatter).not.toHaveProperty("distributions_ttm");
  });

  it("notes paper accounts and failed parts", () => {
    const r = report([
      rawAccount({
        id: "sandbox",
        name: "Sandbox",
        rawType: null,
        isPaper: true,
      }),
      {
        ...rawAccount({ id: "partial", name: "RRSP", rawType: "RRSP" }),
        positions: null,
      },
    ]);
    expect(r.markdown).toContain("Sandbox is a paper (simulated) account.");
    expect(r.markdown).toContain("RRSP: holdings could not be loaded");
  });
});

describe("partial and mixed data", () => {
  it("keeps the portfolio value consistent when an account is excluded from growth", () => {
    const r = report([
      rawAccount({
        id: "tfsa",
        cash: [["CAD", 50]],
        positions: [["XEQT", 30, 35]],
        activities: [
          act.deposit("2026-08-01", 1000),
          act.buy("2026-08-02", "XEQT", 30, 950),
        ],
      }),
      // Transactions failed, so this account's cash is left out of growth.
      rawAccount({
        id: "cash",
        rawType: "Individual",
        cash: [["CAD", 500]],
        activities: null,
      }),
    ]);
    expect(r.frontmatter).toMatchObject({
      portfolio_value: "1100.00",
      total_contributed: "1000.00",
      net_growth: "100.00",
    });
    expect(r.markdown).toContain("Portfolio value: **$1,100.00**");
  });

  it("does not estimate past values for an account that used several currencies", () => {
    const r = report(
      [
        rawAccount({
          id: "margin",
          rawType: "Margin",
          cash: [
            ["CAD", 0],
            ["USD", 0],
          ],
          positions: [
            ["XEQT", 28, 36],
            ["AAPL", 2, 250, "USD"],
          ],
          activities: [
            act.deposit("2026-08-01", 1000),
            act.buy("2026-08-02", "XEQT", 28, 1000),
            act.deposit("2026-08-01", 500, "USD"),
            act.buy("2026-08-02", "AAPL", 2, 500, "USD"),
          ],
          valueHistory: [["2026-09-30", 1700]],
        }),
      ],
      { period: "2026-09" },
    );
    expect(tableRow(r.markdown, "Value")).toEqual([
      "Value",
      "Not available",
      "Not available",
    ]);
    expect(r.section("Contributions and growth")).toContain(
      "Value is not available for Margin: SnapTrade's account value history is one total across currencies",
    );
    expect(r.frontmatter).not.toHaveProperty("portfolio_value");
    expect(r.frontmatter).not.toHaveProperty("net_growth");
  });

  it("leaves a fund out of the estimate when its account's holdings failed", () => {
    const raw = rawAccount({
      id: "personal",
      rawType: "Non-registered",
      activities: [
        act.deposit("2026-01-02", 1000),
        act.buy("2026-01-03", "VEQT", 20, 1000),
        act.dividend("2026-09-29", "VEQT", 11, 0.55),
      ],
    });
    const r = report([{ ...raw, positions: null }]);
    expect(r.section("Distributions")).not.toContain("Estimate");
    expect(r.section("Distributions")).toContain(
      "Units held could not be loaded for VEQT; the estimate excludes it.",
    );
  });

  it("states no net growth when transaction history is incomplete", () => {
    const r = report([
      rawAccount({
        id: "sandbox",
        rawType: null,
        cash: [["CAD", 100]],
        positions: [["VFV", 10, 150]],
        activities: [],
      }),
    ]);
    expect(r.markdown).toContain(
      "Portfolio value: **$1,600.00**. Total contributed: **$0.00** (transaction history incomplete).",
    );
    expect(r.markdown).not.toContain("net growth **");
    expect(r.frontmatter.portfolio_value).toBe("1600.00");
    expect(r.frontmatter).not.toHaveProperty("net_growth");
  });
});
