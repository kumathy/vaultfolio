import { connection, type NextRequest, type NextResponse } from "next/server";
import { upsertUser } from "@/db/users";
import { completeAuthorization } from "@/lib/auth/callback";
import {
  FLOW_COOKIE,
  FLOW_COOKIE_PATH,
  openFlowState,
} from "@/lib/auth/flow-cookie";
import { redirectTo } from "@/lib/auth/http";
import {
  createSession,
  deleteSession,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getOAuthConfig, tokenDeps } from "@/lib/snaptrade/config";
import { storeGrant } from "@/lib/snaptrade/grant";

async function signIn(request: NextRequest): Promise<NextResponse> {
  const flow = await openFlowState(
    request.cookies.get(FLOW_COOKIE)?.value,
    env.sessionKey,
  );
  const result = await completeAuthorization(
    request.nextUrl.searchParams,
    flow,
    await getOAuthConfig(),
  );

  if (!result.ok) {
    console.warn("OAuth callback rejected", {
      reason: result.reason,
      detail: result.detail,
    });
    return redirectTo(`/?error=${result.reason}`);
  }

  const userId = await upsertUser(result.identity);
  await storeGrant(tokenDeps, userId, result.tokens);

  // Session fixation: any session presented with this request is discarded
  // and a new identifier is issued.
  const cookieName = sessionCookieName();
  const previous = request.cookies.get(cookieName)?.value;
  if (previous) {
    await deleteSession(previous);
  }
  const session = await createSession(userId);

  const response = redirectTo("/accounts");
  response.cookies.set(
    cookieName,
    session.token,
    sessionCookieOptions(session.expiresAt),
  );
  return response;
}

export async function GET(request: NextRequest) {
  await connection();

  let response: NextResponse;
  try {
    response = await signIn(request);
  } catch (error) {
    console.error("OAuth callback failed", {
      kind: error instanceof Error ? error.name : typeof error,
    });
    response = redirectTo("/?error=login_failed");
  }

  // Single use: a replayed callback URL finds no flow state.
  response.cookies.delete({ name: FLOW_COOKIE, path: FLOW_COOKIE_PATH });
  return response;
}
