import "server-only";

import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/crypto/aes-gcm";
import { env } from "@/lib/env";
import type { StoredTokens, TokenStore } from "@/lib/snaptrade/tokens";
import { db, withTransaction } from "./client";
import { snaptradeTokens } from "./schema";

type Row = typeof snaptradeTokens.$inferSelect;

function seal(userId: string, tokens: StoredTokens) {
  const key = env.tokenEncryptionKey;
  return {
    userId,
    accessTokenEnc: encrypt(tokens.accessToken, key, `${userId}|access_token`),
    refreshTokenEnc: encrypt(
      tokens.refreshToken,
      key,
      `${userId}|refresh_token`,
    ),
    accessExpiresAt: tokens.accessExpiresAt,
    scope: tokens.scope,
    updatedAt: new Date(),
  };
}

function unseal(row: Row): StoredTokens {
  const key = env.tokenEncryptionKey;
  return {
    accessToken: decrypt(row.accessTokenEnc, key, `${row.userId}|access_token`),
    refreshToken: decrypt(
      row.refreshTokenEnc,
      key,
      `${row.userId}|refresh_token`,
    ),
    accessExpiresAt: row.accessExpiresAt,
    scope: row.scope,
  };
}

const byUser = (userId: string) => eq(snaptradeTokens.userId, userId);

export const dbTokenStore: TokenStore = {
  async load(userId) {
    const [row] = await db()
      .select()
      .from(snaptradeTokens)
      .where(byUser(userId));
    return row ? unseal(row) : null;
  },

  async save(userId, tokens) {
    const values = seal(userId, tokens);
    await db()
      .insert(snaptradeTokens)
      .values(values)
      .onConflictDoUpdate({ target: snaptradeTokens.userId, set: values });
  },

  async remove(userId) {
    await db().delete(snaptradeTokens).where(byUser(userId));
  },

  withLock(userId, update) {
    return withTransaction(async (tx) => {
      // Row lock: a concurrent refresh for the same user waits here until this
      // transaction commits the rotated refresh token.
      const [row] = await tx
        .select()
        .from(snaptradeTokens)
        .where(byUser(userId))
        .for("update");
      const current = row ? unseal(row) : null;
      const next = await update(current);

      if (next === current) {
        return current;
      }
      if (next) {
        await tx
          .update(snaptradeTokens)
          .set(seal(userId, next))
          .where(byUser(userId));
      } else {
        await tx.delete(snaptradeTokens).where(byUser(userId));
      }
      return next;
    });
  },
};
