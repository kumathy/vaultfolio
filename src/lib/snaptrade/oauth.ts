import "server-only";

import { createHash } from "node:crypto";
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";
import { randomToken, safeEqual } from "@/lib/crypto/random";
import type { OidcMetadata } from "./discovery";

// `trade` is never requested: the app is read-only by design.
export const SCOPES = "openid email read";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  metadata: OidcMetadata;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  idToken?: string;
}

export interface Identity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
}

export class TokenEndpointError extends Error {
  constructor(
    readonly status: number,
    // OAuth error code from the response body, e.g. "invalid_grant".
    readonly code: string | undefined,
  ) {
    super(`Token endpoint error: HTTP ${status}${code ? ` (${code})` : ""}`);
    this.name = "TokenEndpointError";
  }
}

export function codeChallengeS256(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export interface AuthorizationRequest {
  url: URL;
  state: string;
  nonce: string;
  codeVerifier: string;
}

// Fresh values per attempt:
// - state binds the callback to this browser (prevents login CSRF and code injection).
// - code_verifier (PKCE) makes an intercepted code useless without it.
// - nonce binds the ID token to this attempt (prevents ID token replay).
export function createAuthorizationRequest(
  config: OAuthConfig,
): AuthorizationRequest {
  const state = randomToken();
  const nonce = randomToken();
  // 64 bytes encodes to 86 characters, within RFC 7636's 43–128 range.
  const codeVerifier = randomToken(64);

  const url = new URL(config.metadata.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallengeS256(codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");

  return { url, state, nonce, codeVerifier };
}

async function postForm(
  config: OAuthConfig,
  endpoint: string,
  params: Record<string, string>,
): Promise<Response> {
  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`,
  ).toString("base64");

  return fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
    cache: "no-store",
  });
}

// Only the OAuth error code is read from a failed response; the body may echo
// request data and is never logged.
async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : undefined;
  } catch {
    return undefined;
  }
}

async function readTokenResponse(response: Response): Promise<TokenResponse> {
  if (!response.ok) {
    throw new TokenEndpointError(response.status, await errorCode(response));
  }
  const body = (await response.json()) as Record<string, unknown>;
  if (
    typeof body.access_token !== "string" ||
    typeof body.refresh_token !== "string" ||
    typeof body.expires_in !== "number"
  ) {
    throw new TokenEndpointError(response.status, "malformed_response");
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
    scope: typeof body.scope === "string" ? body.scope : "",
    idToken: typeof body.id_token === "string" ? body.id_token : undefined,
  };
}

export async function exchangeCode(
  config: OAuthConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const response = await postForm(config, config.metadata.token_endpoint, {
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: config.redirectUri,
  });
  return readTokenResponse(response);
}

// SnapTrade rotates refresh tokens: the one sent here stops working once this
// call succeeds, so the returned token must replace it.
export async function refreshTokens(
  config: OAuthConfig,
  refreshToken: string,
): Promise<TokenResponse> {
  const response = await postForm(config, config.metadata.token_endpoint, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return readTokenResponse(response);
}

export async function revokeRefreshToken(
  config: OAuthConfig,
  refreshToken: string,
): Promise<void> {
  const response = await postForm(
    config,
    config.metadata.revocation_endpoint,
    { token: refreshToken, token_type_hint: "refresh_token" },
  );
  if (!response.ok) {
    throw new TokenEndpointError(response.status, await errorCode(response));
  }
}

// Created once per JWKS URL. jose caches the keys and refetches when a token
// carries an unknown `kid`, so key rotation needs no redeploy.
const remoteKeySets = new Map<string, JWTVerifyGetKey>();

function remoteKeySet(jwksUri: string): JWTVerifyGetKey {
  let keySet = remoteKeySets.get(jwksUri);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(jwksUri));
    remoteKeySets.set(jwksUri, keySet);
  }
  return keySet;
}

export async function verifyIdToken(
  config: OAuthConfig,
  idToken: string,
  expectedNonce: string,
  keySet: JWTVerifyGetKey = remoteKeySet(config.metadata.jwks_uri),
): Promise<Identity> {
  const { payload } = await jwtVerify(idToken, keySet, {
    issuer: config.metadata.issuer,
    audience: config.clientId,
    // Pinning RS256 blocks algorithm confusion ("none", or HS256 signed with the public key).
    algorithms: ["RS256"],
    maxTokenAge: "10 minutes",
    clockTolerance: "30 seconds",
    requiredClaims: ["sub", "exp", "iat", "nonce"],
  });

  if (typeof payload.nonce !== "string" || !safeEqual(payload.nonce, expectedNonce)) {
    throw new Error("ID token nonce mismatch");
  }

  return {
    sub: payload.sub as string,
    email: typeof payload.email === "string" ? payload.email : null,
    // Stored for display only. Accounts are never linked by email.
    emailVerified: payload.email_verified === true,
  };
}
