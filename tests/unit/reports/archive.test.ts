import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  availablePeriods,
  buildArchive,
  firstReportPeriod,
} from "@/lib/reports/archive";
import {
  EXAMPLE_ACCOUNT_DATA,
  EXAMPLE_NOW,
  EXAMPLE_SETTINGS,
} from "../../fixtures/reports/xeqt-tfsa";
import { normalizeAccountData } from "@/lib/reports/normalize";
import { periodsBetween } from "@/lib/reports/period";
import { expectReportStyle } from "./helpers";

const accounts = normalizeAccountData(EXAMPLE_ACCOUNT_DATA, EXAMPLE_SETTINGS);

describe("report periods", () => {
  it("lists calendar months inclusively across years", () => {
    expect(periodsBetween("2025-11", "2026-02").map((p) => p.id)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(periodsBetween("2026-03", "2026-01")).toEqual([]);
  });

  it("starts at the first month with history and ends this month", () => {
    expect(firstReportPeriod(accounts)).toBe("2025-10");
    const periods = availablePeriods(accounts, EXAMPLE_NOW);
    expect(periods[0].id).toBe("2025-10");
    expect(periods.at(-1)?.id).toBe("2026-10");
    expect(periods).toHaveLength(13);
  });

  it("offers only the current month without any history", () => {
    expect(availablePeriods([], EXAMPLE_NOW).map((p) => p.id)).toEqual([
      "2026-10",
    ]);
  });
});

describe("buildArchive", () => {
  it("zips one Markdown report per month of the year", () => {
    const archive = buildArchive(accounts, 2026, EXAMPLE_NOW, EXAMPLE_SETTINGS);
    expect(archive?.fileName).toBe("vaultfolio-reports-2026.zip");
    const files = unzipSync(archive!.bytes);
    expect(Object.keys(files)).toEqual(
      periodsBetween("2026-01", "2026-10").map((p) => `${p.id}.md`),
    );
    const october = strFromU8(files["2026-10.md"]);
    expect(october).toContain("period: 2026-10");
    expect(october).toContain("# Investing Report — October 2026");
    for (const file of Object.values(files)) expectReportStyle(strFromU8(file));
  });

  it("starts a partial year at the first month with history", () => {
    const archive = buildArchive(accounts, 2025, EXAMPLE_NOW);
    expect(archive?.periods).toEqual(["2025-10", "2025-11", "2025-12"]);
  });

  it("returns nothing for years without reports", () => {
    expect(buildArchive(accounts, 2024, EXAMPLE_NOW)).toBeNull();
    expect(buildArchive(accounts, 2027, EXAMPLE_NOW)).toBeNull();
  });
});
