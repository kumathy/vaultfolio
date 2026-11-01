"use client";

import { useSyncExternalStore } from "react";
import { TbEye, TbEyeOff } from "react-icons/tb";
import {
  AMOUNTS_ROOT_ID,
  HIDE_AMOUNTS_KEY,
  INLINE_TOGGLE_BOX,
} from "./hide-amounts";

const root = () => document.getElementById(AMOUNTS_ROOT_ID);

function subscribe(onChange: () => void) {
  const element = root();
  if (!element) return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(element, {
    attributes: true,
    attributeFilter: ["data-amounts"],
  });
  return () => observer.disconnect();
}

const isHidden = () => root()?.dataset.amounts === "hidden";

// Every copy reads and writes the same attribute, so toggles on different
// parts of the app stay in step.
// "inline" is an icon beside an amount; "toolbar" matches the report
// toolbar's Copy Markdown button, whose label shows from sm up.
export function HideAmountsToggle({
  variant,
}: {
  variant: "inline" | "toolbar";
}) {
  const hidden = useSyncExternalStore(subscribe, isHidden, () => false);

  function toggle() {
    const element = root();
    if (!element) return;
    if (hidden) delete element.dataset.amounts;
    else element.dataset.amounts = "hidden";
    try {
      if (hidden) localStorage.removeItem(HIDE_AMOUNTS_KEY);
      else localStorage.setItem(HIDE_AMOUNTS_KEY, "1");
    } catch {
      // Without storage the choice lasts until the page is reloaded.
    }
  }

  // The icon and label name the action a click performs.
  const Icon = hidden ? TbEye : TbEyeOff;
  const label = hidden ? "Show amounts" : "Hide amounts";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={
        variant === "inline"
          ? `${INLINE_TOGGLE_BOX} inline-flex items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground`
          : "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
      }
    >
      <Icon
        aria-hidden
        className={variant === "inline" ? "text-base" : "text-sm"}
      />
      {variant === "toolbar" && (
        <span className="hidden sm:inline">{label}</span>
      )}
    </button>
  );
}
