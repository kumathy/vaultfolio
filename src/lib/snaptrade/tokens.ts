import "server-only";

import {
  refreshTokens,
  TokenEndpointError,
  type OAuthConfig,
  type TokenResponse,
} from "./oauth";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  scope: string;
}

export interface TokenStore {
  load(userId: string): Promise<StoredTokens | null>;
  save(userId: string, tokens: StoredTokens): Promise<void>;
  remove(userId: string): Promise<void>;
  // Runs `update` with the latest stored tokens while holding an exclusive
  // per-user lock. The returned value is saved; null deletes the tokens.
  withLock(
    userId: string,
    update: (current: StoredTokens | null) => Promise<StoredTokens | null>,
  ): Promise<StoredTokens | null>;
}

export interface TokenDeps {
  store: TokenStore;
  config: () => Promise<OAuthConfig>;
  now?: () => Date;
}

export class ReauthorizationRequired extends Error {
  constructor() {
    super("SnapTrade authorization is missing or no longer valid");
    this.name = "ReauthorizationRequired";
  }
}

// Refreshing ahead of expiry avoids sending a token that lapses in flight.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export function toStoredTokens(
  response: TokenResponse,
  now: Date = new Date(),
): StoredTokens {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    accessExpiresAt: new Date(now.getTime() + response.expiresIn * 1000),
    scope: response.scope,
  };
}

function isExpiring(tokens: StoredTokens, now: Date): boolean {
  return tokens.accessExpiresAt.getTime() - now.getTime() <= REFRESH_MARGIN_MS;
}

// `rejectedToken` is set after the API answered 401 with that token, which
// forces a refresh even if the stored expiry has not passed.
export async function getAccessToken(
  deps: TokenDeps,
  userId: string,
  rejectedToken?: string,
): Promise<string> {
  const now = deps.now?.() ?? new Date();
  const current = await deps.store.load(userId);
  if (!current) {
    throw new ReauthorizationRequired();
  }
  if (!rejectedToken && !isExpiring(current, now)) {
    return current.accessToken;
  }

  const updated = await deps.store.withLock(userId, async (latest) => {
    if (!latest) {
      return null;
    }
    // Another request may have refreshed while this one waited for the lock.
    // Refreshing again would spend the already-rotated refresh token.
    const needsRefresh = rejectedToken
      ? latest.accessToken === rejectedToken
      : isExpiring(latest, now);
    if (!needsRefresh) {
      return latest;
    }

    try {
      const response = await refreshTokens(
        await deps.config(),
        latest.refreshToken,
      );
      return toStoredTokens(response, now);
    } catch (error) {
      // invalid_grant means the grant was revoked or the token already used.
      // Network and server errors keep the tokens for a later retry.
      if (error instanceof TokenEndpointError && error.code === "invalid_grant") {
        return null;
      }
      throw error;
    }
  });

  if (!updated) {
    throw new ReauthorizationRequired();
  }
  return updated.accessToken;
}
