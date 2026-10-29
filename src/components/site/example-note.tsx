"use client";

import { useState } from "react";
import { TbX } from "react-icons/tb";
import type { ReportDocument } from "@/lib/reports/types";
import { MarkdownSource, ReportBody } from "@/components/report/report-view";
import { fadeIn } from "@/components/ui";
import type { ReportView } from "@/components/view-toggle";

export interface ExampleNoteData {
  title: string;
  document: ReportDocument;
  markdown: string;
}

export function ExampleNote({
  view,
  note,
}: {
  view: ReportView;
  note: ExampleNoteData;
}) {
  const key = `${note.title}-${view}`;
  // The note and view whose end has been reached; another note starts unread.
  const [endReached, setEndReached] = useState<string | null>(null);
  const atEnd = endReached === key;

  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <div className="flex border-b border-border bg-surface text-[13px]">
        <span className="flex items-center gap-2 border-r border-border bg-card px-4 py-2 text-foreground">
          {note.title}
          <TbX aria-hidden className="text-muted" />
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* Keyed so each note or view opens at the top. */}
        <div
          key={key}
          id="example-note"
          onScroll={(event) => {
            const el = event.currentTarget;
            const end = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
            setEndReached(end ? key : null);
          }}
          className={`h-full overflow-y-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] ${fadeIn}`}
        >
          {view === "rendered" ? (
            <ReportBody document={note.document} title={note.title} />
          ) : (
            <MarkdownSource markdown={note.markdown} />
          )}
        </div>
        {/* Shows that the note continues below. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent transition-opacity duration-300 ${
            atEnd ? "opacity-0" : "opacity-100"
          }`}
        />
      </div>
    </div>
  );
}
