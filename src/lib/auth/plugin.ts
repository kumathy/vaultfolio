import "server-only";

import { createHash } from "node:crypto";
import { randomToken, safeEqual, sha256Hex } from "@/lib/crypto/random";

// Pairing hands a browser sign-in to the Obsidian plugin:
// 1. The plugin creates a random verifier and opens /pair with its S256
//    challenge.
// 2. The signed-in user confirms, and the app issues a one-time code bound
//    to that challenge, delivered through an obsidian:// link.
// 3. The plugin exchanges code + verifier for a plugin token.
// Only hashes of codes and tokens are stored.

export const PAIRING_TTL_MS = 5 * 60 * 1000;
// Recognisable prefix, so a leaked token is easy to identify in a vault or a
// commit.
const TOKEN_PREFIX = "vfp_";
const MAX_LABEL_LENGTH = 60;

export interface PairingStore {
  savePairingCode(entry: {
    codeHash: string;
    userId: string;
    challenge: string;
    expiresAt: Date;
  }): Promise<void>;
  // Deletes and returns the code in one step, so it can be used only once.
  takePairingCode(
    codeHash: string,
    now: Date,
  ): Promise<{ userId: string; challenge: string } | null>;
  saveToken(entry: {
    tokenHash: string;
    userId: string;
    label: string;
  }): Promise<void>;
  // Returns the owner and records the use; null for unknown or revoked tokens.
  useToken(tokenHash: string, now: Date): Promise<string | null>;
  deleteToken(tokenHash: string): Promise<void>;
}

// RFC 7636 S256: base64url(SHA-256(verifier)), 43 characters.
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/;
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;

export const isChallenge = (value: unknown): value is string =>
  typeof value === "string" && CHALLENGE.test(value);

export function challengeFor(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function cleanLabel(value: unknown): string {
  const text =
    typeof value === "string"
      ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim()
      : "";
  return text.slice(0, MAX_LABEL_LENGTH) || "Obsidian vault";
}

export async function startPairing(
  store: PairingStore,
  userId: string,
  challenge: string,
  now = new Date(),
): Promise<string> {
  const code = randomToken();
  await store.savePairingCode({
    codeHash: sha256Hex(code),
    userId,
    challenge,
    expiresAt: new Date(now.getTime() + PAIRING_TTL_MS),
  });
  return code;
}

export type ExchangeResult =
  | { ok: true; token: string }
  | { ok: false; reason: "invalid_request" | "invalid_code" };

export async function exchangePairing(
  store: PairingStore,
  input: { code?: unknown; verifier?: unknown; label?: unknown },
  now = new Date(),
): Promise<ExchangeResult> {
  const { code, verifier } = input;
  if (
    typeof code !== "string" ||
    code.length > 128 ||
    typeof verifier !== "string" ||
    !VERIFIER.test(verifier)
  ) {
    return { ok: false, reason: "invalid_request" };
  }

  // Taken before checking the verifier: a wrong guess still burns the code,
  // so it cannot be retried.
  const pairing = await store.takePairingCode(sha256Hex(code), now);
  // Code interception: without the plugin's verifier, a stolen code fails.
  if (!pairing || !safeEqual(challengeFor(verifier), pairing.challenge)) {
    return { ok: false, reason: "invalid_code" };
  }

  const token = TOKEN_PREFIX + randomToken();
  await store.saveToken({
    tokenHash: sha256Hex(token),
    userId: pairing.userId,
    label: cleanLabel(input.label),
  });
  return { ok: true, token };
}

function bearerToken(authorization: string | null): string | null {
  const token = authorization?.match(/^Bearer (\S+)$/)?.[1];
  return token?.startsWith(TOKEN_PREFIX) && token.length <= 128 ? token : null;
}

export async function authenticatePlugin(
  store: PairingStore,
  authorization: string | null,
  now = new Date(),
): Promise<string | null> {
  const token = bearerToken(authorization);
  return token ? store.useToken(sha256Hex(token), now) : null;
}

// Lets the plugin revoke its own token when it disconnects, so a copy left in
// a synced or committed data.json stops working.
export async function revokePluginSelf(
  store: PairingStore,
  authorization: string | null,
): Promise<boolean> {
  const token = bearerToken(authorization);
  if (!token) return false;
  await store.deleteToken(sha256Hex(token));
  return true;
}

// Open redirect: after sign-in the browser may only return to the pairing
// page, rebuilt from a validated challenge rather than echoed back.
export function pairReturnPath(value: string | null): `/pair?${string}` | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value, "http://return.invalid");
  } catch {
    return null;
  }
  const challenge = url.searchParams.get("challenge");
  if (
    url.origin !== "http://return.invalid" ||
    url.pathname !== "/pair" ||
    [...url.searchParams.keys()].length !== 1 ||
    !isChallenge(challenge)
  ) {
    return null;
  }
  return `/pair?challenge=${challenge}`;
}
