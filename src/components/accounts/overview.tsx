import { TbFolder } from "react-icons/tb";
import { card } from "@/components/ui";
import { formatAmount, formatMoney } from "@/lib/format";
import {
  groupByInstitution,
  type AccountView,
  type ConnectionView,
  type MoneyView,
} from "@/lib/view-models/accounts";

// Layout follows the panel's own width (container query), not the screen:
// four columns only when each value fits in full, otherwise stacked rows.
const valueText =
  "font-semibold tabular-nums @4xl:mt-2 @4xl:text-3xl @4xl:tracking-tight";

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
    <div className="flex min-w-0 items-baseline justify-between gap-4 bg-card px-5 py-3 @4xl:block @4xl:p-6">
      <p className="text-sm text-muted">{label}</p>
      <p className={valueText}>{value}</p>
      <p className="mt-1 hidden text-sm text-muted @4xl:block">{detail}</p>
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
    <section aria-label="Overview" className="@container">
      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border @4xl:grid-cols-4">
        <div className="min-w-0 bg-card p-5 @4xl:p-6">
          <p className="text-sm text-muted">Total value</p>
          {primary ? (
            <>
              <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
                <span className="text-3xl font-semibold tracking-tight">
                  {formatAmount(primary.amount, primary.currency)}
                </span>
                <span className="text-sm font-medium text-muted">
                  {primary.currency}
                </span>
              </p>
              {others.map((total) => (
                <p key={total.currency} className="mt-1 tabular-nums">
                  {formatMoney(total.amount, total.currency)}
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
    </section>
  );
}

const headCell = "px-4 py-3 text-left text-xs font-medium text-muted sm:px-5";
const bodyCell =
  "border-t border-border px-4 py-3.5 align-middle sm:px-5 sm:py-4";

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

export function AccountGroups({ accounts }: { accounts: AccountView[] }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {groupByInstitution(accounts).map((group) => (
        <section
          key={group.institution}
          aria-label={group.institution}
          className={`${card} overflow-hidden`}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-5">
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
                <th
                  scope="col"
                  className={`${headCell} w-36 text-right sm:w-48`}
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
                      formatMoney(account.total.amount, account.total.currency)
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
