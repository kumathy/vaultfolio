import { describe, expect, it } from "vitest";
import { buildExampleReport } from "@/lib/reports/example";
import { expectReportStyle, section, tableRow } from "./helpers";

describe("example report (XEQT TFSA, targets and room configured)", () => {
  const report = buildExampleReport();
  const frontmatter = Object.fromEntries(report.document.frontmatter);

  it("matches the approved Markdown", () => {
    expect(report.markdown).toMatchSnapshot();
  });

  it("writes Dataview-ready frontmatter in the base currency", () => {
    expect(frontmatter).toEqual({
      type: "investing-report",
      period: "2026-10",
      generated_at: "2026-10-27T09:14:00-04:00",
      base_currency: "CAD",
      portfolio_value: "4312.55",
      total_contributed: "3900.00",
      net_growth: "412.55",
      contributed_this_month: "300.00",
      contribution_status: "on-track",
      tfsa_room_remaining: "4000.00",
      distributions_ttm: "25.01",
    });
  });

  it("orders sections as specified", () => {
    const headings = [...report.markdown.matchAll(/^##? (.+)$/gm)].map(
      (m) => m[1],
    );
    expect(headings).toEqual([
      "Investing Report — October 2026",
      "Monthly activity",
      "Contributions and growth",
      "Holdings",
      "Registered account room — 2026",
      "Distributions",
    ]);
  });

  it("computes growth from value and contributions", () => {
    expect(tableRow(report.markdown, "Total contributed")).toEqual([
      "Total contributed",
      "$3,900.00",
    ]);
    expect(tableRow(report.markdown, "Value")).toEqual(["Value", "$4,312.55"]);
    expect(tableRow(report.markdown, "Net growth")).toEqual([
      "Net growth",
      "+$412.55",
    ]);
  });

  it("projects TFSA room through December", () => {
    expect(
      tableRow(section(report.markdown, "Registered account room"), "TFSA"),
    ).toEqual([
      "TFSA",
      "$7,000.00",
      "$3,000.00",
      "$0.00",
      "$4,000.00",
      "$3,400.00",
      "On track",
    ]);
  });

  it("derives a missing per-unit amount from units held on the payment date", () => {
    expect(tableRow(report.markdown, "2026-03-27")).toEqual([
      "2026-03-27",
      "XEQT",
      "$0.0800",
      "$4.24",
    ]);
    expect(tableRow(report.markdown, "Next 12 months (Estimate)")).toEqual([
      "Next 12 months (Estimate)",
      "~$43.70",
    ]);
  });

  it("follows the report writing style, with and without settings", () => {
    expectReportStyle(report.markdown);
    expectReportStyle(buildExampleReport({}).markdown);
  });

  it("states missing settings once and never shows zero for unknown values", () => {
    const bare = buildExampleReport({});
    const bareFrontmatter = Object.fromEntries(bare.document.frontmatter);
    // Unknown values are left out, never written as 0.
    expect(bareFrontmatter).not.toHaveProperty("contribution_status");
    expect(bareFrontmatter).not.toHaveProperty("tfsa_room_remaining");
    expect(bare.markdown.match(/no starting room is set/g)).toHaveLength(1);
    expect(
      bare.markdown.match(/no monthly contribution target is set/g),
    ).toHaveLength(1);
    expect(bare.markdown).not.toContain("[!warning]");
    expect(bare.markdown).toMatchSnapshot();
  });
});
