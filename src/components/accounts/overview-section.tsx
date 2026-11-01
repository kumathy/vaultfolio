"use client";

import { useEffect, useRef, useState } from "react";

// Space the four-column grid takes from each column: three 1px gaps shared by
// four columns, and the cards' p-6 padding on both sides.
const GAP_PER_COLUMN = 3 / 4;
const COLUMN_PADDING = 48;

// Switches the overview to stacked rows (data-overview-stacked) when the total
// would not fit on one line in a quarter of the panel. The width comes from an
// invisible copy of the line with the real figures, so hiding amounts does not
// change the layout.
export function OverviewSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [stacked, setStacked] = useState(false);

  useEffect(() => {
    const section = ref.current;
    const grid = section?.firstElementChild;
    const line = section?.querySelector("[data-overview-measure]");
    if (!grid || !(line instanceof HTMLElement)) return;

    const check = () => {
      const column = grid.clientWidth / 4 - GAP_PER_COLUMN - COLUMN_PADDING;
      // Allows for sub-pixel rounding between the two measurements.
      setStacked(line.offsetWidth > column + 0.5);
    };
    // Also fires when the web font loads and the line changes width.
    const observer = new ResizeObserver(check);
    observer.observe(grid);
    observer.observe(line);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-label="Overview"
      data-overview-stacked={stacked || undefined}
      className="@container/overview"
    >
      {children}
    </section>
  );
}
