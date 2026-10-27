import "server-only";

import { revokeRefreshToken, type TokenResponse } from "./oauth";
import { toStoredTokens, type TokenDeps } from "./tokens";

export async function storeGrant(
  deps: TokenDeps,
  userId: string,
  tokens: TokenResponse,
): Promise<void> {
  const previous = await deps.store.load(userId).catch(() => null);
  await deps.store.save(userId, toStoredTokens(tokens, deps.now?.()));

  // A replaced refresh token stays valid at SnapTrade until revoked.
  if (previous && previous.refreshToken !== tokens.refreshToken) {
    await revokeRefreshToken(await deps.config(), previous.refreshToken).catch(
      () => console.warn("Revoking a replaced refresh token failed"),
    );
  }
}

// Local tokens are deleted even when revocation fails, so the app stops using
// the grant either way. `revoked: false` lets the UI point to the SnapTrade
// Dashboard, where access can also be removed.
export async function disconnect(
  deps: TokenDeps,
  userId: string,
): Promise<{ revoked: boolean }> {
  const tokens = await deps.store.load(userId).catch(() => null);
  let revoked = tokens === null;

  if (tokens) {
    try {
      await revokeRefreshToken(await deps.config(), tokens.refreshToken);
      revoked = true;
    } catch {
      console.warn("Refresh token revocation failed during disconnect");
    }
  }

  await deps.store.remove(userId);
  return { revoked };
}
