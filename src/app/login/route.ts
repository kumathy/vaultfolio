import { connection, NextResponse, type NextRequest } from "next/server";
import {
  FLOW_COOKIE,
  flowCookieOptions,
  sealFlowState,
} from "@/lib/auth/flow-cookie";
import { redirectTo } from "@/lib/auth/http";
import { pairReturnPath } from "@/lib/auth/plugin";
import { env } from "@/lib/env";
import { getOAuthConfig } from "@/lib/snaptrade/config";
import { createAuthorizationRequest } from "@/lib/snaptrade/oauth";

export async function GET(request: NextRequest) {
  // A prerendered response would give every visitor the same state and
  // code_verifier.
  await connection();

  let config;
  try {
    config = await getOAuthConfig();
  } catch {
    console.warn("Login unavailable: OAuth configuration could not be loaded");
    return redirectTo("/?error=unavailable");
  }

  const { url, state, nonce, codeVerifier } =
    createAuthorizationRequest(config);
  const returnTo = pairReturnPath(request.nextUrl.searchParams.get("next"));
  const sealed = await sealFlowState(
    { state, nonce, codeVerifier, ...(returnTo && { returnTo }) },
    env.sessionKey,
  );

  const response = NextResponse.redirect(url, 303);
  response.cookies.set(
    FLOW_COOKIE,
    sealed,
    flowCookieOptions(env.secureCookies),
  );
  return response;
}
