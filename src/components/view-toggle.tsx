import { TbEye, TbMarkdown } from "react-icons/tb";

export type ReportView = "rendered" | "markdown";

const views = [
  { id: "rendered", label: "Rendered", Icon: TbEye },
  { id: "markdown", label: "Markdown", Icon: TbMarkdown },
] as const;

// Equal columns let the highlight slide by exactly one button width.
export function ViewToggle({
  label,
  controls,
  view,
  onChange,
}: {
  label: string;
  controls: string;
  view: ReportView;
  onChange: (view: ReportView) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="relative inline-grid grid-cols-[1fr_1fr] rounded-full border border-border bg-card p-1"
    >
      <span
        aria-hidden
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-surface transition-transform duration-200 ease-out motion-reduce:transition-none ${
          view === "markdown" ? "translate-x-full" : ""
        }`}
      />
      {views.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          aria-controls={controls}
          onClick={() => onChange(id)}
          className="relative inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap text-muted transition-colors hover:text-foreground aria-pressed:text-foreground"
        >
          <Icon aria-hidden className="text-sm" />
          {label}
        </button>
      ))}
    </div>
  );
}
