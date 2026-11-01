import "server-only";

import { eq } from "drizzle-orm";
import { parseStoredSettings, type StoredSettings } from "@/lib/settings/parse";
import { mockScenario } from "@/lib/snaptrade/mock/config";
import { db } from "./client";
import { userSettings } from "./schema";

// While mock data is on, settings are kept in the development server's memory,
// per user and scenario, so settings made for generated accounts never replace
// the ones stored for the user's real accounts. They reset on restart. Held on
// globalThis because Next.js can load this module more than once in dev.
const mockStore = ((
  globalThis as { vaultfolioMockSettings?: Map<string, StoredSettings> }
).vaultfolioMockSettings ??= new Map());

const mockKey = (userId: string) => {
  const scenario = mockScenario();
  return scenario ? `${userId}:${scenario}` : null;
};

export async function loadSettings(userId: string): Promise<StoredSettings> {
  const key = mockKey(userId);
  if (key) return parseStoredSettings(mockStore.get(key));
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
  const key = mockKey(userId);
  if (key) {
    mockStore.set(key, parseStoredSettings(settings));
    return;
  }
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
