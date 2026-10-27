import { describe, expect, it } from "vitest";
import {
  exampleReport,
  exampleReportMarkdown,
} from "@/components/site/example-report";

const markdown = exampleReportMarkdown();

describe("example report Markdown", () => {
  it("starts with YAML frontmatter using snake_case keys and plain values", () => {
    const [, frontmatter] = markdown.split("---\n");
    const lines = frontmatter.trim().split("\n");
    expect(lines).toHaveLength(exampleReport.properties.length);
    for (const line of lines) {
      expect(line).toMatch(/^[a-z_]+: [^$]+$/);
    }
  });

  it("contains every MVP section in the fixed order", () => {
    const headings = [...markdown.matchAll(/^##? (.+)$/gm)].map((m) => m[1]);
    expect(headings).toEqual([
      "Investing Report — October 2026",
      "Plan execution",
      "Contributions and growth",
      "Registered account room — 2026",
      "Distributions",
    ]);
  });

  it("writes Obsidian callouts", () => {
    expect(markdown).toContain("> [!summary] Summary\n> Monthly plan");
    expect(markdown).toContain("> [!info] Data notes\n> Transactions");
  });

  it("right-aligns numeric columns and keeps table rows the same width", () => {
    expect(markdown).toContain(
      "| Measure           |    Amount |\n| ----------------- | --------: |",
    );
    for (const table of markdown
      .split("\n\n")
      .filter((b) => b.startsWith("|"))) {
      const widths = new Set(table.split("\n").map((row) => row.length));
      expect(widths.size).toBe(1);
    }
  });

  it("labels the estimate and states its method", () => {
    expect(markdown).toContain("Next 12 months (Estimate)");
    expect(markdown).toContain("Estimate method:");
  });

  it("follows the report writing style", () => {
    const prose = markdown.replace(/\[![a-z]+\]/g, "");
    expect(prose).not.toMatch(/\b(you|your|we|i|let's)\b/i);
    expect(prose).not.toContain("!");
  });

  it("ends with the retrieval footer and disclaimer", () => {
    expect(markdown.trimEnd()).toMatch(
      /---\n\*Data retrieved .+ via SnapTrade\. For information only\. Not financial advice\.\*$/,
    );
  });
});
