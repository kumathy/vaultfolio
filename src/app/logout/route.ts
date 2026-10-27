import type { NextRequest } from "next/server";
import { isSameOrigin, redirectTo } from "@/lib/auth/http";
import { deleteSession, sessionCookieName } from "@/lib/auth/session";

// Ends this browser session only. Stored SnapTrade tokens remain for the
// Obsidian plugin; /disconnect removes them.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  const cookieName = sessionCookieName();
  const token = request.cookies.get(cookieName)?.value;
  if (token) {
    await deleteSession(token);
  }

  const response = redirectTo("/?notice=signed_out");
  response.cookies.delete(cookieName);
  return response;
}
