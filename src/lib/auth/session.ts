import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { sessions } from "@/db/schema";
import { randomToken, sha256Hex } from "@/lib/crypto/random";
import { env } from "@/lib/env";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// The __Host- prefix makes the browser require Secure, Path=/ and no Domain,
// so a sibling subdomain cannot set or overwrite the cookie (cookie tossing).
// Browsers reject the prefix over plain http, so local development omits it.
export function sessionCookieName(): string {
  return env.secureCookies ? "__Host-vf_session" : "vf_session";
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export async function createSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db()
    .insert(sessions)
    .values({ idHash: sha256Hex(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function findSessionUserId(
  token: string | undefined,
): Promise<string | null> {
  if (!token) {
    return null;
  }
  const [session] = await db()
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(
      and(
        eq(sessions.idHash, sha256Hex(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    );
  return session?.userId ?? null;
}

export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(sessionCookieName())?.value;
  return findSessionUserId(token);
}

// Checked in each page and route handler, close to the data. Middleware-only
// checks have been bypassable (CVE-2025-29927).
export async function requireUserId(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) {
    redirect("/");
  }
  return userId;
}

export async function deleteSession(token: string): Promise<void> {
  await db()
    .delete(sessions)
    .where(eq(sessions.idHash, sha256Hex(token)));
}

export async function deleteAllSessions(userId: string): Promise<void> {
  await db().delete(sessions).where(eq(sessions.userId, userId));
}
