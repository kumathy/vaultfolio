import type { IconType } from "react-icons";
import { TbAlertTriangle, TbCircleCheck } from "react-icons/tb";

// Shared by notices and toasts, so a message looks the same wherever it
// appears. Plain notes have no icon. `label` is read by screen readers.
export const tones: Record<
  "success" | "info" | "warning",
  { Icon: IconType | null; icon: string; label: string }
> = {
  success: { Icon: TbCircleCheck, icon: "text-accent", label: "Done" },
  info: { Icon: null, icon: "", label: "Note" },
  warning: {
    Icon: TbAlertTriangle,
    icon: "text-attention",
    label: "Attention",
  },
};

export type Tone = keyof typeof tones;
