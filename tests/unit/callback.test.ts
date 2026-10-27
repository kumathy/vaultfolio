import { randomBytes } from "node:crypto";
import { EncryptJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeAuthorization } from "@/lib/auth/callback";
import {
  openFlowState,
  sealFlowState,
  type FlowState,
} from "@/lib/auth/flow-cookie";
import {
  createSigner,
  jsonResponse,
  testConfig,
  tokenBody,
} from "../helpers/oauth";

const flow: FlowState = {
  state: "state-1",
  nonce: "nonce-1",
  codeVerifier: "verifier-1",
};

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function query(values: Record<string, string>) {
  return new URLSearchParams(values);
}

describe("flow cookie", () => {
  const key = randomBytes(32);

  it("round-trips without exposing the verifier", async () => {
    const sealed = await sealFlowState(flow, key);
    expect(sealed).not.toContain("verifier-1");
    await expect(openFlowState(sealed, key)).resolves.toEqual(flow);
  });

  it("rejects a missing, tampered or foreign cookie", async () => {
    const sealed = await sealFlowState(flow, key);
    const tampered = sealed.slice(0, -4) + "AAAA";

    await expect(openFlowState(undefined, key)).resolves.toBeNull();
    await expect(openFlowState(tampered, key)).resolves.toBeNull();
    await expect(openFlowState(sealed, randomBytes(32))).resolves.toBeNull();
  });

  it("rejects an expired cookie", async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    const expired = await new EncryptJWT({ ...flow })
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .setIssuedAt(past)
      .setExpirationTime(past + 600)
      .encrypt(key);

    await expect(openFlowState(expired, key)).resolves.toBeNull();
  });
});

describe("completeAuthorization", () => {
  it("signs in when state, code and ID token are valid", async () => {
    const { keySet, sign } = await createSigner();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        tokenBody({
          id_token: await sign({
            email: "a@example.com",
            email_verified: true,
          }),
        }),
      ),
    );

    const result = await completeAuthorization(
      query({
        code: "code-1",
        state: "state-1",
        iss: "https://api.snaptrade.com",
      }),
      flow,
      testConfig,
      keySet,
    );

    expect(result).toMatchObject({
      ok: true,
      identity: {
        sub: "snaptrade-user-1",
        email: "a@example.com",
        emailVerified: true,
      },
      tokens: { accessToken: "access-1", refreshToken: "refresh-1" },
    });
    const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.get("code_verifier")).toBe("verifier-1");
  });

  it.each([
    ["mismatched state", query({ code: "c", state: "state-2" }), flow],
    ["missing state", query({ code: "c" }), flow],
    ["missing flow cookie", query({ code: "c", state: "state-1" }), null],
  ])(
    "rejects a %s without contacting the token endpoint",
    async (_, params, flowState) => {
      const result = await completeAuthorization(params, flowState, testConfig);
      expect(result).toMatchObject({ ok: false, reason: "state_mismatch" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("handles consent denial without a token exchange", async () => {
    const result = await completeAuthorization(
      query({ error: "access_denied", state: "state-1" }),
      flow,
      testConfig,
    );
    expect(result).toMatchObject({ ok: false, reason: "access_denied" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a response from another issuer", async () => {
    const result = await completeAuthorization(
      query({ code: "c", state: "state-1", iss: "https://evil.example" }),
      flow,
      testConfig,
    );
    expect(result).toMatchObject({ ok: false, reason: "login_failed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails cleanly on an expired or reused code", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "invalid_grant" }, 400),
    );
    const result = await completeAuthorization(
      query({ code: "expired", state: "state-1" }),
      flow,
      testConfig,
    );
    expect(result).toMatchObject({
      ok: false,
      reason: "login_failed",
      detail: "code exchange failed",
    });
  });

  it("rejects a token response without an ID token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(tokenBody()));
    const result = await completeAuthorization(
      query({ code: "c", state: "state-1" }),
      flow,
      testConfig,
    );
    expect(result).toMatchObject({ ok: false, detail: "missing id_token" });
  });

  it("rejects an ID token bound to another attempt", async () => {
    const { keySet, sign } = await createSigner();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        tokenBody({ id_token: await sign({ nonce: "nonce-other" }) }),
      ),
    );
    const result = await completeAuthorization(
      query({ code: "c", state: "state-1" }),
      flow,
      testConfig,
      keySet,
    );
    expect(result).toMatchObject({
      ok: false,
      detail: "id_token verification failed",
    });
  });
});
