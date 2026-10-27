"use server";

import { refresh } from "next/cache";
import { updateSettings } from "@/db/settings";
import { requireUserId } from "@/lib/auth/session";

export async function dismissRoomPrompt() {
  // Server Actions are public endpoints, so each one re-checks the session.
  const userId = await requireUserId();
  await updateSettings(userId, (settings) => ({
    ...settings,
    roomPromptDismissed: true,
  }));
  refresh();
}
