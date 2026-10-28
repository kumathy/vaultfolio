import { listPluginTokens } from "@/db/plugin";
import { loadSettings } from "@/db/settings";
import { currentUserId } from "@/lib/auth/session";
import { localDate } from "@/lib/reports/period";
import { resolveSettings } from "@/lib/reports/types";

interface Status {
  connected: boolean;
  text: string;
}

// "today" and "yesterday" read faster in the interface; reports keep ISO dates.
function syncedLabel(date: Date, now: Date, timeZone: string): string {
  const day = localDate(date, timeZone);
  if (day === localDate(now, timeZone)) return "synced today";
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (day === localDate(yesterday, timeZone)) return "synced yesterday";
  return `synced ${day}`;
}

const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);

async function loadStatus(): Promise<Status | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const [vaults, settings] = await Promise.all([
    listPluginTokens(userId),
    loadSettings(userId),
  ]);
  if (vaults.length === 0) return { connected: false, text: "Not connected" };
  const lastSync = vaults
    .map((v) => v.lastUsedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const synced = lastSync
    ? syncedLabel(lastSync, new Date(), resolveSettings(settings).timeZone)
    : "not synced yet";
  return {
    connected: true,
    text:
      vaults.length === 1
        ? capitalize(synced)
        : `${vaults.length} vaults · ${synced}`,
  };
}

// One status line under Obsidian in the sidebar's Connections group.
export async function ObsidianSidebarStatus() {
  const status = await loadStatus();
  if (!status) return null;
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.connected ? "bg-accent" : "border border-muted"}`}
      />
      {status.text}
    </span>
  );
}
