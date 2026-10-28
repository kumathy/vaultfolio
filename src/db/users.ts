import "server-only";

import type { Identity } from "@/lib/snaptrade/oauth";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { users } from "./schema";

export async function upsertUser(identity: Identity): Promise<string> {
  const [user] = await db()
    .insert(users)
    .values({
      snaptradeSub: identity.sub,
      email: identity.email,
      emailVerified: identity.emailVerified,
    })
    .onConflictDoUpdate({
      target: users.snaptradeSub,
      set: { email: identity.email, emailVerified: identity.emailVerified },
    })
    .returning({ id: users.id });
  return user.id;
}

// Only an email SnapTrade has verified is shown as the account identity.
export async function verifiedEmail(userId: string): Promise<string | null> {
  const [user] = await db()
    .select({ email: users.email, verified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId));
  return user?.verified ? user.email : null;
}
