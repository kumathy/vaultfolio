import {
  TbChevronDown,
  TbChevronRight,
  TbClipboardList,
  TbFileText,
  TbFolder,
  TbFolderOpen,
  TbInfoCircle,
  TbX,
} from "react-icons/tb";

const reports = ["2026-08", "2026-09", "2026-10"];
const current = "2026-10";

const properties: [string, string][] = [
  ["type", "investing-report"],
  ["period", "2026-10"],
  ["portfolio_value", "4312.55"],
  ["total_contributed", "3900.00"],
  ["plan_status", "on-track"],
  ["tfsa_room_remaining", "2100.00"],
];

const growth: [string, string][] = [
  ["Total contributed", "$3,900.00"],
  ["Current value", "$4,312.55"],
  ["Net growth", "+$412.55"],
];

function VaultTree() {
  return (
    <div className="hidden border-r border-border bg-surface p-3 text-[13px] sm:block">
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
          Investing
        </li>
        {reports.map((name) => (
          <li
            key={name}
            className={`ml-5 flex items-center gap-1.5 rounded-md px-2 py-1 ${
              name === current ? "bg-violet-soft text-violet" : ""
            }`}
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

function Note() {
  return (
    <div className="min-w-0">
      <div className="flex border-b border-border bg-surface text-[13px]">
        <span className="flex items-center gap-2 border-r border-border bg-card px-4 py-2 text-foreground">
          {current}
          <TbX aria-hidden className="text-muted" />
        </span>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 border-b border-border pb-5 text-[13px] tabular-nums">
          {properties.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-muted">{key}</dt>
              <dd className="truncate">
                {key === "plan_status" ? (
                  <span className="rounded-full bg-violet-soft px-2 py-0.5 text-violet">
                    {value}
                  </span>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <h3 className="text-xl font-semibold tracking-tight">
          Investing Report — October 2026
        </h3>

        <div className="rounded-lg border-l-2 border-violet bg-violet-soft px-4 py-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-violet">
            <TbClipboardList aria-hidden />
            Summary
          </p>
          <p className="mt-1 leading-relaxed">
            Monthly plan executed on schedule. Portfolio value{" "}
            <strong>$4,312.55</strong> against <strong>$3,900.00</strong>{" "}
            contributed.
          </p>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">
            Contributions and growth
          </h4>
          <table className="w-full text-sm tabular-nums">
            <tbody>
              {growth.map(([label, amount]) => (
                <tr key={label} className="border-t border-border">
                  <td className="py-1.5 text-muted">{label}</td>
                  <td className="py-1.5 text-right">{amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border-l-2 border-muted bg-surface px-4 py-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-muted">
            <TbInfoCircle aria-hidden />
            Data notes
          </p>
          <p className="mt-1 leading-relaxed">
            Transactions are reported by the brokerage with a one-day delay.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ObsidianWindow() {
  return (
    <figure className="min-w-0">
      <div
        role="img"
        aria-label="Example monthly report open in an Obsidian vault"
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 truncate text-xs text-muted">
            Investing / {current}.md
          </span>
        </div>
        <div className="grid sm:grid-cols-[180px_1fr]">
          <VaultTree />
          <Note />
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted">
        Example report · illustrative figures
      </figcaption>
    </figure>
  );
}
