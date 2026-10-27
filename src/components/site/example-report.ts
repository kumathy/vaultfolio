// Illustrative figures from the reference report in CLAUDE.md. The reading
// view and the Markdown view are both generated from this data.

export type Inline = string | { bold: string };

export interface Column {
  label: string;
  align?: "left" | "right";
}

export interface Table {
  columns: Column[];
  rows: string[][];
}

export interface Section {
  id: string;
  heading: string;
  tables: Table[];
  note?: string;
}

export interface Property {
  key: string;
  value: string;
  kind: "text" | "number" | "datetime";
}

export const exampleReport = {
  fileName: "2026-10",
  folder: "Investing",
  properties: [
    { key: "type", value: "investing-report", kind: "text" },
    { key: "period", value: "2026-10", kind: "text" },
    {
      key: "generated_at",
      value: "2026-10-27T09:14:00-03:00",
      kind: "datetime",
    },
    { key: "base_currency", value: "CAD", kind: "text" },
    { key: "portfolio_value", value: "4312.55", kind: "number" },
    { key: "total_contributed", value: "3900.00", kind: "number" },
    { key: "net_growth", value: "412.55", kind: "number" },
    { key: "plan_status", value: "on-track", kind: "text" },
    { key: "tfsa_room_remaining", value: "2100.00", kind: "number" },
    { key: "distributions_ttm", value: "38.20", kind: "number" },
  ] satisfies Property[],
  title: "Investing Report — October 2026",
  summary: [
    "Monthly plan executed on schedule. Portfolio value: ",
    { bold: "$4,312.55" },
    " against ",
    { bold: "$3,900.00" },
    " contributed (net growth ",
    { bold: "+$412.55" },
    "). TFSA room remaining for 2026: ",
    { bold: "$2,100.00" },
    ".",
  ] satisfies Inline[],
  sections: [
    {
      id: "plan-execution",
      heading: "Plan execution",
      tables: [
        {
          columns: [
            { label: "Check" },
            { label: "Status" },
            { label: "Detail" },
          ],
          rows: [
            ["Deposit received", "On track", "$300.00 on 2026-10-01"],
            [
              "Invested per plan",
              "On track",
              "9 units XEQT purchased on 2026-10-02",
            ],
            ["Uninvested cash", "On track", "$4.12 (below $25.00 threshold)"],
          ],
        },
      ],
    },
    {
      id: "contributions-and-growth",
      heading: "Contributions and growth",
      tables: [
        {
          columns: [{ label: "Measure" }, { label: "Amount", align: "right" }],
          rows: [
            ["Total contributed", "$3,900.00"],
            ["Current value", "$4,312.55"],
            ["Net growth", "+$412.55"],
          ],
        },
      ],
    },
    {
      id: "registered-account-room",
      heading: "Registered account room — 2026",
      tables: [
        {
          columns: [
            { label: "Account" },
            { label: "Available at Jan 1", align: "right" },
            { label: "Contributed YTD", align: "right" },
            { label: "Remaining", align: "right" },
            { label: "Projected at Dec 31", align: "right" },
            { label: "Status" },
          ],
          rows: [
            [
              "TFSA",
              "$7,000.00",
              "$4,900.00",
              "$2,100.00",
              "$1,500.00",
              "On track",
            ],
          ],
        },
      ],
      note: "Projection assumes the scheduled $300.00 monthly contribution continues through December.",
    },
    {
      id: "distributions",
      heading: "Distributions",
      tables: [
        {
          columns: [
            { label: "Paid on" },
            { label: "Symbol" },
            { label: "Per unit", align: "right" },
            { label: "Amount", align: "right" },
          ],
          rows: [
            ["2026-09-29", "XEQT", "$0.1000", "$11.40"],
            ["2026-06-27", "XEQT", "$0.0900", "$9.45"],
          ],
        },
        {
          columns: [{ label: "Measure" }, { label: "Amount", align: "right" }],
          rows: [
            ["Trailing 12 months", "$38.20"],
            ["Next 12 months (Estimate)", "~$46.00"],
          ],
        },
      ],
      note: "Estimate method: trailing-12-month distributions per unit × units currently held.",
    },
  ] satisfies Section[],
  dataNotes: "Transactions are reported by the brokerage with a one-day delay.",
  footer:
    "Data retrieved 2026-10-27 09:14 ADT via SnapTrade. For information only. Not financial advice.",
};

const inlineToMarkdown = (parts: Inline[]) =>
  parts
    .map((part) => (typeof part === "string" ? part : `**${part.bold}**`))
    .join("");

function tableToMarkdown({ columns, rows }: Table): string {
  const widths = columns.map((column, i) =>
    Math.max(column.label.length, 3, ...rows.map((row) => row[i].length)),
  );
  const pad = (text: string, i: number) =>
    columns[i].align === "right"
      ? text.padStart(widths[i])
      : text.padEnd(widths[i]);
  const line = (cells: string[]) => `| ${cells.map(pad).join(" | ")} |`;
  const divider = `| ${widths
    .map((width, i) =>
      columns[i].align === "right"
        ? `${"-".repeat(width - 1)}:`
        : "-".repeat(width),
    )
    .join(" | ")} |`;
  return [line(columns.map((c) => c.label)), divider, ...rows.map(line)].join(
    "\n",
  );
}

export function exampleReportMarkdown(report = exampleReport): string {
  const frontmatter = [
    "---",
    ...report.properties.map((p) => `${p.key}: ${p.value}`),
    "---",
  ].join("\n");

  const sections = report.sections.map((section) =>
    [
      `## ${section.heading}`,
      ...section.tables.map(tableToMarkdown),
      ...(section.note ? [section.note] : []),
    ].join("\n\n"),
  );

  return [
    frontmatter,
    `# ${report.title}`,
    `> [!summary] Summary\n> ${inlineToMarkdown(report.summary)}`,
    ...sections,
    `> [!info] Data notes\n> ${report.dataNotes}`,
    `---\n*${report.footer}*`,
  ].join("\n\n");
}
