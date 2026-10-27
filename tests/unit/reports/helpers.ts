import { expect } from "vitest";
import { buildReport } from "@/lib/reports/build-report";
import { normalizeAccountData } from "@/lib/reports/normalize";
import { parsePeriod } from "@/lib/reports/period";
import type { ReportSettings } from "@/lib/reports/types";
import type { RawAccountData } from "@/lib/snaptrade/account-data";

export function report(
  raw: RawAccountData[],
  options: { period?: string; now?: string; settings?: ReportSettings } = {},
) {
  const settings = options.settings ?? {};
  const result = buildReport(
    { accounts: normalizeAccountData(raw, settings) },
    {
      period: parsePeriod(options.period ?? "2026-10")!,
      now: new Date(options.now ?? "2026-10-27T13:14:00Z"),
      settings,
    },
  );
  expectReportStyle(result.markdown);
  return {
    ...result,
    frontmatter: Object.fromEntries(result.document.frontmatter),
    section: (heading: string) => section(result.markdown, heading),
    room: () => section(result.markdown, "Registered account room"),
  };
}

// CLAUDE.md style guard: no reader address and no exclamation marks outside
// Obsidian callout syntax.
export function expectReportStyle(markdown: string) {
  const prose = markdown.replace(/\[![a-z]+\]/g, "");
  expect(prose).not.toMatch(/\b(you|your|yours|we|our|let's)\b/i);
  expect(prose).not.toMatch(/\bI\b/);
  expect(prose).not.toContain("!");
}

export const section = (markdown: string, heading: string) =>
  markdown
    .split("\n## ")
    .find((part) => part.startsWith(heading))
    ?.split("\n> [!info] Data notes")[0] ?? "";

const cells = (line: string) =>
  line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

export const rowWith = (markdown: string, value: string) =>
  markdown
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map(cells)
    .find((row) => row.includes(value));

export const tableRow = (markdown: string, firstCell: string) =>
  markdown
    .split("\n")
    .find((line) => line.startsWith(`| ${firstCell} `))
    ?.split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
