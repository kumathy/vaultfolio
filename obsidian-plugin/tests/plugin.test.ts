import { describe, expect, it } from "vitest";
import { challengeFor } from "../src/pkce";
import {
  isVaultfolioReport,
  normalizeFolder,
  planSync,
  summarize,
} from "../src/sync";

const report = (
  period: string,
  markdown = `---\ntype: investing-report\nperiod: ${period}\n---\n# ${period}\n`,
) => ({
  period,
  fileName: `${period}.md`,
  markdown,
});

describe("pairing challenge", () => {
  it("matches the RFC 7636 S256 test vector, like the server", async () => {
    expect(
      await challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    ).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("folder setting", () => {
  it("normalizes slashes and falls back to the default", () => {
    expect(normalizeFolder(" /Investing/ ")).toBe("Investing");
    expect(normalizeFolder("Finance//Reports")).toBe("Finance/Reports");
    expect(normalizeFolder("")).toBe("Investing");
    expect(normalizeFolder("../outside")).toBe("outside");
  });
});

describe("sync plan", () => {
  it("creates new reports, updates changed ones and leaves identical ones", () => {
    const existing = new Map([
      [
        "Investing/2026-09.md",
        report("2026-09", "---\ntype: investing-report\n---\nold\n").markdown,
      ],
      ["Investing/2026-08.md", report("2026-08").markdown],
    ]);
    const plan = planSync(
      [report("2026-08"), report("2026-09"), report("2026-10")],
      "Investing",
      (path) => existing.get(path) ?? null,
    );
    expect(plan.create.map((f) => f.path)).toEqual(["Investing/2026-10.md"]);
    expect(plan.update.map((f) => f.path)).toEqual(["Investing/2026-09.md"]);
    expect(plan.unchanged).toEqual(["Investing/2026-08.md"]);
    expect(summarize(plan)).toBe("Vaultfolio: 2 reports written.");
  });

  it("never overwrites a note that is not a Vaultfolio report", () => {
    const plan = planSync(
      [report("2026-10")],
      "Investing",
      () => "# My own notes\n",
    );
    expect(plan.skipped).toEqual(["Investing/2026-10.md"]);
    expect(plan.create).toEqual([]);
    expect(plan.update).toEqual([]);
    expect(summarize(plan)).toBe(
      "Vaultfolio: Reports are up to date; 1 skipped (existing notes with the same name: Investing/2026-10.md).",
    );
  });

  it("refuses file names that could leave the folder", () => {
    const plan = planSync(
      [
        { period: "x", fileName: "../evil.md", markdown: "x" },
        { period: "x", fileName: "2026-10.md/../../evil.md", markdown: "x" },
      ],
      "Investing",
      () => null,
    );
    expect(plan.create).toEqual([]);
  });

  it("recognizes reports only by their frontmatter type", () => {
    expect(isVaultfolioReport("---\ntype: investing-report\n---\n")).toBe(true);
    expect(
      isVaultfolioReport("---\ntype: journal\n---\ntype: investing-report"),
    ).toBe(false);
    expect(isVaultfolioReport("type: investing-report")).toBe(false);
  });
});
