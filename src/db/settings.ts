import "server-only";

import { eq } from "drizzle-orm";
import { parseStoredSettings, type StoredSettings } from "@/lib/settings/parse";
import { db } from "./client";
import { userSettings } from "./schema";

export async function loadSettings(userId: string): Promise<StoredSettings> {
  const [row] = await db()
    .select({ settings: userSettings.settings })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return parseStoredSettings(row?.settings);
}

export async function saveSettings(
  userId: string,
  settings: StoredSettings,
): Promise<void> {
  const values = {
    userId,
    settings: parseStoredSettings(settings),
    updatedAt: new Date(),
  };
  await db()
    .insert(userSettings)
    .values(values)
    .onConflictDoUpdate({ target: userSettings.userId, set: values });
}

export async function updateSettings(
  userId: string,
  change: (current: StoredSettings) => StoredSettings,
): Promise<StoredSettings> {
  const next = change(await loadSettings(userId));
  await saveSettings(userId, next);
  return next;
}
