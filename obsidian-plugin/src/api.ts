import { requestUrl, type RequestUrlResponse } from "obsidian";
import type { RemoteReport } from "./sync";

// Obsidian's requestUrl rather than fetch: it is not subject to CORS and
// works the same on desktop and mobile.

export class ApiError extends Error {
  constructor(
    readonly kind:
      "invalid_token" | "invalid_code" | "reauthorize" | "unavailable",
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function send(
  url: string,
  init: { method: string; body?: unknown; token?: string },
): Promise<RequestUrlResponse> {
  try {
    return await requestUrl({
      url,
      method: init.method,
      contentType: init.body ? "application/json" : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
      headers: init.token ? { Authorization: `Bearer ${init.token}` } : {},
      // Statuses are handled below instead of thrown.
      throw: false,
    });
  } catch {
    throw new ApiError(
      "unavailable",
      "Vaultfolio could not be reached. Check the app URL in settings.",
    );
  }
}

export async function exchangeCode(
  appUrl: string,
  input: { code: string; verifier: string; label: string },
): Promise<string> {
  const response = await send(`${appUrl}/api/plugin/token`, {
    method: "POST",
    body: input,
  });
  const token: unknown = response.status === 200 ? response.json?.token : null;
  if (typeof token !== "string") {
    throw new ApiError(
      "invalid_code",
      "Pairing failed or the link expired. Choose Connect again.",
    );
  }
  return token;
}

export async function fetchReports(
  appUrl: string,
  token: string,
): Promise<RemoteReport[]> {
  const response = await send(`${appUrl}/api/plugin/reports`, {
    method: "GET",
    token,
  });
  if (response.status === 401) {
    throw new ApiError(
      "invalid_token",
      "This vault's access was revoked. Connect again in Vaultfolio settings.",
    );
  }
  if (response.status === 403) {
    throw new ApiError(
      "reauthorize",
      "SnapTrade access has expired. Sign in again on the Vaultfolio website.",
    );
  }
  const reports: unknown =
    response.status === 200 ? response.json?.reports : null;
  if (!Array.isArray(reports)) {
    throw new ApiError(
      "unavailable",
      "Vaultfolio could not generate the reports. Try again later.",
    );
  }
  return reports.filter(
    (r): r is RemoteReport =>
      typeof r?.period === "string" &&
      typeof r?.fileName === "string" &&
      typeof r?.markdown === "string",
  );
}

// Best effort: the local token is forgotten even if the server is unreachable.
export async function revokeToken(
  appUrl: string,
  token: string,
): Promise<void> {
  await send(`${appUrl}/api/plugin/token`, { method: "DELETE", token }).catch(
    () => undefined,
  );
}
