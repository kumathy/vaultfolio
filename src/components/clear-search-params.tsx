"use client";

import { useEffect } from "react";

// Removes one-time message parameters so a reload or bookmark does not replay them.
export function ClearSearchParams({ keys }: { keys: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const names = keys.split(",").filter((name) => url.searchParams.has(name));
    if (names.length === 0) return;
    for (const name of names) url.searchParams.delete(name);
    window.history.replaceState(null, "", url);
  }, [keys]);

  return null;
}
