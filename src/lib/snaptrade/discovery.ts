import "server-only";

export const SNAPTRADE_ISSUER = "https://api.snaptrade.com";
const DISCOVERY_URL = `${SNAPTRADE_ISSUER}/.well-known/openid-configuration`;
const CACHE_TTL_MS = 60 * 60 * 1000;

export interface OidcMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint: string;
  jwks_uri: string;
}

const ENDPOINT_FIELDS = [
  "authorization_endpoint",
  "token_endpoint",
  "revocation_endpoint",
  "jwks_uri",
] as const;

export function parseMetadata(raw: unknown): OidcMetadata {
  const doc = (raw ?? {}) as Record<string, unknown>;

  // OIDC Discovery 1.0 §4.3: the issuer must equal the URL the document was
  // requested from, so an altered document cannot redirect tokens elsewhere.
  if (doc.issuer !== SNAPTRADE_ISSUER) {
    throw new Error("OIDC discovery issuer mismatch");
  }

  for (const field of ENDPOINT_FIELDS) {
    const value = doc[field];
    if (typeof value !== "string" || new URL(value).protocol !== "https:") {
      throw new Error(`OIDC discovery field invalid: ${field}`);
    }
  }

  return {
    issuer: SNAPTRADE_ISSUER,
    authorization_endpoint: doc.authorization_endpoint as string,
    token_endpoint: doc.token_endpoint as string,
    revocation_endpoint: doc.revocation_endpoint as string,
    jwks_uri: doc.jwks_uri as string,
  };
}

let cached: { metadata: OidcMetadata; fetchedAt: number } | undefined;

export async function getOidcMetadata(): Promise<OidcMetadata> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.metadata;
  }
  const response = await fetch(DISCOVERY_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`OIDC discovery failed: HTTP ${response.status}`);
  }
  const metadata = parseMetadata(await response.json());
  cached = { metadata, fetchedAt: Date.now() };
  return metadata;
}
