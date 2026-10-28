import { card } from "@/components/ui";
import { tones, type Tone } from "./tones";

export type NoticeTone = Exclude<Tone, "success">;

// A message within a page, styled as a card like the rest of the app and
// like toasts. Report callouts keep Obsidian's look instead (report-view.tsx).
export function Notice({
  tone = "info",
  children,
  actions,
}: {
  tone?: NoticeTone;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const { label, Icon, icon } = tones[tone];
  return (
    <div
      className={`${card} flex flex-col gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center`}
    >
      <div className="flex flex-1 items-start gap-3">
        {Icon && (
          <Icon aria-hidden className={`mt-0.5 shrink-0 text-lg ${icon}`} />
        )}
        <div className="leading-relaxed">
          <span className="sr-only">{label}: </span>
          {children}
        </div>
      </div>
      {actions && (
        <div className={`flex shrink-0 gap-2 sm:pl-0 ${Icon ? "pl-8" : ""}`}>
          {actions}
        </div>
      )}
    </div>
  );
}
