import type { IconType } from "react-icons";
import {
  TbAlertTriangle,
  TbAlignLeft,
  TbBinary,
  TbCalendarTime,
  TbChevronRight,
  TbClipboardList,
  TbInfoCircle,
} from "react-icons/tb";
import type { Block, Inline, ReportDocument } from "@/lib/reports/types";

// Reports render as Obsidian shows them, including its dark-theme callout
// colours. The info title is a lighter shade of Obsidian's #027aff so it meets
// WCAG AA.
const callouts: Record<
  "summary" | "info" | "warning",
  { tint: string; title: string; marker: string; Icon: IconType }
> = {
  summary: {
    tint: "bg-[rgb(83_223_221/0.1)]",
    title: "text-[#53dfdd]",
    marker: "text-[#53dfdd]",
    Icon: TbClipboardList,
  },
  info: {
    tint: "bg-[rgb(2_122_255/0.1)]",
    title: "text-[#4a9dff]",
    marker: "text-[#4a9dff]",
    Icon: TbInfoCircle,
  },
  warning: {
    tint: "bg-[rgb(233_151_63/0.1)]",
    title: "text-[#e9973f]",
    marker: "text-[#e9973f]",
    Icon: TbAlertTriangle,
  },
};

function propertyIcon(value: string | number | null): IconType {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return TbCalendarTime;
  }
  if (typeof value === "number" || /^-?\d+(\.\d+)?$/.test(String(value))) {
    return TbBinary;
  }
  return TbAlignLeft;
}

function InlineText({ parts }: { parts: Inline[] }) {
  return parts.map((part, i) =>
    typeof part === "string" ? part : <strong key={i}>{part.bold}</strong>,
  );
}

function Properties({
  frontmatter,
}: {
  frontmatter: ReportDocument["frontmatter"];
}) {
  return (
    <details open className="group">
      <summary className="mb-1.5 inline-flex cursor-pointer list-none items-center gap-1 rounded text-xs font-medium text-muted transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <TbChevronRight
          aria-hidden
          className="transition-transform group-open:rotate-90 motion-reduce:transition-none"
        />
        Properties
      </summary>
      <dl className="text-[13px]">
        {frontmatter.map(([key, value]) => {
          const Icon = propertyIcon(value);
          return (
            <div
              key={key}
              className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-3 rounded px-1.5 py-1 hover:bg-surface sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]"
            >
              <dt className="flex min-w-0 items-center gap-2 text-muted">
                <Icon aria-hidden className="shrink-0" />
                <span className="truncate">{key}</span>
              </dt>
              <dd className="truncate tabular-nums">
                {value === null ? (
                  <span className="text-muted">Empty</span>
                ) : (
                  value
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </details>
  );
}

function NoteBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading":
      return block.level === 1 ? (
        <h3 className="pt-1 text-xl font-bold tracking-tight">{block.text}</h3>
      ) : (
        <h4 className="pt-3 text-base font-semibold">{block.text}</h4>
      );
    case "paragraph":
      return (
        <p className="leading-relaxed">
          <InlineText parts={block.text} />
        </p>
      );
    case "callout": {
      const { tint, title, Icon } = callouts[block.callout];
      return (
        <div className={`rounded px-6 py-3 ${tint}`}>
          <p className={`flex items-start gap-2 font-semibold ${title}`}>
            <Icon aria-hidden className="mt-0.5 shrink-0 text-lg" />
            {block.title}
          </p>
          {block.lines.map((line, i) => (
            <p key={i} className="mt-1 leading-relaxed">
              <InlineText parts={line} />
            </p>
          ))}
        </div>
      );
    }
    case "table": {
      const align = (i: number) =>
        block.columns[i].align === "right" ? "text-right" : "text-left";
      return (
        <div className="overflow-x-auto">
          <table className="border-collapse text-[13px] tabular-nums">
            <thead>
              <tr>
                {block.columns.map((column, i) => (
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
              {block.rows.map((row, r) => (
                <tr key={r}>
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
    case "footer":
      return (
        <>
          <hr className="border-border" />
          <p className="text-muted italic">{block.text}</p>
        </>
      );
  }
}

export function ReportBody({
  document,
  title,
}: {
  document: ReportDocument;
  title: string;
}) {
  return (
    <article className="space-y-4 p-5 text-sm sm:p-7">
      <p className="text-2xl font-bold tracking-tight">{title}</p>
      <Properties frontmatter={document.frontmatter} />
      {document.blocks.map((block, i) => (
        <NoteBlock key={i} block={block} />
      ))}
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
  const callout = line.match(/^> \[!(\w+)\]( .*)$/);
  if (callout) {
    const kind = callout[1] as keyof typeof callouts;
    return (
      <>
        <span className={faint}>{"> "}</span>
        <span className={callouts[kind]?.marker ?? ""}>[!{kind}]</span>
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

export function MarkdownSource({ markdown }: { markdown: string }) {
  const lines = markdown.trimEnd().split("\n");
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
