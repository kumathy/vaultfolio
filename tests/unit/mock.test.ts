import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildReport } from "@/lib/reports/build-report";
import { parsePeriod } from "@/lib/reports/period";
import type { ReportSettings } from "@/lib/reports/types";
import { snaptradeGet } from "@/lib/snaptrade/api";
import { mockScenario, type MockScenario } from "@/lib/snaptrade/mock/config";
import { MOCK_IDS, mockData } from "@/lib/snaptrade/mock/scenarios";
import { mockSettings } from "@/lib/snaptrade/mock/settings";
import { loadReportAccounts } from "@/lib/snaptrade/report";
import type { TokenDeps } from "@/lib/snaptrade/tokens";
import { expectReportStyle, section, tableRow } from "./reports/helpers";

const NOW = new Date("2026-10-27T15:00:00Z");
// Mock mode never reads tokens.
const deps = {} as TokenDeps;
let user = 0;

async function mockReport(
  scenario: MockScenario,
  options: { period?: string; settings?: ReportSettings } = {},
) {
  vi.stubEnv("VAULTFOLIO_MOCK_DATA", scenario);
  const settings = options.settings ?? {};
  // A new user each time, so the account cache never crosses scenarios.
  const accounts = await loadReportAccounts(deps, `user-${++user}`, settings);
  const report = buildReport(
    { accounts },
    {
      period: parsePeriod(options.period ?? "2026-10")!,
      now: NOW,
      settings,
    },
  );
  expectReportStyle(report.markdown);
  return {
    markdown: report.markdown,
    frontmatter: Object.fromEntries(report.document.frontmatter),
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("mock scenario switch", () => {
  it("is ignored in production builds", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VAULTFOLIO_MOCK_DATA", "full");
    expect(mockScenario()).toBeNull();
  });

  it("rejects an unknown scenario", () => {
    vi.stubEnv("VAULTFOLIO_MOCK_DATA", "everything");
    expect(() => mockScenario()).toThrow("full, us, empty, sandbox");
  });

  it("returns 404 for paths SnapTrade does not have", async () => {
    vi.stubEnv("VAULTFOLIO_MOCK_DATA", "full");
    await expect(
      snaptradeGet(deps, "user", "/accounts/x/orders"),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("mock data", () => {
  it("keeps positions consistent with the transaction history", () => {
    for (const { activities, positions } of mockData("full").accounts) {
      const fromHistory = new Map<string, number>();
      for (const a of activities) {
        const symbol = a.symbol?.raw_symbol;
        if (symbol && a.units) {
          fromHistory.set(symbol, (fromHistory.get(symbol) ?? 0) + a.units);
        }
      }
      for (const p of positions.results ?? []) {
        expect(Number(p.units)).toBe(
          fromHistory.get(p.instrument!.raw_symbol!),
        );
      }
    }
  });

  it("generates nothing after yesterday, as SnapTrade syncs with a delay", () => {
    for (const { activities } of mockData("full").accounts) {
      for (const a of activities) {
        expect(a.trade_date! < "2026-10-27").toBe(true);
      }
    }
  });
});

describe("full scenario", () => {
  it("covers several brokerages, currencies and partial failures", async () => {
    const r = await mockReport("full");
    expect(r.frontmatter.base_currency).toBe("CAD");
    for (const symbol of ["XEQT", "VFV", "VTI", "SHOP", "AAPL", "TD"]) {
      expect(section(r.markdown, "Holdings")).toContain(`| ${symbol} `);
    }
    expect(r.markdown).toContain("holdings could not be loaded");
    expect(r.markdown).toContain("per-account request limit was reached");
    expect(tableRow(r.markdown, "Uninvested cash")?.[1]).toContain("Attention");
  });

  it("produces every room status once settings are filled", async () => {
    const r = await mockReport("full", {
      settings: mockSettings("full", 2026),
    });
    expect(r.frontmatter.target_status).toBeDefined();
    expect(r.frontmatter.tfsa_room).toBeDefined();
    const room = section(r.markdown, "Registered account room");
    expect(room).toContain("On track");
    expect(room).toContain("Attention");
  });

  it("shows a past month inside the value-history gap as not available", async () => {
    const r = await mockReport("full", { period: "2026-06" });
    expect(section(r.markdown, "Contributions and growth")).toContain(
      "Not available",
    );
  });

  it("tags accounts by stable IDs", () => {
    const ids = mockData("full").accounts.map((a) => a.account.id);
    expect(ids).toContain(MOCK_IDS.tfsa);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("other scenarios", () => {
  it("reports a US investor in USD", async () => {
    const r = await mockReport("us", { settings: mockSettings("us", 2026) });
    expect(r.frontmatter.base_currency).toBe("USD");
    expect(r.markdown).not.toMatch(/\d USD/);
  });

  it("handles a user with no brokerage connected", async () => {
    const r = await mockReport("empty");
    expect(r.markdown).toContain(
      "No brokerage accounts were available for this report.",
    );
  });

  it("handles sparse sandbox data without value history", async () => {
    const r = await mockReport("sandbox", { period: "2026-09" });
    expect(section(r.markdown, "Holdings")).toBeTruthy();
  });
});
