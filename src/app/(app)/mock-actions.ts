"use server";

import { refresh } from "next/cache";
import { saveSettings } from "@/db/settings";
import { requireUserId } from "@/lib/auth/session";
import { localDate } from "@/lib/reports/period";
import { DEFAULT_SETTINGS } from "@/lib/reports/types";
import { mockScenario } from "@/lib/snaptrade/mock/config";
import { mockSettings } from "@/lib/snaptrade/mock/settings";

// Server Actions are public POST endpoints, so each one refuses to run unless
// mock data is enabled, which production builds never allow.

export async function fillMockSettings(): Promise<void> {
  const scenario = mockScenario();
  if (!scenario) return;
  const userId = await requireUserId();
  const year = Number(
    localDate(new Date(), DEFAULT_SETTINGS.timeZone).slice(0, 4),
  );
  await saveSettings(userId, mockSettings(scenario, year));
  refresh();
}

export async function clearMockSettings(): Promise<void> {
  if (!mockScenario()) return;
  const userId = await requireUserId();
  await saveSettings(userId, {});
  refresh();
}
