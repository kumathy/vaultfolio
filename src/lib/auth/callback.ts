import "server-only";

import type { JWTVerifyGetKey } from "jose";
import { safeEqual } from "@/lib/crypto/random";
import {
  exchangeCode,
  verifyIdToken,
  type Identity,
  type OAuthConfig,
  type TokenResponse,
} from "@/lib/snaptrade/oauth";
import type { FlowState } from "./flow-cookie";

export type CallbackFailure = "state_mismatch" | "access_denied" | "login_failed";

export type CallbackResult =
  | { ok: true; identity: Identity; tokens: TokenResponse }
  | { ok: false; reason: CallbackFailure; detail: string };

const fail = (reason: CallbackFailure, detail: string): CallbackResult => ({
  ok: false,
  reason,
  detail,
});

export async function completeAuthorization(
  params: URLSearchParams,
  flow: FlowState | null,
  config: OAuthConfig,
  keySet?: JWTVerifyGetKey,
): Promise<CallbackResult> {
  // Rejects callbacks this browser did not start: prevents login CSRF and
  // injection of an authorization code issued to someone else.
  const state = params.get("state");
  if (!flow || !state || !safeEqual(state, flow.state)) {
    return fail("state_mismatch", flow ? "state differs" : "no flow cookie");
  }

  // RFC 9207: SnapTrade identifies itself in the response. A different issuer
  // indicates an IdP mix-up attack.
  const issuer = params.get("iss");
  if (issuer !== null && issuer !== config.metadata.issuer) {
    return fail("login_failed", "issuer mismatch");
  }

  const error = params.get("error");
  if (error) {
    return error === "access_denied"
      ? fail("access_denied", "consent denied")
      : fail("login_failed", "authorization error response");
  }

  const code = params.get("code");
  if (!code) {
    return fail("login_failed", "missing code");
  }

  let tokens: TokenResponse;
  try {
    tokens = await exchangeCode(config, code, flow.codeVerifier);
  } catch {
    return fail("login_failed", "code exchange failed");
  }

  if (!tokens.idToken) {
    return fail("login_failed", "missing id_token");
  }

  try {
    const identity = await verifyIdToken(
      config,
      tokens.idToken,
      flow.nonce,
      keySet,
    );
    return { ok: true, identity, tokens };
  } catch {
    return fail("login_failed", "id_token verification failed");
  }
}
