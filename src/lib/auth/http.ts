import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

// Redirect targets are fixed paths on APP_BASE_URL, never taken from the
// request, so no route can be used as an open redirect.
export function redirectTo(path: `/${string}`): NextResponse {
  return NextResponse.redirect(new URL(path, env.appBaseUrl), 303);
}

// Second CSRF layer for state-changing POSTs, alongside SameSite=Lax cookies.
// Browsers always send Origin on form POSTs.
export function isSameOrigin(request: NextRequest): boolean {
  return request.headers.get("origin") === env.appBaseUrl;
}

export function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
