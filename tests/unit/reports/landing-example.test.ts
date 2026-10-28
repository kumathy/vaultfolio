import { describe, expect, it } from "vitest";
import { addMonths } from "@/lib/reports/period";
import {
  buildExampleReport,
  EXAMPLE_PERIOD,
  EXAMPLE_SETTINGS,
} from "@/lib/reports/example";
import { expectReportStyle, section, tableRow } from "./helpers";

// The three notes shown in the landing page's Obsidian window.
const notes = [-2, -1, 0].map((offset) =>
  buildExampleReport(EXAMPLE_SETTINGS, addMonths(EXAMPLE_PERIOD, offset)),
);

describe("landing page example", () => {
  it("shows net growth in every month on display, estimated for past ones", () => {
    for (const [index, note] of notes.entries()) {
      expectReportStyle(note.markdown);
      expect(tableRow(note.markdown, "Net growth")?.[1]).toMatch(/^\+\$/);
      if (index < 2) expect(note.markdown).toContain("Estimate: account value");
    }
  });

  it("is mostly XEQT, with small individual stock positions", () => {
    const holdings = section(notes[2].markdown, "Holdings");
    // Account | Symbol | Units | Value | Weight
    expect(holdings).toMatch(
      /\| XEQT +\| +[\d.]+ \| +\$[\d,.]+ \| +95\.\d% \|/,
    );
    expect(holdings).toContain("| NVDA ");
    expect(holdings).toContain("| AMZN ");
  });

  it("shows every check with a status", () => {
    const current = notes[2].markdown;
    expect(tableRow(current, "Uninvested cash")?.[1]).toContain("On track");
    expect(section(current, "Registered account room")).toContain(
      "Projected at Dec 31",
    );
  });
});
