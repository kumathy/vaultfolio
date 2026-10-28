import "server-only";

import { EncryptJWT, jwtDecrypt } from "jose";
import { pairReturnPath } from "./plugin";

export const FLOW_COOKIE = "vf_oauth";
// Sent only to the callback, the one route that reads it.
export const FLOW_COOKIE_PATH = "/oauth/snaptrade/callback";
const FLOW_TTL_SECONDS = 10 * 60;

export interface FlowState {
  state: string;
  nonce: string;
  codeVerifier: string;
  // Page to open after sign-in, validated by pairReturnPath.
  returnTo?: `/pair?${string}`;
}

// Encrypted (JWE, A256GCM) rather than only signed: the code_verifier and
// nonce are secrets until the callback completes.
export function sealFlowState(
  flow: FlowState,
  key: Uint8Array,
): Promise<string> {
  return new EncryptJWT({ ...flow })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${FLOW_TTL_SECONDS}s`)
    .encrypt(key);
}

export async function openFlowState(
  value: string | undefined,
  key: Uint8Array,
): Promise<FlowState | null> {
  if (!value) {
    return null;
  }
  try {
    const { payload } = await jwtDecrypt(value, key, {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });
    const { state, nonce, codeVerifier, returnTo } = payload;
    if (
      typeof state !== "string" ||
      typeof nonce !== "string" ||
      typeof codeVerifier !== "string"
    ) {
      return null;
    }
    const back = pairReturnPath(typeof returnTo === "string" ? returnTo : null);
    return { state, nonce, codeVerifier, ...(back && { returnTo: back }) };
  } catch {
    return null;
  }
}

export function flowCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    // SnapTrade returns the browser with a top-level cross-site redirect.
    // Lax includes the cookie on that navigation; Strict would withhold it.
    sameSite: "lax" as const,
    path: FLOW_COOKIE_PATH,
    maxAge: FLOW_TTL_SECONDS,
  };
}
