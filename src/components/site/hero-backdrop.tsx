"use client";

import { useEffect, useRef } from "react";

// Dot grid behind the hero, brightened around the pointer. The position is
// written to CSS variables once per frame, so moving the mouse never
// re-renders React. Touch screens and reduced motion get the static grid.
export function HeroBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!finePointer || reduceMotion) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const inside =
          event.clientY >= rect.top && event.clientY <= rect.bottom;
        el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
        el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
        el.style.setProperty("--spot-opacity", inside ? "1" : "0");
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
    >
      <div className="dot-grid" />
      <div className="dot-grid dot-grid-spot" />
    </div>
  );
}
