import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SnapTradeApiError, snaptradeGet } from "@/lib/snaptrade/api";
import { TokenEndpointError } from "@/lib/snaptrade/oauth";
import {
  getAccessToken,
  ReauthorizationRequired,
  type TokenDeps,
} from "@/lib/snaptrade/tokens";
import { MemoryTokenStore } from "../helpers/memory-token-store";
import { jsonResponse, testConfig, tokenBody } from "../helpers/oauth";

const NOW = new Date("2026-10-27T12:00:00Z");
const USER = "user-1";
const TOKEN_ENDPOINT = testConfig.metadata.token_endpoint;

let store: MemoryTokenStore;
let deps: TokenDeps;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

function storeTokens(expiresInMinutes: number) {
  store.rows.set(USER, {
    accessToken: "access-1",
    refreshToken: "refresh-1",
    accessExpiresAt: new Date(NOW.getTime() + expiresInMinutes * 60_000),
    scope: "openid email read",
  });
}

function requests() {
  return fetchMock.mock.calls.map(([input, init]) => ({
    url: String(input),
    headers: (init?.headers ?? {}) as Record<string, string>,
  }));
}

const rotated = () =>
  jsonResponse(
    tokenBody({ access_token: "access-2", refresh_token: "refresh-2" }),
  );

beforeEach(() => {
  store = new MemoryTokenStore();
  deps = { store, config: async () => testConfig, now: () => NOW };
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getAccessToken", () => {
  it("returns a fresh token without refreshing", async () => {
    storeTokens(60);
    await expect(getAccessToken(deps, USER)).resolves.toBe("access-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes a token close to expiry and stores the rotated refresh token", async () => {
    storeTokens(2);
    fetchMock.mockResolvedValueOnce(rotated());

    await expect(getAccessToken(deps, USER)).resolves.toBe("access-2");

    expect(requests().map((r) => r.url)).toEqual([TOKEN_ENDPOINT]);
    expect(store.rows.get(USER)).toMatchObject({
      accessToken: "access-2",
      refreshToken: "refresh-2",
      accessExpiresAt: new Date(NOW.getTime() + 36000 * 1000),
    });
  });

  it("refreshes once when concurrent requests find the token expiring", async () => {
    storeTokens(-1);
    fetchMock
      .mockResolvedValueOnce(rotated())
      .mockResolvedValue(jsonResponse({ error: "invalid_grant" }, 400));

    const results = await Promise.all([
      getAccessToken(deps, USER),
      getAccessToken(deps, USER),
      getAccessToken(deps, USER),
    ]);

    expect(results).toEqual(["access-2", "access-2", "access-2"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.rows.get(USER)?.refreshToken).toBe("refresh-2");
  });

  it("clears tokens when the refresh token is rejected", async () => {
    storeTokens(-1);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "invalid_grant" }, 400),
    );

    await expect(getAccessToken(deps, USER)).rejects.toBeInstanceOf(
      ReauthorizationRequired,
    );
    expect(store.rows.has(USER)).toBe(false);
  });

  it("keeps tokens when the token endpoint is temporarily unavailable", async () => {
    storeTokens(-1);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "temporarily_unavailable" }, 503),
    );

    await expect(getAccessToken(deps, USER)).rejects.toBeInstanceOf(
      TokenEndpointError,
    );
    expect(store.rows.get(USER)?.refreshToken).toBe("refresh-1");
  });

  it("requires authorization when no tokens are stored", async () => {
    await expect(getAccessToken(deps, USER)).rejects.toBeInstanceOf(
      ReauthorizationRequired,
    );
  });
});

describe("snaptradeGet", () => {
  it("sends only the bearer token to the SnapTrade API", async () => {
    storeTokens(60);
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: "account-1" }]));

    await expect(snaptradeGet(deps, USER, "/accounts")).resolves.toEqual([
      { id: "account-1" },
    ]);

    const [request] = requests();
    expect(request.url).toBe("https://api.snaptrade.com/accounts");
    expect(request.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer access-1",
    });
  });

  it("refreshes and retries once after a 401", async () => {
    storeTokens(60);
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(rotated())
      .mockResolvedValueOnce(jsonResponse([]));

    await expect(snaptradeGet(deps, USER, "/accounts")).resolves.toEqual([]);

    expect(requests().map((r) => r.url)).toEqual([
      "https://api.snaptrade.com/accounts",
      TOKEN_ENDPOINT,
      "https://api.snaptrade.com/accounts",
    ]);
    expect(requests()[2].headers.Authorization).toBe("Bearer access-2");
  });

  it("clears tokens when the retry is also rejected", async () => {
    storeTokens(60);
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(rotated())
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(snaptradeGet(deps, USER, "/accounts")).rejects.toBeInstanceOf(
      ReauthorizationRequired,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(store.rows.has(USER)).toBe(false);
  });

  it("reports other failures without clearing tokens", async () => {
    storeTokens(60);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));

    const error = await snaptradeGet(deps, USER, "/authorizations").catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(SnapTradeApiError);
    expect(error).toMatchObject({ status: 500, path: "/authorizations" });
    expect(store.rows.has(USER)).toBe(true);
  });

  it("refuses to send the token to another host", async () => {
    storeTokens(60);
    await expect(
      snaptradeGet(deps, USER, "//evil.example/accounts"),
    ).rejects.toThrow(/relative/);
    await expect(
      snaptradeGet(deps, USER, "https://evil.example/accounts"),
    ).rejects.toThrow(/relative/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
