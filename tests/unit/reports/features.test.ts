import { describe, expect, it } from "vitest";
import { EXAMPLE_ACCOUNT_DATA, EXAMPLE_SETTINGS } from "@/lib/reports/example";
import type { PlanSettings, ReportSettings } from "@/lib/reports/types";
import { act, rawAccount } from "../../fixtures/reports/builders";
import { report, rowWith, tableRow } from "./helpers";

const plan = (overrides: Partial<PlanSettings> = {}): ReportSettings => ({
  plan: {
    monthlyAmountCents: 300_00,
    contributionDay: 1,
    targets: [{ symbol: "XEQT", weightPercent: 100 }],
    ...overrides,
  },
});

describe("plan check", () => {
  it("flags a missed monthly deposit after the one-day grace period", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      period: "2026-11",
      now: "2026-11-05T15:00:00Z",
      settings: EXAMPLE_SETTINGS,
    });
    expect(tableRow(r.markdown, "Deposit received")).toEqual([
      "Deposit received",
      "Attention",
      "No deposit recorded; $300.00 scheduled for 2026-11-01",
    ]);
    expect(r.frontmatter.plan_status).toBe("attention");
    expect(r.markdown).toContain("> [!warning] Attention\n> Deposit received:");
    expect(r.markdown).toContain("Monthly plan needs attention.");
  });

  it("waits until the scheduled day before expecting a deposit", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      period: "2026-11",
      now: "2026-11-05T15:00:00Z",
      settings: plan({ contributionDay: 15 }),
    });
    expect(tableRow(r.markdown, "Deposit received")).toEqual([
      "Deposit received",
      "Not applicable",
      "$300.00 scheduled for 2026-11-15",
    ]);
    expect(r.frontmatter.plan_status).toBe("on-track");
  });

  it("gives a recent deposit time to be invested", () => {
    const r = report(
      [
        rawAccount({
          id: "cash",
          cash: [["CAD", 300]],
          activities: [act.deposit("2026-10-25", 300)],
        }),
      ],
      { settings: plan() },
    );
    expect(tableRow(r.markdown, "Invested per plan")?.[1]).toBe(
      "Not applicable",
    );
    expect(tableRow(r.markdown, "Uninvested cash")).toEqual([
      "Uninvested cash",
      "On track",
      "$300.00 since 2026-10-25 (2 days, within 5-day window)",
    ]);
    expect(r.markdown).not.toContain("[!warning]");
  });

  it("flags cash left uninvested beyond the window, even without a plan", () => {
    const raw = [
      rawAccount({
        id: "cash",
        cash: [["CAD", 300]],
        activities: [act.deposit("2026-10-01", 300)],
      }),
    ];
    const withPlan = report(raw, { settings: plan() });
    expect(tableRow(withPlan.markdown, "Invested per plan")).toEqual([
      "Invested per plan",
      "Attention",
      "Purchased below plan: XEQT $0.00 of $300.00",
    ]);
    expect(tableRow(withPlan.markdown, "Uninvested cash")).toEqual([
      "Uninvested cash",
      "Attention",
      "$300.00 uninvested since 2026-10-01 (26 days)",
    ]);

    const withoutPlan = report(raw);
    expect(tableRow(withoutPlan.markdown, "Uninvested cash")?.[1]).toBe(
      "Attention",
    );
    expect(withoutPlan.frontmatter.plan_status).toBe("not-configured");
    expect(withoutPlan.markdown).toContain("> [!warning] Attention");
  });

  it("checks each fund of a multi-fund plan and notes purchases outside it", () => {
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
        settings: plan({
          monthlyAmountCents: 1000_00,
          targets: [
            { symbol: "XEQT", weightPercent: 70 },
            { symbol: "VFV", weightPercent: 30 },
          ],
        }),
      },
    );
    expect(tableRow(r.markdown, "Invested per plan")).toEqual([
      "Invested per plan",
      "Attention",
      "Purchased below plan: VFV $100.00 of $300.00; also purchased SHOP (not in plan)",
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

  it("lists observed activity and notes the missing plan once", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA);
    expect(tableRow(r.markdown, "Deposits this month")).toEqual([
      "Deposits this month",
      "Not configured",
      "$300.00 on 2026-10-01",
    ]);
    expect(r.markdown).not.toContain("| Target");
  });

  it("does not judge cash in a past month", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      period: "2026-09",
      settings: EXAMPLE_SETTINGS,
    });
    expect(tableRow(r.markdown, "Uninvested cash")?.[1]).toBe("Not applicable");
    expect(r.markdown).toContain("Values and holdings are as of 2026-10-27");
    expect(tableRow(r.markdown, "Deposit received")?.[2]).toBe(
      "$300.00 on 2026-09-01",
    );
  });
});

describe("contributions and growth", () => {
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
    expect(tableRow(r.markdown, "Measure")).toEqual(["Measure", "CAD", "USD"]);
    expect(tableRow(r.markdown, "Total contributed")).toEqual([
      "Total contributed",
      "$1,000.00",
      "$600.00 USD",
    ]);
    expect(tableRow(r.markdown, "Net growth")).toEqual([
      "Net growth",
      "-$900.00",
      "-$50.00 USD",
    ]);
    expect(r.frontmatter.portfolio_value).toBe("100.00");
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

  it("warns when scheduled contributions will exceed room by December 31", () => {
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
      "> Scheduled contributions are projected to exceed TFSA room by $100.00 by 2026-12-31.",
    );
    expect(r.frontmatter.plan_status).toBe("on-track");
  });

  it("shows remaining room without a projection when no plan is set", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      settings: { room: EXAMPLE_SETTINGS.room },
    });
    expect(r.section("Registered")).not.toContain("Projected at Dec 31");
    expect(tableRow(r.room(), "TFSA")?.slice(-2)).toEqual([
      "$4,000.00",
      "On track",
    ]);
  });

  it("raises no room warnings when starting room is missing, even with a plan", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, { settings: plan() });
    expect(tableRow(r.room(), "TFSA")?.slice(-2)).toEqual([
      "Not configured",
      "Not configured",
    ]);
    expect(r.frontmatter.tfsa_room_remaining).toBeNull();
    expect(r.markdown).not.toContain("[!warning]");
  });

  it("ignores room settings entered for another year", () => {
    const r = report(EXAMPLE_ACCOUNT_DATA, {
      settings: { room: { TFSA: { year: 2025, availableCents: 6_000_00 } } },
    });
    expect(r.frontmatter.tfsa_room_remaining).toBeNull();
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
      "2026 RRSP maximum, for reference: $33,810.00.",
    );
    expect(r.markdown).toContain(
      "RRSP contributions made up to 2027-03-01 can be deducted for 2026.",
    );
    expect(r.markdown).toContain(
      "2026 FHSA annual limit, for reference: $8,000.00 (lifetime limit $40,000.00).",
    );
    expect(r.frontmatter.rrsp_room_remaining).toBeNull();
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
    expect(r.markdown).not.toContain("Estimate method");
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
    expect(r.frontmatter.portfolio_value).toBeNull();
    expect(r.frontmatter.distributions_ttm).toBeNull();
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
