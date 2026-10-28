"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { TbX } from "react-icons/tb";
import { tones, type Tone } from "./tones";

const DURATION_MS = 5000;
// Matches --animate-toast-out in globals.css.
const EXIT_MS = 200;

export type ToastTone = Tone;

const subscribe = () => () => {};

export function Toast({
  message,
  tone = "success",
}: {
  message: string;
  tone?: ToastTone;
}) {
  // The portal needs document.body, which exists only after hydration.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  // "leaving" plays the exit animation before the toast is removed.
  const [phase, setPhase] = useState<"open" | "leaving" | "closed">("open");
  const close = () =>
    setPhase((current) => (current === "open" ? "leaving" : current));
  // Screen readers announce changes to a live region, not the content it
  // appears with, so the message is added a frame after the region.
  const [ready, setReady] = useState(false);

  // Warnings explain what failed and what to do next, so they stay until
  // dismissed rather than disappearing before they are read.
  const persistent = tone === "warning";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    const timer = persistent
      ? undefined
      : window.setTimeout(close, DURATION_MS);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [persistent]);

  // A timer rather than animationend, which never fires when reduced motion
  // turns the animation off.
  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = window.setTimeout(() => setPhase("closed"), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const { Icon, icon, label } = tones[tone];
  if (!mounted) return null;

  // Rendered into <body>: a fixed element inside a transformed ancestor (such
  // as the hero's entrance animation) would be positioned against that
  // ancestor instead of the viewport.
  return createPortal(
    <div
      role={persistent ? "alert" : "status"}
      aria-live={persistent ? "assertive" : "polite"}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:p-6"
    >
      {ready && phase !== "closed" && (
        <div
          className={`pointer-events-auto flex w-full max-w-sm ${phase === "leaving" ? "animate-toast-out" : "animate-toast-in"} items-start gap-3 rounded-2xl border border-border bg-card py-3 pr-3 pl-4 text-sm motion-reduce:animate-none`}
        >
          {Icon && (
            <Icon aria-hidden className={`mt-0.5 shrink-0 text-lg ${icon}`} />
          )}
          <p className="flex-1 leading-relaxed">
            <span className="sr-only">{label}: </span>
            {message}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss notification"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <TbX aria-hidden />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
