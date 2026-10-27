import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  AccountGroups,
  ConnectionChip,
  StatTiles,
} from "@/components/accounts/overview";
import { Notice } from "@/components/notice";
import {
  buttonDanger,
  buttonSecondary,
  card,
  SNAPTRADE_DASHBOARD_URL,
  textLink,
} from "@/components/ui";
import { deleteAllSessions, requireUserId } from "@/lib/auth/session";
import { formatTimestampUtc } from "@/lib/format";
import { loadAccountsOverview } from "@/lib/snaptrade/accounts";
import { tokenDeps } from "@/lib/snaptrade/config";
import { ReauthorizationRequired } from "@/lib/snaptrade/tokens";
import { totalsByCurrency } from "@/lib/view-models/accounts";

export const metadata: Metadata = { title: "Accounts" };

function DashboardLink({ children }: { children: React.ReactNode }) {
  return (
    <a
      href={SNAPTRADE_DASHBOARD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={textLink}
    >
      {children}
    </a>
  );
}

function PageHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Accounts</h1>
        <p className="mt-1 text-sm text-muted">
          Brokerage accounts shared with Vaultfolio through SnapTrade.
        </p>
      </div>
      {children}
    </div>
  );
}

async function AccountsContent() {
  const userId = await requireUserId();

  let overview;
  try {
    overview = await loadAccountsOverview(tokenDeps, userId);
  } catch (error) {
    if (!(error instanceof ReauthorizationRequired)) {
      throw error;
    }
    await deleteAllSessions(userId);
    redirect("/?error=reauthorize");
  }

  const { accounts, connections, retrievedAt } = overview;
  const disabled = connections?.filter((c) => c.disabled) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <ConnectionChip connections={connections} />
          <p className="text-xs text-muted">
            Retrieved{" "}
            <time dateTime={retrievedAt.toISOString()}>
              {formatTimestampUtc(retrievedAt)}
            </time>{" "}
            via SnapTrade
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
              repaired in the <DashboardLink>SnapTrade Dashboard</DashboardLink>
              .
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
        <div className={`${card} p-10 text-center`}>
          <h2 className="text-lg font-semibold">No accounts shared</h2>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-muted">
            No brokerage accounts are shared with Vaultfolio. Brokerages are
            connected in the <DashboardLink>SnapTrade Dashboard</DashboardLink>.
          </p>
        </div>
      )}

      <section
        aria-labelledby="access-heading"
        className={`${card} flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between`}
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
        <div className="flex flex-wrap gap-3">
          <form method="post" action="/logout">
            <button type="submit" className={buttonSecondary}>
              Sign out
            </button>
          </form>
          <form method="post" action="/disconnect">
            <button type="submit" className={buttonDanger}>
              Disconnect SnapTrade
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function AccountsLoading() {
  return (
    <div className="space-y-8">
      <PageHeader />
      <div
        role="status"
        aria-label="Loading accounts from SnapTrade"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${card} h-32 animate-pulse bg-surface`} />
        ))}
      </div>
      <div className={`${card} h-48 animate-pulse bg-surface`} />
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsLoading />}>
      <AccountsContent />
    </Suspense>
  );
}
