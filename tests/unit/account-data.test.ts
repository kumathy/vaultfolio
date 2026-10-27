import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadAccountData } from "@/lib/snaptrade/account-data";
import {
  ReauthorizationRequired,
  type TokenDeps,
} from "@/lib/snaptrade/tokens";
import type { Account } from "@/lib/snaptrade/types";
import { MemoryTokenStore } from "../helpers/memory-token-store";
import { jsonResponse, testConfig } from "../helpers/oauth";

const account = {
  id: "acc-1",
  brokerage_authorization: "conn-1",
  name: "TFSA",
  number: "1234",
  institution_name: "Wealthsimple",
  is_paper: false,
  balance: {},
  sync_status: {},
} satisfies Account;

let deps: TokenDeps;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

function route(handler: (url: URL) => Response) {
  fetchMock.mockImplementation(async (input) =>
    handler(new URL(String(input))),
  );
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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadAccountData", () => {
  it("loads balances, positions and every page of activities", async () => {
    const activity = (id: number) => ({ id: `a${id}`, type: "BUY" });
    route((url) => {
      if (url.pathname.endsWith("/balances")) {
        return jsonResponse([{ currency: { code: "CAD" }, cash: 4.12 }]);
      }
      if (url.pathname.endsWith("/positions/all")) {
        return jsonResponse({ results: [], data_freshness: { as_of: null } });
      }
      const offset = Number(url.searchParams.get("offset"));
      expect(url.searchParams.get("limit")).toBe("1000");
      const page = offset === 0 ? [1, 2] : offset === 2 ? [3] : [];
      return jsonResponse({
        data: page.map(activity),
        pagination: { offset, limit: 1000, total: 3 },
      });
    });

    const [result] = await loadAccountData(deps, "user-1", [account]);

    expect(result.balances).toEqual([
      { currency: { code: "CAD" }, cash: 4.12 },
    ]);
    expect(result.positions?.results).toEqual([]);
    expect(result.activities?.map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
    const activityCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes("/activities"),
    );
    expect(activityCalls).toHaveLength(2);
  });

  it("keeps the parts that loaded when one part fails", async () => {
    route((url) =>
      url.pathname.endsWith("/activities")
        ? new Response(null, { status: 503 })
        : url.pathname.endsWith("/balances")
          ? jsonResponse([])
          : jsonResponse({ results: [] }),
    );

    const [result] = await loadAccountData(deps, "user-1", [account]);

    expect(result.balances).toEqual([]);
    expect(result.positions).toEqual({ results: [] });
    expect(result.activities).toBeNull();
  });

  it("escapes account IDs in paths", async () => {
    route(() => jsonResponse([]));
    await loadAccountData(deps, "user-1", [{ ...account, id: "a/b?c" }]);
    expect(
      fetchMock.mock.calls.some(([u]) =>
        String(u).startsWith("https://api.snaptrade.com/accounts/a%2Fb%3Fc/"),
      ),
    ).toBe(true);
  });

  it("propagates an expired authorization", async () => {
    await deps.store.remove("user-1");
    await expect(
      loadAccountData(deps, "user-1", [account]),
    ).rejects.toBeInstanceOf(ReauthorizationRequired);
  });
});
