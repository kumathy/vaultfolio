"use client";

import { useEffect, useRef } from "react";

// Dot grid brightened around the pointer, used behind the hero and the closing
// sign-in section. The position is written to CSS variables once per frame, so
// moving the mouse never re-renders React. Touch screens and reduced motion get
// the static grid. `fade` sets which edges fade out: the hero's lower edge, or
// both edges for a section between others.
export function DotBackdrop({ fade = "down" }: { fade?: "down" | "both" }) {
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
      data-fade={fade}
      className="dot-backdrop pointer-events-none absolute inset-0 -z-10 animate-fade-in-slow motion-reduce:animate-none"
    >
      <div className="dot-grid" />
      <div className="dot-grid dot-grid-spot" />
    </div>
  );
}
