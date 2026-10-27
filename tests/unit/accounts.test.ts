import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatIsoDate, formatMoney, formatTimestampUtc } from "@/lib/format";
import { loadAccountsOverview } from "@/lib/snaptrade/accounts";
import {
  ReauthorizationRequired,
  type TokenDeps,
} from "@/lib/snaptrade/tokens";
import {
  groupByInstitution,
  normalizeAccounts,
  normalizeConnections,
  totalsByCurrency,
  UNCLASSIFIED,
} from "@/lib/view-models/accounts";
import accountsFixture from "../fixtures/accounts.json";
import authorizationsFixture from "../fixtures/authorizations.json";
import { MemoryTokenStore } from "../helpers/memory-token-store";
import { jsonResponse, testConfig } from "../helpers/oauth";

describe("normalizeAccounts", () => {
  const accounts = normalizeAccounts(accountsFixture);

  it("skips entries without an id", () => {
    expect(accounts).toHaveLength(4);
  });

  it("maps a registered account", () => {
    expect(accounts[0]).toEqual({
      id: "a1f0c6de-0001-4d6a-9d1e-3f1d2c000001",
      connectionId: "c0000000-0000-4000-8000-000000000001",
      institution: "Wealthsimple",
      name: "TFSA",
      numberSuffix: "1234",
      type: "TFSA",
      total: { amount: 4312.55, currency: "CAD" },
      holdingsSyncedOn: "2026-10-27",
      isPaper: false,
    });
  });

  it("shows only the last four account number characters", () => {
    expect(accounts[2].numberSuffix).toBe("9921");
    expect(accounts[3].numberSuffix).toBeNull();
  });

  it("normalizes currency codes and keeps each account's currency", () => {
    expect(accounts[2].total).toEqual({ amount: 250.5, currency: "USD" });
  });

  it.each([
    ["Wealthsimple Trade TFSA", "TFSA"],
    ["Wealthsimple Trade - RRSP", "RRSP"],
    ["wealthsimple trade: FHSA", "FHSA"],
    ["Wealthsimple Trades TFSA", "Wealthsimple Trades TFSA"],
    ["Wealthsimple Trade", "Wealthsimple Trade"],
    ["Joint Cash", "Joint Cash"],
  ])("displays account name %j as %j", (name, expected) => {
    const [view] = normalizeAccounts([
      { ...accountsFixture[0], name, institution_name: "Wealthsimple Trade" },
    ]);
    expect(view.name).toBe(expected);
  });

  it("handles sparse sandbox data", () => {
    expect(accounts[3]).toMatchObject({
      name: "SnapTrade Sandbox",
      type: UNCLASSIFIED,
      total: null,
      holdingsSyncedOn: null,
      isPaper: true,
    });
  });

  it("accepts an empty list and rejects a non-list response", () => {
    expect(normalizeAccounts([])).toEqual([]);
    expect(() => normalizeAccounts({ results: [] })).toThrow();
  });
});

describe("normalizeConnections", () => {
  it("flags disabled connections", () => {
    expect(normalizeConnections(authorizationsFixture)).toEqual([
      {
        id: "c0000000-0000-4000-8000-000000000001",
        brokerage: "Wealthsimple",
        disabled: false,
        disabledOn: null,
      },
      {
        id: "c0000000-0000-4000-8000-000000000002",
        brokerage: "Questrade",
        disabled: true,
        disabledOn: "2026-10-20",
      },
      {
        id: "c0000000-0000-4000-8000-000000000003",
        brokerage: "Sandbox connection",
        disabled: false,
        disabledOn: null,
      },
    ]);
  });
});

describe("groupByInstitution", () => {
  it("groups accounts by institution in alphabetical order", () => {
    const groups = groupByInstitution(normalizeAccounts(accountsFixture));
    expect(
      groups.map((group) => [
        group.institution,
        group.accounts.map((account) => account.name),
      ]),
    ).toEqual([
      ["Questrade", ["Individual Margin"]],
      ["SnapTrade Sandbox", ["SnapTrade Sandbox"]],
      ["Wealthsimple", ["TFSA", "RRSP"]],
    ]);
  });

  it("returns no groups for no accounts", () => {
    expect(groupByInstitution([])).toEqual([]);
  });
});

describe("totalsByCurrency", () => {
  it("never adds amounts across currencies", () => {
    expect(totalsByCurrency(normalizeAccounts(accountsFixture))).toEqual([
      { currency: "CAD", amount: 5312.65 },
      { currency: "USD", amount: 250.5 },
    ]);
  });

  it("returns nothing when no balance is known", () => {
    expect(totalsByCurrency([])).toEqual([]);
  });
});

describe("format", () => {
  it("formats money with two decimals, separators and the currency code", () => {
    expect(formatMoney(4312.55, "CAD")).toBe("$4,312.55 CAD");
    expect(formatMoney(250.5, "USD")).toBe("$250.50 USD");
    expect(formatMoney(-12, "CAD")).toBe("-$12.00 CAD");
  });

  it("extracts ISO dates from the formats SnapTrade returns", () => {
    expect(formatIsoDate("2026-10-26")).toBe("2026-10-26");
    expect(formatIsoDate("2026-10-27T06:02:11Z")).toBe("2026-10-27");
    expect(formatIsoDate("2026-10-27 06:02:11.501223+00:00")).toBe(
      "2026-10-27",
    );
    expect(formatIsoDate(null)).toBeNull();
    expect(formatIsoDate("yesterday")).toBeNull();
  });

  it("formats retrieval time in UTC", () => {
    expect(formatTimestampUtc(new Date("2026-10-27T12:14:59Z"))).toBe(
      "2026-10-27 12:14 UTC",
    );
  });
});

describe("loadAccountsOverview", () => {
  let deps: TokenDeps;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  function respondWith(routes: Record<string, () => Response>) {
    fetchMock.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;
      return routes[path]?.() ?? new Response(null, { status: 404 });
    });
  }

  beforeEach(() => {
    const store = new MemoryTokenStore();
    store.rows.set("user-1", {
      accessToken: "access-1",
      refreshToken: "refresh-1",
      accessExpiresAt: new Date(Date.now() + 3_600_000),
      scope: "openid email read",
    });
    deps = { store, config: async () => testConfig };
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads both sections", async () => {
    respondWith({
      "/accounts": () => jsonResponse(accountsFixture),
      "/authorizations": () => jsonResponse(authorizationsFixture),
    });

    const overview = await loadAccountsOverview(deps, "user-1");

    expect(overview.accounts).toHaveLength(4);
    expect(overview.connections).toHaveLength(3);
    expect(overview.retrievedAt).toBeInstanceOf(Date);
  });

  it("keeps accounts when connections fail to load", async () => {
    respondWith({
      "/accounts": () => jsonResponse(accountsFixture),
      "/authorizations": () => new Response(null, { status: 502 }),
    });

    const overview = await loadAccountsOverview(deps, "user-1");

    expect(overview.accounts).toHaveLength(4);
    expect(overview.connections).toBeNull();
  });

  it("keeps connections when accounts return an unexpected shape", async () => {
    respondWith({
      "/accounts": () => jsonResponse({ unexpected: true }),
      "/authorizations": () => jsonResponse(authorizationsFixture),
    });

    const overview = await loadAccountsOverview(deps, "user-1");

    expect(overview.accounts).toBeNull();
    expect(overview.connections).toHaveLength(3);
  });

  it("does not log response bodies", async () => {
    respondWith({
      "/accounts": () => new Response("secret body", { status: 500 }),
      "/authorizations": () => jsonResponse([]),
    });

    await loadAccountsOverview(deps, "user-1");

    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(
      "secret body",
    );
  });

  it("requires reauthorization when the grant is gone", async () => {
    await deps.store.remove("user-1");
    await expect(loadAccountsOverview(deps, "user-1")).rejects.toBeInstanceOf(
      ReauthorizationRequired,
    );
  });
});
