import { SignJWT, UnsecuredJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseMetadata } from "@/lib/snaptrade/discovery";
import {
  codeChallengeS256,
  createAuthorizationRequest,
  exchangeCode,
  refreshTokens,
  revokeRefreshToken,
  TokenEndpointError,
  verifyIdToken,
} from "@/lib/snaptrade/oauth";
import discovery from "../fixtures/oidc-configuration.json";
import {
  createSigner,
  jsonResponse,
  testConfig,
  tokenBody,
} from "../helpers/oauth";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastRequest(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [
    string,
    RequestInit,
  ];
  const headers = init.headers as Record<string, string>;
  return {
    url,
    headers,
    body: new URLSearchParams(init.body as URLSearchParams),
  };
}

describe("discovery", () => {
  it("accepts the SnapTrade document", () => {
    expect(parseMetadata(discovery).token_endpoint).toBe(
      "https://api.snaptrade.com/oauth/token/",
    );
  });

  it("rejects a different issuer", () => {
    expect(() =>
      parseMetadata({ ...discovery, issuer: "https://evil.example" }),
    ).toThrow(/issuer/);
  });

  it("rejects non-https endpoints", () => {
    expect(() =>
      parseMetadata({
        ...discovery,
        token_endpoint: "http://api.snaptrade.com/oauth/token/",
      }),
    ).toThrow(/token_endpoint/);
  });
});

describe("authorization request", () => {
  it("matches the RFC 7636 S256 test vector", () => {
    expect(
      codeChallengeS256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    ).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("builds the URL with PKCE, state, nonce and read-only scopes", () => {
    const request = createAuthorizationRequest(testConfig);
    const params = request.url.searchParams;

    expect(request.url.origin + request.url.pathname).toBe(
      "https://dashboard.snaptrade.com/oauth/authorize",
    );
    expect(params.get("response_type")).toBe("code");
    expect(params.get("client_id")).toBe(testConfig.clientId);
    expect(params.get("redirect_uri")).toBe(testConfig.redirectUri);
    expect(params.get("scope")).toBe("openid email read");
    expect(params.get("scope")).not.toContain("trade");
    expect(params.get("state")).toBe(request.state);
    expect(params.get("nonce")).toBe(request.nonce);
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("code_challenge")).toBe(
      codeChallengeS256(request.codeVerifier),
    );
    expect(request.url.toString()).not.toContain(request.codeVerifier);
    expect(request.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(request.codeVerifier.length).toBeLessThanOrEqual(128);
  });

  it("generates fresh values for every attempt", () => {
    const first = createAuthorizationRequest(testConfig);
    const second = createAuthorizationRequest(testConfig);
    expect(second.state).not.toBe(first.state);
    expect(second.nonce).not.toBe(first.nonce);
    expect(second.codeVerifier).not.toBe(first.codeVerifier);
  });
});

describe("token endpoint", () => {
  const basicAuth = `Basic ${Buffer.from("test-client-id:test-client-secret").toString("base64")}`;

  it("exchanges a code with Basic auth and a form body", async () => {
    const fetchMock = stubFetch(jsonResponse(tokenBody({ id_token: "jwt" })));

    const tokens = await exchangeCode(testConfig, "code-1", "verifier-1");

    const request = lastRequest(fetchMock);
    expect(request.url).toBe("https://api.snaptrade.com/oauth/token/");
    expect(request.headers.Authorization).toBe(basicAuth);
    expect(request.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(Object.fromEntries(request.body)).toEqual({
      grant_type: "authorization_code",
      code: "code-1",
      code_verifier: "verifier-1",
      redirect_uri: testConfig.redirectUri,
    });
    expect(request.body.has("client_secret")).toBe(false);
    expect(tokens).toEqual({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 36000,
      scope: "openid email read",
      idToken: "jwt",
    });
  });

  it("reports an expired or reused code as invalid_grant", async () => {
    stubFetch(jsonResponse({ error: "invalid_grant" }, 400));
    const error = await exchangeCode(testConfig, "old", "verifier").catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(TokenEndpointError);
    expect(error).toMatchObject({ status: 400, code: "invalid_grant" });
  });

  it("rejects a response without tokens", async () => {
    stubFetch(jsonResponse({ access_token: "only-access" }));
    await expect(exchangeCode(testConfig, "c", "v")).rejects.toMatchObject({
      code: "malformed_response",
    });
  });

  it("refreshes with the refresh_token grant and returns the rotated token", async () => {
    const fetchMock = stubFetch(
      jsonResponse(
        tokenBody({ access_token: "access-2", refresh_token: "refresh-2" }),
      ),
    );

    const tokens = await refreshTokens(testConfig, "refresh-1");

    const request = lastRequest(fetchMock);
    expect(request.headers.Authorization).toBe(basicAuth);
    expect(Object.fromEntries(request.body)).toEqual({
      grant_type: "refresh_token",
      refresh_token: "refresh-1",
    });
    expect(tokens.refreshToken).toBe("refresh-2");
  });

  it("revokes the refresh token at the revocation endpoint", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 200 }));

    await revokeRefreshToken(testConfig, "refresh-1");

    const request = lastRequest(fetchMock);
    expect(request.url).toBe("https://api.snaptrade.com/oauth/revoke_token/");
    expect(request.headers.Authorization).toBe(basicAuth);
    expect(Object.fromEntries(request.body)).toEqual({
      token: "refresh-1",
      token_type_hint: "refresh_token",
    });
  });

  it("surfaces a failed revocation", async () => {
    stubFetch(jsonResponse({ error: "server_error" }, 503));
    await expect(
      revokeRefreshToken(testConfig, "refresh-1"),
    ).rejects.toBeInstanceOf(TokenEndpointError);
  });
});

describe("ID token verification", () => {
  it("returns the identity from a valid token", async () => {
    const { keySet, sign } = await createSigner();
    const idToken = await sign({
      email: "investor@example.com",
      email_verified: true,
    });

    await expect(
      verifyIdToken(testConfig, idToken, "nonce-1", keySet),
    ).resolves.toEqual({
      sub: "snaptrade-user-1",
      email: "investor@example.com",
      emailVerified: true,
    });
  });

  it("treats a missing or false email_verified as unverified", async () => {
    const { keySet, sign } = await createSigner();
    const unverified = await sign({
      email: "a@example.com",
      email_verified: false,
    });
    const noEmail = await sign();

    await expect(
      verifyIdToken(testConfig, unverified, "nonce-1", keySet),
    ).resolves.toMatchObject({ emailVerified: false });
    await expect(
      verifyIdToken(testConfig, noEmail, "nonce-1", keySet),
    ).resolves.toMatchObject({ email: null, emailVerified: false });
  });

  it("rejects a nonce from another attempt", async () => {
    const { keySet, sign } = await createSigner();
    await expect(
      verifyIdToken(testConfig, await sign(), "nonce-2", keySet),
    ).rejects.toThrow(/nonce/);
  });

  it("rejects a token issued for another client", async () => {
    const { keySet, sign } = await createSigner();
    await expect(
      verifyIdToken(
        testConfig,
        await sign({ aud: "other-client" }),
        "nonce-1",
        keySet,
      ),
    ).rejects.toThrow();
  });

  it("rejects a token from another issuer", async () => {
    const { keySet, sign } = await createSigner();
    await expect(
      verifyIdToken(
        testConfig,
        await sign({ iss: "https://evil.example" }),
        "nonce-1",
        keySet,
      ),
    ).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const { keySet, sign } = await createSigner();
    const hourAgo = Math.floor(Date.now() / 1000) - 3600;
    const expired = await sign(
      {},
      { issuedAt: hourAgo, expiresIn: hourAgo + 60 },
    );
    await expect(
      verifyIdToken(testConfig, expired, "nonce-1", keySet),
    ).rejects.toThrow();
  });

  it("rejects a token signed by an unknown key", async () => {
    const trusted = await createSigner("trusted");
    const attacker = await createSigner("trusted");
    await expect(
      verifyIdToken(
        testConfig,
        await attacker.sign(),
        "nonce-1",
        trusted.keySet,
      ),
    ).rejects.toThrow();
  });

  it("rejects HS256 and unsigned tokens", async () => {
    const { keySet } = await createSigner();
    const claims = {
      nonce: "nonce-1",
      iss: testConfig.metadata.issuer,
      aud: testConfig.clientId,
      sub: "snaptrade-user-1",
    };
    const hs256 = await new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256", kid: "test-key" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode("a-shared-secret-of-sufficient-length"));
    const unsigned = new UnsecuredJWT(claims)
      .setIssuedAt()
      .setExpirationTime("5m")
      .encode();

    await expect(
      verifyIdToken(testConfig, hs256, "nonce-1", keySet),
    ).rejects.toThrow();
    await expect(
      verifyIdToken(testConfig, unsigned, "nonce-1", keySet),
    ).rejects.toThrow();
  });
});
