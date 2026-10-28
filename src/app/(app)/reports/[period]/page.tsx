import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { TbChevronDown, TbChevronLeft, TbChevronRight } from "react-icons/tb";
import { ObsidianStatusLine } from "@/components/app/obsidian-status";
import { DismissibleDetails } from "@/components/dismissible-details";
import { ReportPreview } from "@/components/report/report-preview";
import { card } from "@/components/ui";
import { loadSettings } from "@/db/settings";
import { deleteAllSessions, requireUserId } from "@/lib/auth/session";
import { availablePeriods } from "@/lib/reports/archive";
import { buildReport } from "@/lib/reports/build-report";
import { parsePeriod, type Period } from "@/lib/reports/period";
import type { RegisteredType } from "@/lib/reports/types";
import { tokenDeps } from "@/lib/snaptrade/config";
import { loadReportAccounts } from "@/lib/snaptrade/report";
import { ReauthorizationRequired } from "@/lib/snaptrade/tokens";
import { dismissRoomPrompt } from "../actions";

export const metadata: Metadata = { title: "Reports" };

const stepLink =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted transition-colors hover:border-muted hover:text-foreground";

function MonthPicker({
  periods,
  current,
}: {
  periods: Period[];
  current: Period;
}) {
  const index = periods.findIndex((p) => p.id === current.id);
  const previous = periods[index - 1];
  const next = periods[index + 1];
  const years = [...new Set(periods.map((p) => p.year))].reverse();

  return (
    <div className="flex items-center gap-2">
      {previous ? (
        <Link
          href={`/reports/${previous.id}`}
          className={stepLink}
          aria-label={`Previous month, ${previous.label}`}
        >
          <TbChevronLeft aria-hidden />
        </Link>
      ) : (
        <span className={`${stepLink} opacity-40`} aria-hidden>
          <TbChevronLeft />
        </span>
      )}
      <DismissibleDetails className="group relative">
        <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:border-muted [&::-webkit-details-marker]:hidden">
          {current.label}
          <TbChevronDown
            aria-hidden
            className="text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div
          className={`${card} absolute left-0 z-20 mt-2 max-h-80 w-56 overflow-y-auto p-2 sm:right-0 sm:left-auto`}
        >
          {years.map((year) => (
            <div key={year} className="py-1">
              {/* The button already names the year; headings only separate several years. */}
              {years.length > 1 && (
                <p className="flex items-center gap-2 px-2 pb-1.5 text-xs font-medium text-muted">
                  {year}
                  <span aria-hidden className="h-px flex-1 bg-border" />
                </p>
              )}
              <ul className="grid grid-cols-3 gap-1">
                {periods
                  .filter((p) => p.year === year)
                  .map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/reports/${p.id}`}
                        aria-current={p.id === current.id ? "page" : undefined}
                        className="block rounded-lg px-2 py-1.5 text-center text-sm text-muted transition-colors hover:bg-surface hover:text-foreground aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
                      >
                        {p.label.slice(0, 3)}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </DismissibleDetails>
      {next ? (
        <Link
          href={`/reports/${next.id}`}
          className={stepLink}
          aria-label={`Next month, ${next.label}`}
        >
          <TbChevronRight aria-hidden />
        </Link>
      ) : (
        <span className={`${stepLink} opacity-40`} aria-hidden>
          <TbChevronRight />
        </span>
      )}
    </div>
  );
}

function RoomPrompt({ types }: { types: RegisteredType[] }) {
  return (
    <div className="flex flex-col gap-3 rounded bg-surface px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="leading-relaxed">
        Remaining {types.join(", ")} room is not calculated. Starting room from
        CRA My Account can be added in settings.
      </p>
      <div className="flex shrink-0 gap-2">
        <Link
          href="/settings#setup"
          className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium whitespace-nowrap text-accent-contrast transition-opacity hover:opacity-90"
        >
          Add starting room
        </Link>
        <form action={dismissRoomPrompt}>
          <button
            type="submit"
            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:bg-card hover:text-foreground"
          >
            Dismiss
          </button>
        </form>
      </div>
    </div>
  );
}

async function ReportContent({
  params,
}: {
  params: PageProps<"/reports/[period]">["params"];
}) {
  const userId = await requireUserId();
  const period = parsePeriod((await params).period);
  if (!period) notFound();

  const settings = await loadSettings(userId);
  const now = new Date();
  let accounts;
  try {
    accounts = await loadReportAccounts(tokenDeps, userId, settings);
  } catch (error) {
    if (!(error instanceof ReauthorizationRequired)) throw error;
    await deleteAllSessions(userId);
    redirect("/?error=reauthorize");
  }

  const periods = availablePeriods(accounts, now, settings);
  if (!periods.some((p) => p.id === period.id)) notFound();
  const report = buildReport({ accounts }, { period, now, settings });

  const unconfigured = [
    ...new Set(
      accounts
        .map((a) => a.registeredType)
        .filter((type): type is RegisteredType => type !== null)
        .filter((type) => settings.room?.[type]?.year !== period.year),
    ),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {period.label}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Monthly investing report, generated from live SnapTrade data.
          </p>
        </div>
        <MonthPicker periods={periods} current={period} />
      </div>
      {unconfigured.length > 0 && !settings.roomPromptDismissed && (
        <RoomPrompt types={unconfigured} />
      )}
      <ReportPreview
        title={period.id}
        year={period.year}
        document={report.document}
        markdown={report.markdown}
      />
      <Suspense fallback={null}>
        <ObsidianStatusLine />
      </Suspense>
    </div>
  );
}

function ReportLoading() {
  return (
    <div
      role="status"
      aria-label="Generating report from SnapTrade"
      className="space-y-6"
    >
      <div className="h-9 w-48 animate-pulse rounded-lg bg-surface" />
      <div className={`${card} h-96 animate-pulse bg-surface`} />
    </div>
  );
}

export default function ReportPage({ params }: PageProps<"/reports/[period]">) {
  return (
    <Suspense fallback={<ReportLoading />}>
      <ReportContent params={params} />
    </Suspense>
  );
}
