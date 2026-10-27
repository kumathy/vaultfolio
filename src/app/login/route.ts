import { connection, NextResponse } from "next/server";
import {
  FLOW_COOKIE,
  flowCookieOptions,
  sealFlowState,
} from "@/lib/auth/flow-cookie";
import { redirectTo } from "@/lib/auth/http";
import { env } from "@/lib/env";
import { getOAuthConfig } from "@/lib/snaptrade/config";
import { createAuthorizationRequest } from "@/lib/snaptrade/oauth";

export async function GET() {
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
  const sealed = await sealFlowState(
    { state, nonce, codeVerifier },
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
