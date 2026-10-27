"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { TbCircleCheck, TbInfoCircle, TbX } from "react-icons/tb";

const DURATION_MS = 5000;

const tones = {
  success: { Icon: TbCircleCheck, icon: "text-accent" },
  info: { Icon: TbInfoCircle, icon: "text-muted" },
} as const;

export type ToastTone = keyof typeof tones;

const subscribe = () => () => {};

export function Toast({
  message,
  tone = "success",
}: {
  message: string;
  tone?: ToastTone;
}) {
  // Screen readers announce changes to a live region, not its initial
  // content, so the message is inserted after hydration.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const { Icon, icon } = tones[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:justify-end sm:p-6"
    >
      {mounted && open && (
        <div className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-2xl border border-border bg-card py-3 pr-3 pl-4 text-sm motion-reduce:animate-none">
          <Icon aria-hidden className={`mt-0.5 shrink-0 text-lg ${icon}`} />
          <p className="flex-1 leading-relaxed">{message}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Dismiss notification"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <TbX aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
