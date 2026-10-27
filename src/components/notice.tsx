import { TbAlertTriangle, TbInfoCircle } from "react-icons/tb";

const tones = {
  info: {
    label: "Note",
    Icon: TbInfoCircle,
    box: "bg-surface",
    title: "text-muted",
  },
  warning: {
    label: "Attention",
    Icon: TbAlertTriangle,
    box: "bg-attention-soft",
    title: "text-attention",
  },
} as const;

export type NoticeTone = keyof typeof tones;

// Same shape as an Obsidian callout, the format reports use for [!info] and [!warning].
export function Notice({
  tone = "info",
  children,
}: {
  tone?: NoticeTone;
  children: React.ReactNode;
}) {
  const { label, Icon, box, title } = tones[tone];
  return (
    <div className={`rounded px-6 py-3 text-sm leading-relaxed ${box}`}>
      <p className={`flex items-center gap-2 font-semibold ${title}`}>
        <Icon aria-hidden className="shrink-0 text-lg" />
        {label}
      </p>
      <div className="mt-1 text-foreground">{children}</div>
    </div>
  );
}
