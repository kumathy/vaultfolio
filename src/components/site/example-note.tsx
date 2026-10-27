import { TbX } from "react-icons/tb";
import type { ReportDocument } from "@/lib/reports/types";
import { MarkdownSource, ReportBody } from "@/components/report/report-view";

export type NoteView = "rendered" | "markdown";

export interface ExampleNoteData {
  title: string;
  document: ReportDocument;
  markdown: string;
}

export function ExampleNote({
  view,
  note,
}: {
  view: NoteView;
  note: ExampleNoteData;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <div className="flex border-b border-border bg-surface text-[13px]">
        <span className="flex items-center gap-2 border-r border-border bg-card px-4 py-2 text-foreground">
          {note.title}
          <TbX aria-hidden className="text-muted" />
        </span>
      </div>

      <div
        id="example-note"
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
      >
        {view === "rendered" ? (
          <ReportBody document={note.document} title={note.title} />
        ) : (
          <MarkdownSource markdown={note.markdown} />
        )}
      </div>
    </div>
  );
}
