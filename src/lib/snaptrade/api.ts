import "server-only";

import {
  getAccessToken,
  ReauthorizationRequired,
  type TokenDeps,
} from "./tokens";

// servers[0].url in https://docs.snaptrade.com/openapi.yaml
export const SNAPTRADE_API_BASE = "https://api.snaptrade.com";

export class SnapTradeApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`SnapTrade API error: HTTP ${status} on ${path}`);
    this.name = "SnapTradeApiError";
  }
}

// OAuth requests carry only the bearer token. clientId, consumerKey, userId,
// userSecret, timestamp and Signature belong to the Personal and Commercial
// key schemes and are omitted even where the API reference lists them.
function send(url: URL, accessToken: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
}

export async function snaptradeGet<T>(
  deps: TokenDeps,
  userId: string,
  path: string,
): Promise<T> {
  const url = new URL(path, SNAPTRADE_API_BASE);
  // Keeps the bearer token from being sent to any other host.
  if (url.origin !== SNAPTRADE_API_BASE) {
    throw new Error("SnapTrade API path must be relative");
  }

  let accessToken = await getAccessToken(deps, userId);
  let response = await send(url, accessToken);

  if (response.status === 401) {
    accessToken = await getAccessToken(deps, userId, accessToken);
    response = await send(url, accessToken);
    if (response.status === 401) {
      await deps.store.remove(userId);
      throw new ReauthorizationRequired();
    }
  }

  if (!response.ok) {
    throw new SnapTradeApiError(response.status, url.pathname);
  }
  return (await response.json()) as T;
}
