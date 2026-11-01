"use client";

import { useEffect } from "react";
import { saveTimeZone } from "@/app/(app)/settings/actions";

// Reports follow the browser's time zone, so months end at local midnight
// rather than the server's. The stored zone is sent only when it differs.
export function TimeZoneSync({ saved }: { saved?: string }) {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && zone !== saved) void saveTimeZone(zone);
  }, [saved]);
  return null;
}
