import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { loadSettings } from "@/db/settings";
import { requireUserId } from "@/lib/auth/session";
import { localDate, periodOf } from "@/lib/reports/period";
import { resolveSettings } from "@/lib/reports/types";

export const metadata: Metadata = { title: "Reports" };

async function RedirectToCurrentMonth() {
  const userId = await requireUserId();
  const { timeZone } = resolveSettings(await loadSettings(userId));
  redirect(`/reports/${periodOf(localDate(new Date(), timeZone))}`);
  return null;
}

export default function ReportsIndex() {
  return (
    <Suspense fallback={null}>
      <RedirectToCurrentMonth />
    </Suspense>
  );
}
