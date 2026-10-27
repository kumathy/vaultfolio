import "server-only";

import { dbTokenStore } from "@/db/token-store";
import { env } from "@/lib/env";
import { getOidcMetadata } from "./discovery";
import type { OAuthConfig } from "./oauth";
import type { TokenDeps } from "./tokens";

export async function getOAuthConfig(): Promise<OAuthConfig> {
  return {
    clientId: env.snaptradeClientId,
    clientSecret: env.snaptradeClientSecret,
    redirectUri: env.redirectUri,
    metadata: await getOidcMetadata(),
  };
}

export const tokenDeps: TokenDeps = {
  store: dbTokenStore,
  config: getOAuthConfig,
};
