"use client";

import { useSyncExternalStore } from "react";
import { TbEye, TbEyeOff } from "react-icons/tb";
import { AMOUNTS_ROOT_ID, HIDE_AMOUNTS_KEY } from "./hide-amounts";

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

export function HideAmountsToggle() {
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

  const Icon = hidden ? TbEyeOff : TbEye;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label="Hide amounts"
      title={hidden ? "Show amounts" : "Hide amounts"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground aria-pressed:text-accent"
    >
      <Icon aria-hidden className="text-xl" />
    </button>
  );
}
