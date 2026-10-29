"use client";

import { useState } from "react";
import { TbCheck, TbCopy, TbFileZip } from "react-icons/tb";
import { card, fadeIn } from "@/components/ui";
import { ViewToggle, type ReportView } from "@/components/view-toggle";
import type { ReportDocument } from "@/lib/reports/types";
import { MarkdownSource, ReportBody } from "./report-view";

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
  const copied = state === "copied";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy Markdown"
        title="Copy Markdown"
        className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
      >
        <span
          key={copied ? "copied" : "idle"}
          className={`inline-flex items-center gap-1.5 ${fadeIn}`}
        >
          {copied ? (
            <TbCheck aria-hidden className="text-sm text-accent" />
          ) : (
            <TbCopy aria-hidden className="text-sm" />
          )}
          <span className="hidden sm:inline">
            {copied ? "Copied" : "Copy Markdown"}
          </span>
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
  const [view, setView] = useState<ReportView>("rendered");

  return (
    <section aria-label={`Report ${title}`} className="space-y-4">
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-3 py-2">
          <ViewToggle
            label="Report view"
            controls="report-content"
            view={view}
            onChange={setView}
          />
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
