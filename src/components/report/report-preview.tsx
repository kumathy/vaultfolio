"use client";

import { useState } from "react";
import {
  TbCheck,
  TbCopy,
  TbDownload,
  TbEye,
  TbFileZip,
  TbMarkdown,
} from "react-icons/tb";
import { buttonSecondary, card, compact } from "@/components/ui";
import type { ReportDocument } from "@/lib/reports/types";
import { MarkdownSource, ReportBody } from "./report-view";

type View = "rendered" | "markdown";

const views: { id: View; label: string; Icon: typeof TbEye }[] = [
  { id: "rendered", label: "Rendered", Icon: TbEye },
  { id: "markdown", label: "Markdown", Icon: TbMarkdown },
];

const smallButton = compact(buttonSecondary);

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
      <button type="button" onClick={copy} className={smallButton}>
        {state === "copied" ? (
          <TbCheck aria-hidden className="text-accent" />
        ) : (
          <TbCopy aria-hidden />
        )}
        {state === "copied" ? "Copied" : "Copy Markdown"}
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Report view"
          className="inline-flex self-start rounded-full border border-border bg-card p-1"
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

        <div className="flex flex-wrap gap-2">
          <CopyButton markdown={markdown} />
          <a
            href={`/reports/${title}/markdown?download=1`}
            className={smallButton}
            download
          >
            <TbDownload aria-hidden />
            {title}.md
          </a>
          <a href={`/reports/archive/${year}`} className={smallButton} download>
            <TbFileZip aria-hidden />
            {year} .zip
          </a>
        </div>
      </div>

      <div id="report-content" className={`${card} overflow-hidden`}>
        {view === "rendered" ? (
          <ReportBody document={document} title={title} />
        ) : (
          <MarkdownSource markdown={markdown} />
        )}
      </div>
    </section>
  );
}
