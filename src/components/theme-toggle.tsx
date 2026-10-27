"use client";

import { useTheme } from "next-themes";
import { flushSync } from "react-dom";
import { TbMoon, TbSun } from "react-icons/tb";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  function toggle() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    const apply = () => flushSync(() => setTheme(next));
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!document.startViewTransition || reduceMotion) {
      apply();
      return;
    }
    document.startViewTransition(apply);
  }

  // Icons switch through the `dark:` variant, so server and client markup match.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch colour theme"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
    >
      <TbMoon aria-hidden className="dark:hidden" />
      <TbSun aria-hidden className="hidden dark:block" />
    </button>
  );
}
