import Link from "next/link";
import { TbChevronRight, TbNotebook } from "react-icons/tb";
import { listPluginTokens } from "@/db/plugin";
import { loadSettings } from "@/db/settings";
import { currentUserId } from "@/lib/auth/session";
import { localDate } from "@/lib/reports/period";
import { resolveSettings } from "@/lib/reports/types";

interface Status {
  connected: boolean;
  label: string;
  detail: string;
}

// "today" and "yesterday" read faster in the interface; reports keep ISO dates.
function syncedLabel(date: Date, now: Date, timeZone: string): string {
  const day = localDate(date, timeZone);
  if (day === localDate(now, timeZone)) return "Last synced today";
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (day === localDate(yesterday, timeZone)) return "Last synced yesterday";
  return `Last synced ${day}`;
}

async function loadStatus(): Promise<Status | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const [vaults, settings] = await Promise.all([
    listPluginTokens(userId),
    loadSettings(userId),
  ]);
  if (vaults.length === 0) {
    return {
      connected: false,
      label: "Not connected",
      detail: "Download and connect",
    };
  }
  const lastSync = vaults
    .map((v) => v.lastUsedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return {
    connected: true,
    label:
      vaults.length === 1 ? "Connected" : `${vaults.length} vaults connected`,
    detail: lastSync
      ? syncedLabel(lastSync, new Date(), resolveSettings(settings).timeZone)
      : "Not synced yet",
  };
}

const Dot = ({ connected }: { connected: boolean }) => (
  <span
    aria-hidden
    className={`h-1.5 w-1.5 shrink-0 rounded-full ${connected ? "bg-accent" : "bg-muted"}`}
  />
);

// Two lines inside the sidebar card, which is hidden on narrow screens.
export async function ObsidianSidebarStatus() {
  const status = await loadStatus();
  if (!status) return null;
  return (
    <>
      <span className="mt-2 flex items-center gap-2 text-foreground">
        <Dot connected={status.connected} />
        {status.label}
      </span>
      <span className="mt-0.5 block pl-3.5 text-muted">{status.detail}</span>
    </>
  );
}

// One line for the Reports page, shown at every screen size.
export async function ObsidianStatusLine() {
  const status = await loadStatus();
  if (!status) return null;
  return (
    <Link
      href="/settings#obsidian"
      className="group inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted transition-colors hover:text-foreground"
    >
      <TbNotebook aria-hidden className="text-accent" />
      <span className="text-foreground">Obsidian</span>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1.5">
        <Dot connected={status.connected} />
        {status.label}
      </span>
      <span aria-hidden>·</span>
      <span>{status.detail}</span>
      <TbChevronRight
        aria-hidden
        className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}
