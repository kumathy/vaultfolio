import "server-only";

import { and, desc, eq, gt, lte } from "drizzle-orm";
import type { PairingStore } from "@/lib/auth/plugin";
import { db } from "./client";
import { pairingCodes, pluginTokens } from "./schema";

export const dbPairingStore: PairingStore = {
  async savePairingCode(entry) {
    await db().insert(pairingCodes).values(entry);
  },

  async takePairingCode(codeHash, now) {
    // Expired codes are cleaned up here rather than by a scheduled job.
    await db().delete(pairingCodes).where(lte(pairingCodes.expiresAt, now));
    // A single DELETE ... RETURNING, so two concurrent exchanges cannot both
    // receive the code.
    const [row] = await db()
      .delete(pairingCodes)
      .where(
        and(
          eq(pairingCodes.codeHash, codeHash),
          gt(pairingCodes.expiresAt, now),
        ),
      )
      .returning({
        userId: pairingCodes.userId,
        challenge: pairingCodes.challenge,
      });
    return row ?? null;
  },

  async saveToken(entry) {
    await db().insert(pluginTokens).values(entry);
  },

  async useToken(tokenHash, now) {
    const [row] = await db()
      .update(pluginTokens)
      .set({ lastUsedAt: now })
      .where(eq(pluginTokens.tokenHash, tokenHash))
      .returning({ userId: pluginTokens.userId });
    return row?.userId ?? null;
  },

  async deleteToken(tokenHash) {
    await db()
      .delete(pluginTokens)
      .where(eq(pluginTokens.tokenHash, tokenHash));
  },
};

export interface ConnectedVault {
  id: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export function listPluginTokens(userId: string): Promise<ConnectedVault[]> {
  return db()
    .select({
      id: pluginTokens.id,
      label: pluginTokens.label,
      createdAt: pluginTokens.createdAt,
      lastUsedAt: pluginTokens.lastUsedAt,
    })
    .from(pluginTokens)
    .where(eq(pluginTokens.userId, userId))
    .orderBy(desc(pluginTokens.createdAt));
}

// Scoped to the user, so one user can never revoke another's token by id.
export async function revokePluginToken(
  userId: string,
  id: string,
): Promise<void> {
  await db()
    .delete(pluginTokens)
    .where(and(eq(pluginTokens.userId, userId), eq(pluginTokens.id, id)));
}

export async function revokeAllPluginAccess(userId: string): Promise<void> {
  await db().delete(pluginTokens).where(eq(pluginTokens.userId, userId));
  await db().delete(pairingCodes).where(eq(pairingCodes.userId, userId));
}
