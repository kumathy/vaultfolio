import { TbFolder } from "react-icons/tb";
import { Amount } from "@/components/amount";
import { INLINE_TOGGLE_BOX } from "@/components/app/hide-amounts";
import { HideAmountsToggle } from "@/components/app/hide-amounts-toggle";
import { card } from "@/components/ui";
import { formatAmount, formatMoney } from "@/lib/format";
import {
  groupByInstitution,
  type AccountView,
  type ConnectionView,
  type MoneyView,
} from "@/lib/view-models/accounts";
import { OverviewSection } from "./overview-section";

// Layout follows the panel's own width (container query), not the screen:
// four columns only when each value fits in full, otherwise stacked rows
// (overview-wide in globals.css).
const valueText =
  "font-semibold tabular-nums overview-wide:mt-2 overview-wide:text-3xl overview-wide:tracking-tight";

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4 bg-card px-5 py-3 overview-wide:block overview-wide:p-6">
      <p className="text-sm text-muted">{label}</p>
      <p className={valueText}>{value}</p>
      <p className="mt-1 hidden text-sm text-muted overview-wide:block">
        {detail}
      </p>
    </div>
  );
}

export function OverviewPanel({
  accounts,
  connections,
  totals,
}: {
  accounts: AccountView[];
  connections: ConnectionView[] | null;
  totals: MoneyView[];
}) {
  const institutions = new Set(accounts.map((a) => a.institution)).size;
  const active = connections?.filter((c) => !c.disabled).length ?? 0;
  // The oldest sync is the one that limits how current the page is.
  const oldestSync = accounts
    .map((a) => a.holdingsSyncedOn)
    .filter((date): date is string => date !== null)
    .sort()[0];
  const [primary, ...others] = totals;

  // A 1px gap over a border-coloured background draws the dividers, so they
  // stay correct for 4 columns, a 2 × 2 grid, or stacked rows.
  return (
    <OverviewSection>
      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border overview-wide:grid-cols-4">
        <div className="relative min-w-0 bg-card p-5 overview-wide:p-6">
          {/* Codes appear only when the page has several currencies: then the
            main one is named here, and other amounts carry their own. */}
          <p className="text-sm text-muted">
            Total value{others.length > 0 && ` · ${primary.currency}`}
          </p>
          {primary ? (
            <>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 tabular-nums">
                <span className="text-3xl font-semibold tracking-tight">
                  <Amount>
                    {formatAmount(primary.amount, primary.currency)}
                  </Amount>
                </span>
                <HideAmountsToggle variant="inline" />
              </p>
              {/* Same line with the real figures, measured by OverviewSection. */}
              <span
                aria-hidden
                data-overview-measure
                className="pointer-events-none invisible absolute top-0 left-0 flex w-max items-center gap-x-4 whitespace-nowrap tabular-nums select-none"
              >
                <span className="text-3xl font-semibold tracking-tight">
                  {formatAmount(primary.amount, primary.currency)}
                </span>
                <span className={INLINE_TOGGLE_BOX} />
              </span>
              {others.map((total) => (
                <p key={total.currency} className="mt-1 tabular-nums">
                  <Amount>{formatMoney(total.amount, total.currency)}</Amount>
                </p>
              ))}
            </>
          ) : (
            <p className="mt-2 text-lg text-muted">Not reported</p>
          )}
          <p className="mt-1 text-sm text-muted">
            {others.length > 0
              ? "Not converted between currencies"
              : "Sum of reported account values"}
          </p>
        </div>
        <Metric
          label="Accounts"
          value={String(accounts.length)}
          detail={
            institutions === 1
              ? "At 1 institution"
              : `At ${institutions} institutions`
          }
        />
        <Metric
          label="Connections"
          value={
            connections === null ? "—" : `${active} of ${connections.length}`
          }
          detail={
            connections === null ? "Status unavailable" : "Active in SnapTrade"
          }
        />
        <Metric
          label="Holdings synced"
          value={oldestSync ?? "Not reported"}
          detail={
            accounts.length > 1
              ? "Oldest across accounts"
              : "Reported by SnapTrade"
          }
        />
      </div>
    </OverviewSection>
  );
}

// Side padding matches the overview panel, so values line up down the page.
const headCell = "px-5 py-3 text-left text-xs font-medium text-muted";
const bodyCell = "border-t border-border px-5 py-3.5 align-middle sm:py-4";

function TypePill({ account }: { account: AccountView }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
        {account.type}
      </span>
      {account.isPaper && (
        <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
          Paper
        </span>
      )}
    </span>
  );
}

// Rows in the currency of the main total omit its code, as reports do for
// their base currency; any other currency keeps its code.
export function AccountGroups({
  accounts,
  mainCurrency,
}: {
  accounts: AccountView[];
  mainCurrency: string | undefined;
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {groupByInstitution(accounts).map((group) => (
        <section
          key={group.institution}
          aria-label={group.institution}
          className={`${card} overflow-hidden`}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
            <h3 className="flex items-center gap-2 font-medium">
              <TbFolder aria-hidden className="text-lg text-accent" />
              {group.institution}
            </h3>
            <span className="text-sm text-muted">
              {group.accounts.length === 1
                ? "1 account"
                : `${group.accounts.length} accounts`}
            </span>
          </header>
          {/* Fixed layout with set widths keeps columns aligned across institution cards. */}
          <table className="w-full table-fixed tabular-nums">
            <caption className="sr-only">
              Accounts at {group.institution}
            </caption>
            <thead>
              <tr>
                <th scope="col" className={headCell}>
                  Account
                </th>
                <th
                  scope="col"
                  className={`${headCell} hidden w-44 sm:table-cell`}
                >
                  Type
                </th>
                <th
                  scope="col"
                  className={`${headCell} hidden w-44 md:table-cell`}
                >
                  Holdings synced
                </th>
                {/* Wide enough for "$123,456.78 CAD" with room to spare. */}
                <th
                  scope="col"
                  className={`${headCell} w-44 text-right sm:w-48`}
                >
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {group.accounts.map((account) => (
                <tr
                  key={account.id}
                  className="transition-colors hover:bg-surface/60"
                >
                  <td className={bodyCell}>
                    <span className="block font-medium break-words sm:inline">
                      {account.name}
                    </span>
                    {account.numberSuffix && (
                      <span className="hidden text-sm text-muted sm:ml-2 sm:inline">
                        ••{account.numberSuffix}
                      </span>
                    )}
                    <span className="mt-1.5 flex flex-wrap items-center gap-2 sm:hidden">
                      <TypePill account={account} />
                      {account.numberSuffix && (
                        <span className="text-sm text-muted">
                          ••{account.numberSuffix}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={`${bodyCell} hidden sm:table-cell`}>
                    <TypePill account={account} />
                  </td>
                  <td className={`${bodyCell} hidden text-sm md:table-cell`}>
                    {account.holdingsSyncedOn ?? (
                      <span className="text-muted">Not reported</span>
                    )}
                  </td>
                  <td className={`${bodyCell} text-right whitespace-nowrap`}>
                    {account.total ? (
                      <Amount>
                        {account.total.currency === mainCurrency
                          ? formatAmount(
                              account.total.amount,
                              account.total.currency,
                            )
                          : formatMoney(
                              account.total.amount,
                              account.total.currency,
                            )}
                      </Amount>
                    ) : (
                      <span className="text-muted">Not reported</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
