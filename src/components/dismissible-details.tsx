"use client";

import { useEffect, useRef } from "react";

// A <details> element that also closes on an outside click, on Escape, and
// after a link inside it is followed. Without JavaScript it still opens and
// closes from its summary.
export function DismissibleDetails({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;

    const close = () => {
      details.open = false;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (details.open && !details.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !details.open) return;
      close();
      details.querySelector("summary")?.focus();
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element).closest("a")) close();
    };

    const summary = details.querySelector(":scope > summary");
    const panel = summary?.nextElementSibling;
    const onSummaryClick = (event: Event) => {
      if (details.open || !summary || !(panel instanceof HTMLElement)) return;
      event.preventDefault();
      details.open = true;

      // `data-above` lets the panel's styles place it above the summary when
      // it would overflow the bottom of the viewport and fits above.
      delete details.dataset.above;
      const box = panel.getBoundingClientRect();
      const anchor = summary.getBoundingClientRect();
      const above =
        box.bottom > window.innerHeight &&
        anchor.top - (box.top - anchor.bottom) - box.height >= 0;
      if (above) details.dataset.above = "";

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      panel.animate(
        {
          opacity: [0, 1],
          transform: [`translateY(${above ? 4 : -4}px)`, "translateY(0)"],
        },
        { duration: 150, easing: "ease-out" },
      );
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    details.addEventListener("click", onClick);
    summary?.addEventListener("click", onSummaryClick);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      details.removeEventListener("click", onClick);
      summary?.removeEventListener("click", onSummaryClick);
    };
  }, []);

  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  );
}
