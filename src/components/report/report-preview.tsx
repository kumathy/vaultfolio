"use client";

import { useState } from "react";
import { TbCheck, TbCopy, TbEye, TbFileZip, TbMarkdown } from "react-icons/tb";
import { card } from "@/components/ui";
import type { ReportDocument } from "@/lib/reports/types";
import { MarkdownSource, ReportBody } from "./report-view";

type View = "rendered" | "markdown";

const views: { id: View; label: string; Icon: typeof TbEye }[] = [
  { id: "rendered", label: "Rendered", Icon: TbEye },
  { id: "markdown", label: "Markdown", Icon: TbMarkdown },
];

function CopyButton({ markdown }: { markdown: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy Markdown"
        title="Copy Markdown"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted transition-colors hover:bg-card hover:text-foreground"
      >
        {state === "copied" ? (
          <TbCheck aria-hidden className="text-sm text-accent" />
        ) : (
          <TbCopy aria-hidden className="text-sm" />
        )}
        <span className="hidden sm:inline">
          {state === "copied" ? "Copied" : "Copy Markdown"}
        </span>
      </button>
      <span role="status" className="sr-only">
        {state === "copied"
          ? "Markdown copied to the clipboard."
          : state === "failed"
            ? "The browser blocked clipboard access."
            : ""}
      </span>
    </>
  );
}

export function ReportPreview({
  title,
  year,
  document,
  markdown,
}: {
  title: string;
  year: number;
  document: ReportDocument;
  markdown: string;
}) {
  const [view, setView] = useState<View>("rendered");

  return (
    <section aria-label={`Report ${title}`} className="space-y-4">
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-3 py-2">
          <div
            role="group"
            aria-label="Report view"
            className="inline-flex rounded-full border border-border bg-card p-1"
          >
            {views.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                aria-controls="report-content"
                onClick={() => setView(id)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap text-muted transition-colors hover:text-foreground aria-pressed:bg-surface aria-pressed:text-foreground"
              >
                <Icon aria-hidden className="text-sm" />
                {label}
              </button>
            ))}
          </div>
          <CopyButton markdown={markdown} />
        </div>

        <div id="report-content">
          {view === "rendered" ? (
            <ReportBody document={document} title={title} />
          ) : (
            <MarkdownSource markdown={markdown} />
          )}
        </div>
      </div>

      <a
        href={`/reports/archive/${year}`}
        download
        className="inline-flex items-center gap-1.5 text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <TbFileZip aria-hidden />
        Export {year} as Markdown files (.zip)
      </a>
    </section>
  );
}
