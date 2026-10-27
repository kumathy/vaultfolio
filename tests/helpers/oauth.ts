import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTPayload,
} from "jose";
import { parseMetadata } from "@/lib/snaptrade/discovery";
import type { OAuthConfig } from "@/lib/snaptrade/oauth";
import discovery from "../fixtures/oidc-configuration.json";

export const testConfig: OAuthConfig = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  redirectUri: "http://127.0.0.1:3000/oauth/snaptrade/callback",
  metadata: parseMetadata(discovery),
};

export async function createSigner(kid = "test-key") {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: "RS256" };
  const keySet = createLocalJWKSet({ keys: [jwk] });

  async function sign(
    claims: JWTPayload = {},
    options: { expiresIn?: string | number; issuedAt?: number } = {},
  ) {
    const jwt = new SignJWT({ nonce: "nonce-1", ...claims })
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuer(testConfig.metadata.issuer)
      .setAudience(testConfig.clientId)
      .setSubject("snaptrade-user-1")
      .setIssuedAt(options.issuedAt)
      .setExpirationTime(options.expiresIn ?? "5m");
    if (claims.iss) jwt.setIssuer(claims.iss);
    if (claims.aud) jwt.setAudience(claims.aud);
    return jwt.sign(privateKey);
  }

  return { keySet, sign };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function tokenBody(overrides: Record<string, unknown> = {}) {
  return {
    access_token: "access-1",
    refresh_token: "refresh-1",
    expires_in: 36000,
    token_type: "Bearer",
    scope: "openid email read",
    ...overrides,
  };
}
