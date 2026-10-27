"use client";

import { useState } from "react";
import {
  TbChevronDown,
  TbChevronRight,
  TbEye,
  TbFileText,
  TbFolder,
  TbFolderOpen,
  TbMarkdown,
} from "react-icons/tb";
import { ExampleNote, type NoteView } from "./example-note";
import { exampleReport } from "./example-report";

const reports = ["2026-08", "2026-09", exampleReport.fileName];

const views: { id: NoteView; label: string; Icon: typeof TbEye }[] = [
  { id: "rendered", label: "Rendered", Icon: TbEye },
  { id: "markdown", label: "Markdown", Icon: TbMarkdown },
];

function VaultTree() {
  return (
    <div className="hidden overflow-hidden border-r border-border bg-surface p-3 text-[13px] sm:block">
      <p className="px-2 pb-2 text-xs font-medium text-muted">Vault</p>
      <ul className="space-y-0.5 text-muted">
        <li className="flex items-center gap-1.5 px-2 py-1">
          <TbChevronRight aria-hidden className="shrink-0" />
          <TbFolder aria-hidden className="shrink-0" />
          Daily
        </li>
        <li className="flex items-center gap-1.5 px-2 py-1 text-foreground">
          <TbChevronDown aria-hidden className="shrink-0" />
          <TbFolderOpen aria-hidden className="shrink-0" />
          {exampleReport.folder}
        </li>
        {reports.map((name) => (
          <li
            key={name}
            aria-current={name === exampleReport.fileName ? "page" : undefined}
            className="ml-5 flex items-center gap-1.5 rounded-md px-2 py-1 aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
          >
            <TbFileText aria-hidden className="shrink-0" />
            {name}
          </li>
        ))}
        <li className="flex items-center gap-1.5 px-2 py-1">
          <TbChevronRight aria-hidden className="shrink-0" />
          <TbFolder aria-hidden className="shrink-0" />
          Projects
        </li>
      </ul>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: NoteView;
  onChange: (view: NoteView) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Example report view"
      className="inline-flex rounded-full border border-border bg-card p-1"
    >
      {views.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          aria-controls="example-note"
          onClick={() => onChange(id)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap text-muted transition-colors hover:text-foreground aria-pressed:bg-surface aria-pressed:text-foreground"
        >
          <Icon aria-hidden className="text-sm" />
          {label}
        </button>
      ))}
    </div>
  );
}

export function ObsidianWindow() {
  const [view, setView] = useState<NoteView>("rendered");

  return (
    <figure
      aria-label="Example monthly report open in an Obsidian vault"
      className="min-w-0"
    >
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted">
          Example report · illustrative figures
        </span>
        <ViewToggle view={view} onChange={setView} />
      </figcaption>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span aria-hidden className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span aria-hidden className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span aria-hidden className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 truncate text-xs text-muted">
            {exampleReport.folder} / {exampleReport.fileName}.md
          </span>
        </div>
        <div className="grid h-[32rem] sm:h-[36rem] sm:grid-cols-[180px_minmax(0,1fr)]">
          <VaultTree />
          <ExampleNote view={view} />
        </div>
      </div>
    </figure>
  );
}
