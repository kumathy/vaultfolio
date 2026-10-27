const tones = {
  info: { label: "Note", border: "border-muted" },
  warning: { label: "Attention", border: "border-attention" },
} as const;

// Web counterpart of the report's [!info] and [!warning] callouts.
export function Notice({
  tone = "info",
  children,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
}) {
  const { label, border } = tones[tone];
  return (
    <div
      className={`mt-4 border-l-2 bg-surface px-4 py-3 text-sm leading-relaxed ${border}`}
    >
      <p
        className={`font-medium ${tone === "warning" ? "text-attention" : "text-muted"}`}
      >
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
