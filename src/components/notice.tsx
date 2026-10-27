import { TbAlertTriangle, TbCircleCheck, TbInfoCircle } from "react-icons/tb";

const tones = {
  info: {
    label: "Note",
    Icon: TbInfoCircle,
    box: "border-border bg-surface",
    title: "text-muted",
  },
  success: {
    label: "Done",
    Icon: TbCircleCheck,
    box: "border-positive/25 bg-positive-soft",
    title: "text-positive",
  },
  warning: {
    label: "Attention",
    Icon: TbAlertTriangle,
    box: "border-attention/25 bg-attention-soft",
    title: "text-attention",
  },
} as const;

export type NoticeTone = keyof typeof tones;

// Web counterpart of the report's Obsidian callouts ([!info], [!warning]).
export function Notice({
  tone = "info",
  children,
}: {
  tone?: NoticeTone;
  children: React.ReactNode;
}) {
  const { label, Icon, box, title } = tones[tone];
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${box}`}
    >
      <p className={`flex items-center gap-1.5 font-medium ${title}`}>
        <Icon aria-hidden className="text-base" />
        {label}
      </p>
      <div className="mt-1 text-foreground">{children}</div>
    </div>
  );
}
