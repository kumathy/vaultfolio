import type { NextRequest } from "next/server";
import { isSameOrigin, redirectTo } from "@/lib/auth/http";
import {
  deleteAllSessions,
  findSessionUserId,
  sessionCookieName,
} from "@/lib/auth/session";
import { tokenDeps } from "@/lib/snaptrade/config";
import { disconnect } from "@/lib/snaptrade/grant";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  const cookieName = sessionCookieName();
  const userId = await findSessionUserId(
    request.cookies.get(cookieName)?.value,
  );
  if (!userId) {
    return redirectTo("/");
  }

  const { revoked } = await disconnect(tokenDeps, userId);
  await deleteAllSessions(userId);

  const response = redirectTo(
    revoked ? "/?notice=disconnected" : "/?notice=disconnected_unconfirmed",
  );
  response.cookies.delete(cookieName);
  return response;
}
