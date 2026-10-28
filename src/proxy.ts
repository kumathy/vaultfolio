import { NextResponse, type NextRequest } from "next/server";
import { findSessionUserId, sessionCookieName } from "@/lib/auth/session";

// Signed-in visitors to the landing page go straight to the app. A
// convenience only: every page and route still checks the session itself,
// since proxy-only checks have been bypassable (CVE-2025-29927).
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName())?.value;
  // Checked against the database, not just the cookie's presence: an expired
  // cookie would otherwise loop between / and the app's own sign-in redirect.
  if (token && (await findSessionUserId(token))) {
    return NextResponse.redirect(new URL("/accounts", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
