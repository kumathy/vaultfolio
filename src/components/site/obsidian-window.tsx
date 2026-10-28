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
import {
  ExampleNote,
  type ExampleNoteData,
  type NoteView,
} from "./example-note";

const FOLDER = "Investing";

const views: { id: NoteView; label: string; Icon: typeof TbEye }[] = [
  { id: "rendered", label: "Rendered", Icon: TbEye },
  { id: "markdown", label: "Markdown", Icon: TbMarkdown },
];

function VaultTree({
  notes,
  current,
  onSelect,
}: {
  notes: string[];
  current: string;
  onSelect: (title: string) => void;
}) {
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
          {FOLDER}
        </li>
        {notes.map((title) => (
          <li key={title} className="ml-5">
            <button
              type="button"
              onClick={() => onSelect(title)}
              aria-current={title === current ? "page" : undefined}
              aria-controls="example-note"
              className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-card hover:text-foreground aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
            >
              <TbFileText aria-hidden className="shrink-0" />
              {title}
            </button>
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

// Notes oldest first; the newest opens by default.
export function ObsidianWindow({ notes }: { notes: ExampleNoteData[] }) {
  const [view, setView] = useState<NoteView>("rendered");
  const [title, setTitle] = useState(notes[notes.length - 1].title);
  const note = notes.find((n) => n.title === title) ?? notes[notes.length - 1];

  return (
    // Caption and toggle share a line above the window when both fit;
    // otherwise the toggle stays above it and the caption moves below, rather
    // than the toggle wrapping onto a line of its own.
    <div className="min-w-0 @container">
      <figure
        aria-label="Example monthly report open in an Obsidian vault"
        className="grid grid-cols-1 gap-3 [grid-template-areas:'toggle'_'window'_'caption'] @[30rem]:grid-cols-[1fr_auto] @[30rem]:[grid-template-areas:'caption_toggle'_'window_window']"
      >
        <div className="justify-self-center [grid-area:toggle] @[30rem]:justify-self-end">
          <ViewToggle view={view} onChange={setView} />
        </div>
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card [grid-area:window]">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span aria-hidden className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span aria-hidden className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span aria-hidden className="h-3 w-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 truncate text-xs text-muted">
              {FOLDER} / {note.title}.md
            </span>
          </div>
          <div className="grid h-[32rem] sm:h-[36rem] sm:grid-cols-[180px_minmax(0,1fr)]">
            <VaultTree
              notes={notes.map((n) => n.title)}
              current={note.title}
              onSelect={setTitle}
            />
            <ExampleNote view={view} note={note} />
          </div>
        </div>
        <figcaption className="self-center text-center text-xs text-muted [grid-area:caption] @[30rem]:text-left">
          Example report · illustrative figures
        </figcaption>
      </figure>
    </div>
  );
}
