import type { IconType } from "react-icons";
import {
  TbAlignLeft,
  TbBinary,
  TbCalendarTime,
  TbChevronRight,
  TbClipboardList,
  TbInfoCircle,
  TbX,
} from "react-icons/tb";
import {
  exampleReport,
  exampleReportMarkdown,
  type Inline,
  type Property,
  type Table,
} from "./example-report";

// Obsidian's dark-theme callout colours, used only inside this mock-up. The info
// title is a lighter shade of Obsidian's #027aff so it meets WCAG AA.
const callouts = {
  summary: {
    tint: "bg-[rgb(83_223_221/0.1)]",
    title: "text-[#53dfdd]",
    Icon: TbClipboardList,
  },
  info: {
    tint: "bg-[rgb(2_122_255/0.1)]",
    title: "text-[#4a9dff]",
    Icon: TbInfoCircle,
  },
} as const;

const propertyIcons: Record<Property["kind"], IconType> = {
  text: TbAlignLeft,
  number: TbBinary,
  datetime: TbCalendarTime,
};

function InlineText({ parts }: { parts: Inline[] }) {
  return parts.map((part, i) =>
    typeof part === "string" ? part : <strong key={i}>{part.bold}</strong>,
  );
}

function Callout({
  kind,
  title,
  children,
}: {
  kind: keyof typeof callouts;
  title: string;
  children: React.ReactNode;
}) {
  const { tint, title: titleColour, Icon } = callouts[kind];
  return (
    <div className={`rounded px-6 py-3 ${tint}`}>
      <p className={`flex items-center gap-2 font-semibold ${titleColour}`}>
        <Icon aria-hidden className="shrink-0 text-lg" />
        {title}
      </p>
      <div className="mt-1 leading-relaxed">{children}</div>
    </div>
  );
}

function NoteTable({ table }: { table: Table }) {
  const align = (i: number) =>
    table.columns[i].align === "right" ? "text-right" : "text-left";
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[13px] tabular-nums">
        <thead>
          <tr>
            {table.columns.map((column, i) => (
              <th
                key={column.label}
                className={`border border-border px-2.5 py-1 font-semibold whitespace-nowrap ${align(i)}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={`border border-border px-2.5 py-1 whitespace-nowrap ${align(i)}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReadingView() {
  const report = exampleReport;
  return (
    <article className="space-y-5 p-5 text-sm sm:p-7">
      <p className="text-2xl font-bold tracking-tight">{report.fileName}</p>

      <details open className="group">
        <summary className="mb-1.5 inline-flex cursor-pointer list-none items-center gap-1 rounded text-xs font-medium text-muted transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          <TbChevronRight
            aria-hidden
            className="transition-transform group-open:rotate-90 motion-reduce:transition-none"
          />
          Properties
        </summary>
        <dl className="text-[13px]">
          {report.properties.map(({ key, value, kind }) => {
            const Icon = propertyIcons[kind];
            return (
              <div
                key={key}
                className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-3 rounded px-1.5 py-1 hover:bg-surface sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]"
              >
                <dt className="flex min-w-0 items-center gap-2 text-muted">
                  <Icon aria-hidden className="shrink-0" />
                  <span className="truncate">{key}</span>
                </dt>
                <dd className="truncate tabular-nums">{value}</dd>
              </div>
            );
          })}
        </dl>
      </details>

      <h3 className="pt-1 text-xl font-bold tracking-tight">{report.title}</h3>

      <Callout kind="summary" title="Summary">
        <InlineText parts={report.summary} />
      </Callout>

      {report.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h4 className="pt-2 text-base font-semibold">{section.heading}</h4>
          {section.tables.map((table, i) => (
            <NoteTable key={i} table={table} />
          ))}
          {section.note && <p className="text-muted">{section.note}</p>}
        </section>
      ))}

      <Callout kind="info" title="Data notes">
        {report.dataNotes}
      </Callout>

      <hr className="border-border" />
      <p className="text-muted italic">{report.footer}</p>
    </article>
  );
}

const faint = "text-muted/60";

function highlight(line: string, inFrontmatter: boolean): React.ReactNode {
  if (line === "---") return <span className={faint}>{line}</span>;
  if (inFrontmatter) {
    const [key, ...rest] = line.split(": ");
    return (
      <>
        <span className="text-muted">{key}</span>
        <span className={faint}>: </span>
        {rest.join(": ")}
      </>
    );
  }
  const heading = line.match(/^(#+ )(.*)$/);
  if (heading) {
    return (
      <>
        <span className={faint}>{heading[1]}</span>
        <span className="font-bold">{heading[2]}</span>
      </>
    );
  }
  const callout = line.match(/^> (\[!\w+\])( .*)$/);
  if (callout) {
    return (
      <>
        <span className={faint}>{"> "}</span>
        <span className="text-[#53dfdd]">{callout[1]}</span>
        <span className="font-bold">{callout[2]}</span>
      </>
    );
  }
  if (line.startsWith("|")) {
    return line.split(/(\|)/).map((part, i) =>
      part === "|" ? (
        <span key={i} className={faint}>
          |
        </span>
      ) : (
        part
      ),
    );
  }
  return line.split(/(\*\*[^*]+\*\*|^> |^\*|\*$)/).map((part, i) => {
    if (part === "> " || part === "*") {
      return (
        <span key={i} className={faint}>
          {part}
        </span>
      );
    }
    if (part.startsWith("**")) {
      return (
        <span key={i}>
          <span className={faint}>**</span>
          <span className="font-bold">{part.slice(2, -2)}</span>
          <span className={faint}>**</span>
        </span>
      );
    }
    return part;
  });
}

function SourceView() {
  const lines = exampleReportMarkdown().split("\n");
  const frontmatterEnd = lines.indexOf("---", 1);
  return (
    <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-6 sm:p-7">
      <code>
        {lines.map((line, i) => (
          <span
            key={i}
            className={`block min-h-6 ${
              line.startsWith("|")
                ? "whitespace-pre"
                : "whitespace-pre-wrap [overflow-wrap:anywhere]"
            }`}
          >
            {highlight(line, i > 0 && i < frontmatterEnd)}
          </span>
        ))}
      </code>
    </pre>
  );
}

export type NoteView = "rendered" | "markdown";

export function ExampleNote({ view }: { view: NoteView }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <div className="flex border-b border-border bg-surface text-[13px]">
        <span className="flex items-center gap-2 border-r border-border bg-card px-4 py-2 text-foreground">
          {exampleReport.fileName}
          <TbX aria-hidden className="text-muted" />
        </span>
      </div>

      <div
        id="example-note"
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
      >
        {view === "rendered" ? <ReadingView /> : <SourceView />}
      </div>
    </div>
  );
}
