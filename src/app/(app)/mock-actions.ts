"use server";

import { refresh } from "next/cache";
import { updateSettings } from "@/db/settings";
import { requireUserId } from "@/lib/auth/session";
import { localDate } from "@/lib/reports/period";
import { resolveSettings } from "@/lib/reports/types";
import { mockScenario } from "@/lib/snaptrade/mock/config";
import { mockSettings } from "@/lib/snaptrade/mock/settings";

// Server Actions are public POST endpoints, so each one refuses to run unless
// mock data is enabled, which production builds never allow. Both keep the
// time zone detected from the browser.

export async function fillMockSettings(): Promise<void> {
  const scenario = mockScenario();
  if (!scenario) return;
  const userId = await requireUserId();
  await updateSettings(userId, (s) => {
    const year = Number(
      localDate(new Date(), resolveSettings(s).timeZone).slice(0, 4),
    );
    return { ...mockSettings(scenario, year), timeZone: s.timeZone };
  });
  refresh();
}

export async function clearMockSettings(): Promise<void> {
  if (!mockScenario()) return;
  const userId = await requireUserId();
  await updateSettings(userId, (s) => ({ timeZone: s.timeZone }));
  refresh();
}
