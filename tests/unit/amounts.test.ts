import { describe, expect, it } from "vitest";
import { isBareNumber, isUnitsColumn, splitAmounts } from "@/lib/amounts";
import {
  buildExampleReport,
  EXAMPLE_PERIOD,
  EXAMPLE_SETTINGS,
} from "@/lib/reports/example";
import { money, perUnit, signedMoney } from "@/lib/reports/money";

const visible = (text: string) =>
  splitAmounts(text)
    .filter((part) => !part.amount)
    .map((part) => part.text)
    .join("");

const amounts = (text: string) =>
  splitAmounts(text)
    .filter((part) => part.amount)
    .map((part) => part.text);

describe("splitAmounts", () => {
  it("matches money in every currency the formatter supports", () => {
    for (const currency of Intl.supportedValuesOf("currency")) {
      for (const text of [
        money(-123456, currency, "CAD"),
        money(123456, currency, currency),
        signedMoney(41255, currency, "CAD"),
        `~${money(4600, currency, currency)}`,
        perUnit(0.1, currency, "CAD"),
      ]) {
        expect(amounts(`Value (${text}) here`), `${currency}: ${text}`).toEqual(
          [text],
        );
      }
    }
  });

  it("matches unit counts", () => {
    expect(amounts("1 unit XEQT")).toEqual(["1 unit"]);
    expect(amounts("1,234.5 units VFV")).toEqual(["1,234.5 units"]);
  });

  it("keeps the surrounding text in order", () => {
    expect(splitAmounts("9 units XEQT ($336.29)")).toEqual([
      { text: "9 units", amount: true },
      { text: " XEQT (", amount: false },
      { text: "$336.29", amount: true },
      { text: ")", amount: false },
    ]);
  });

  it("leaves dates, percentages, counts and plain text visible", () => {
    for (const text of [
      "2026-09-29",
      "100.0%",
      "$300.00 of target (1 deposit) — On track",
      "Distributions per unit over the past 12 months",
      "Paid in 2 of 4 quarters, 12.50 each",
    ]) {
      expect(visible(text)).not.toMatch(/\$/);
    }
    expect(visible("2026-09-29 100.0% (1 deposit)")).toBe(
      "2026-09-29 100.0% (1 deposit)",
    );
    expect(visible("Paid in 2 of 4 quarters, 12.50 each")).toBe(
      "Paid in 2 of 4 quarters, 12.50 each",
    );
  });
});

describe("helpers", () => {
  it("recognises bare numbers and units columns", () => {
    expect(isBareNumber(" 115.0 ")).toBe(true);
    expect(isBareNumber("4312.55")).toBe(true);
    expect(isBareNumber("—")).toBe(false);
    expect(isBareNumber("2026-10")).toBe(false);
    expect(isUnitsColumn("Units")).toBe(true);
    expect(isUnitsColumn(" Units held ")).toBe(true);
    expect(isUnitsColumn("Per unit")).toBe(false);
  });
});

describe("example report with amounts hidden", () => {
  // Applies the same rules as the rendered report view.
  const { document } = buildExampleReport(EXAMPLE_SETTINGS, EXAMPLE_PERIOD);
  const shown: string[] = [];
  for (const [, value] of document.frontmatter) {
    if (!isBareNumber(value)) shown.push(value);
  }
  for (const block of document.blocks) {
    if (block.kind === "table") {
      for (const row of block.rows) {
        row.forEach((cell, i) => {
          if (isUnitsColumn(block.columns[i].label) && isBareNumber(cell))
            return;
          shown.push(visible(cell));
        });
      }
    } else if (block.kind === "paragraph") {
      shown.push(
        block.text
          .map((p) => visible(typeof p === "string" ? p : p.bold))
          .join(""),
      );
    } else if (block.kind === "list") {
      for (const item of [block.intro, ...block.items]) {
        shown.push(visible(item));
      }
    } else if (block.kind === "callout") {
      for (const line of block.lines) {
        shown.push(
          line.map((p) => visible(typeof p === "string" ? p : p.bold)).join(""),
        );
      }
    }
  }

  it("shows no money or unit counts", () => {
    const text = shown.join("\n");
    expect(text).not.toMatch(/\p{Sc}/u);
    expect(text).not.toMatch(/\d units?\b/);
  });

  it("keeps percentages and dates", () => {
    const text = shown.join("\n");
    expect(text).toMatch(/\d+\.\d%/);
    expect(text).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
