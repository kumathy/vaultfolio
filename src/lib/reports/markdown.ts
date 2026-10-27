import type { Block, Column, Inline, ReportDocument } from "./types";

export function inlineText(parts: Inline[]): string {
  return parts
    .map((part) => (typeof part === "string" ? part : `**${part.bold}**`))
    .join("");
}

const escapeCell = (text: string) => text.replaceAll("|", "\\|");

// Columns are padded to equal width so the raw Markdown reads as a table too.
export function markdownTable(columns: Column[], rows: string[][]): string {
  const cells = rows.map((row) => row.map(escapeCell));
  const widths = columns.map((column, i) =>
    Math.max(column.label.length, 3, ...cells.map((row) => row[i].length)),
  );
  const pad = (text: string, i: number) =>
    columns[i].align === "right"
      ? text.padStart(widths[i])
      : text.padEnd(widths[i]);
  const line = (row: string[]) => `| ${row.map(pad).join(" | ")} |`;
  const divider = `| ${widths
    .map((width, i) =>
      columns[i].align === "right"
        ? `${"-".repeat(width - 1)}:`
        : "-".repeat(width),
    )
    .join(" | ")} |`;
  return [line(columns.map((c) => c.label)), divider, ...cells.map(line)].join(
    "\n",
  );
}

function renderBlock(block: Block): string {
  switch (block.kind) {
    case "heading":
      return `${"#".repeat(block.level)} ${block.text}`;
    case "paragraph":
      return inlineText(block.text);
    case "table":
      return markdownTable(block.columns, block.rows);
    case "callout":
      return [
        `> [!${block.callout}] ${block.title}`,
        ...block.lines.map((line) => `> ${inlineText(line)}`),
      ].join("\n");
    case "footer":
      return `---\n*${block.text}*`;
  }
}

export function renderMarkdown(document: ReportDocument): string {
  const frontmatter = [
    "---",
    ...document.frontmatter.map(
      ([key, value]) => `${key}: ${value === null ? "null" : value}`,
    ),
    "---",
  ].join("\n");
  return `${[frontmatter, ...document.blocks.map(renderBlock)].join("\n\n")}\n`;
}
