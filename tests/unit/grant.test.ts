import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { disconnect, storeGrant } from "@/lib/snaptrade/grant";
import type { TokenDeps } from "@/lib/snaptrade/tokens";
import { MemoryTokenStore } from "../helpers/memory-token-store";
import { jsonResponse, testConfig } from "../helpers/oauth";

const NOW = new Date("2026-10-27T12:00:00Z");
const USER = "user-1";
const REVOCATION_ENDPOINT = testConfig.metadata.revocation_endpoint;

let store: MemoryTokenStore;
let deps: TokenDeps;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

const grant = (refreshToken: string) => ({
  accessToken: `access-for-${refreshToken}`,
  refreshToken,
  expiresIn: 36000,
  scope: "openid email read",
});

function revokedTokens() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url) === REVOCATION_ENDPOINT)
    .map(([, init]) => (init?.body as URLSearchParams).get("token"));
}

beforeEach(() => {
  store = new MemoryTokenStore();
  deps = { store, config: async () => testConfig, now: () => NOW };
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("storeGrant", () => {
  it("stores the first grant without revoking anything", async () => {
    await storeGrant(deps, USER, grant("refresh-1"));

    expect(store.rows.get(USER)).toMatchObject({
      refreshToken: "refresh-1",
      accessExpiresAt: new Date(NOW.getTime() + 36000 * 1000),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("revokes the refresh token it replaces", async () => {
    await storeGrant(deps, USER, grant("refresh-1"));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await storeGrant(deps, USER, grant("refresh-2"));

    expect(store.rows.get(USER)?.refreshToken).toBe("refresh-2");
    expect(revokedTokens()).toEqual(["refresh-1"]);
  });

  it("keeps the new grant when revoking the old one fails", async () => {
    await storeGrant(deps, USER, grant("refresh-1"));
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await storeGrant(deps, USER, grant("refresh-2"));

    expect(store.rows.get(USER)?.refreshToken).toBe("refresh-2");
  });
});

describe("disconnect", () => {
  it("revokes the refresh token, then deletes the stored tokens", async () => {
    await storeGrant(deps, USER, grant("refresh-1"));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(disconnect(deps, USER)).resolves.toEqual({ revoked: true });

    expect(revokedTokens()).toEqual(["refresh-1"]);
    expect(store.rows.has(USER)).toBe(false);
  });

  it("deletes local tokens and reports when revocation fails", async () => {
    await storeGrant(deps, USER, grant("refresh-1"));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "server_error" }, 503),
    );

    await expect(disconnect(deps, USER)).resolves.toEqual({ revoked: false });
    expect(store.rows.has(USER)).toBe(false);
  });

  it("succeeds when no tokens are stored", async () => {
    await expect(disconnect(deps, USER)).resolves.toEqual({ revoked: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
