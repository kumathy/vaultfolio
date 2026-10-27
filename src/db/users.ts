import "server-only";

import type { Identity } from "@/lib/snaptrade/oauth";
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
