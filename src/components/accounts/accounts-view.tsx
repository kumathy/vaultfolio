import { Notice } from "@/components/notice";
import {
  SNAPTRADE_DASHBOARD_URL,
  SnapTradeLink,
  SnapTradeName,
} from "@/components/snaptrade";
import { TbArrowUpRight } from "react-icons/tb";
import { buttonSecondary, card, compact } from "@/components/ui";
import { localDateTime } from "@/lib/reports/period";
import type { AccountsOverview } from "@/lib/snaptrade/accounts";
import { totalsByCurrency } from "@/lib/view-models/accounts";
import { AccountGroups, OverviewPanel } from "./overview";

function PageHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Accounts
        </h1>
        <p className="mt-1 text-sm text-muted">
          Brokerage accounts shared with Vaultfolio through SnapTrade.
        </p>
      </div>
      {/* Also in the sidebar, which narrow screens hide. */}
      <a
        href={SNAPTRADE_DASHBOARD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${compact(buttonSecondary)} self-start sm:self-auto`}
      >
        Manage connections
        <TbArrowUpRight aria-hidden />
        <span className="sr-only">
          (SnapTrade Dashboard, opens in a new tab)
        </span>
      </a>
    </div>
  );
}

export function AccountsView({
  overview,
  timeZone,
}: {
  overview: AccountsOverview;
  timeZone: string;
}) {
  const { accounts, connections, retrievedAt } = overview;
  const disabled = connections?.filter((c) => c.disabled) ?? [];

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader />

      {(disabled.length > 0 || connections === null || accounts === null) && (
        <div className="space-y-3">
          {disabled.map((connection) => (
            <Notice key={connection.id} tone="warning">
              The {connection.brokerage} connection is disabled
              {connection.disabledOn && ` since ${connection.disabledOn}`}. Its
              accounts show the last data SnapTrade retrieved. Connections are
              repaired in the <SnapTradeLink />.
            </Notice>
          ))}
          {connections === null && (
            <Notice>
              Connection status could not be loaded from SnapTrade.
            </Notice>
          )}
          {accounts === null && (
            <Notice tone="warning">
              Accounts could not be loaded from SnapTrade. Reloading the page
              retries the request.
            </Notice>
          )}
        </div>
      )}

      {accounts && accounts.length > 0 && (
        <>
          <OverviewPanel
            accounts={accounts}
            connections={connections}
            totals={totalsByCurrency(accounts)}
          />
          <AccountGroups accounts={accounts} />
          <p className="text-xs text-muted">
            Retrieved{" "}
            <time dateTime={retrievedAt.toISOString()}>
              {localDateTime(retrievedAt, timeZone)}
            </time>{" "}
            from <SnapTradeName />.
          </p>
        </>
      )}

      {accounts && accounts.length === 0 && (
        <div className={`${card} p-6 text-center sm:p-10`}>
          <h2 className="text-lg font-semibold">No accounts shared</h2>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-muted">
            No brokerage accounts are shared with Vaultfolio. Brokerages are
            connected in the <SnapTradeLink />.
          </p>
        </div>
      )}
    </div>
  );
}

export function AccountsLoading() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader />
      <div
        role="status"
        aria-label="Loading accounts from SnapTrade"
        className={`${card} h-56 animate-pulse bg-surface sm:h-64 lg:h-36`}
      />
      <div className={`${card} h-48 animate-pulse bg-surface`} />
    </div>
  );
}
