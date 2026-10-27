import { Notice } from "@/components/notice";
import { SnapTradeLink, SnapTradeName } from "@/components/snaptrade";
import { buttonDanger, buttonSecondary, card } from "@/components/ui";
import { formatTimestampUtc } from "@/lib/format";
import type { AccountsOverview } from "@/lib/snaptrade/accounts";
import { totalsByCurrency } from "@/lib/view-models/accounts";
import { AccountGroups, ConnectionChip, StatTiles } from "./overview";

function PageHeader({ children }: { children?: React.ReactNode }) {
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
      {children}
    </div>
  );
}

function AccessCard() {
  const fullWidthOnPhones = "w-full sm:w-auto";
  return (
    <section
      aria-labelledby="access-heading"
      className={`${card} flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between`}
    >
      <div className="max-w-2xl">
        <h2 id="access-heading" className="font-semibold">
          Access
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Sign out ends this browser session. Disconnect revokes Vaultfolio’s
          access at SnapTrade and deletes the stored tokens.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <form method="post" action="/logout">
          <button
            type="submit"
            className={`${buttonSecondary} ${fullWidthOnPhones}`}
          >
            Sign out
          </button>
        </form>
        <form method="post" action="/disconnect">
          <button
            type="submit"
            className={`${buttonDanger} ${fullWidthOnPhones}`}
          >
            Disconnect SnapTrade
          </button>
        </form>
      </div>
    </section>
  );
}

export function AccountsView({ overview }: { overview: AccountsOverview }) {
  const { accounts, connections, retrievedAt } = overview;
  const disabled = connections?.filter((c) => c.disabled) ?? [];

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <ConnectionChip connections={connections} />
          <p className="text-xs text-muted">
            Retrieved{" "}
            <time dateTime={retrievedAt.toISOString()}>
              {formatTimestampUtc(retrievedAt)}
            </time>{" "}
            via <SnapTradeName />
          </p>
        </div>
      </PageHeader>

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
          <StatTiles
            accounts={accounts}
            connections={connections}
            totals={totalsByCurrency(accounts)}
          />
          <AccountGroups accounts={accounts} />
          <p className="text-sm text-muted">
            Values are reported by each brokerage. Amounts in different
            currencies are not converted or combined.
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

      <AccessCard />
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
        className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        <div
          className={`${card} col-span-2 h-28 animate-pulse bg-surface sm:col-span-1 sm:h-32`}
        />
        <div className={`${card} h-28 animate-pulse bg-surface sm:h-32`} />
        <div className={`${card} h-28 animate-pulse bg-surface sm:h-32`} />
      </div>
      <div className={`${card} h-48 animate-pulse bg-surface`} />
    </div>
  );
}
