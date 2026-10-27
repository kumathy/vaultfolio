import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountTable, CurrencyTotals } from "@/components/account-table";
import { Notice } from "@/components/notice";
import { Section } from "@/components/section";
import { ExternalLink, SNAPTRADE_DASHBOARD_URL } from "@/components/text-link";
import { deleteAllSessions, requireUserId } from "@/lib/auth/session";
import { formatTimestampUtc } from "@/lib/format";
import { loadAccountsOverview } from "@/lib/snaptrade/accounts";
import { tokenDeps } from "@/lib/snaptrade/config";
import { ReauthorizationRequired } from "@/lib/snaptrade/tokens";
import { totalsByCurrency } from "@/lib/view-models/accounts";

export const metadata: Metadata = { title: "Accounts" };

const actionButton =
  "border-2 border-border px-4 py-2 text-sm font-medium transition-colors hover:border-foreground";

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
    <>
      <p className="text-sm text-muted">
        Retrieved{" "}
        <time dateTime={retrievedAt.toISOString()}>
          {formatTimestampUtc(retrievedAt)}
        </time>{" "}
        via SnapTrade.
      </p>

      {disabled.map((connection) => (
        <Notice key={connection.id} tone="warning">
          The {connection.brokerage} connection is disabled
          {connection.disabledOn && ` since ${connection.disabledOn}`}. Its
          accounts show the last data SnapTrade retrieved. Connections are
          repaired in the{" "}
          <ExternalLink href={SNAPTRADE_DASHBOARD_URL}>
            SnapTrade Dashboard
          </ExternalLink>
          .
        </Notice>
      ))}

      {connections === null && (
        <Notice>Connection status could not be loaded from SnapTrade.</Notice>
      )}

      <Section title="Accounts">
        {accounts === null ? (
          <Notice tone="warning">
            Accounts could not be loaded from SnapTrade. Reloading the page
            retries the request.
          </Notice>
        ) : accounts.length === 0 ? (
          <p className="leading-relaxed">
            No brokerage accounts are shared with Vaultfolio. Brokerages are
            connected in the{" "}
            <ExternalLink href={SNAPTRADE_DASHBOARD_URL}>
              SnapTrade Dashboard
            </ExternalLink>
            .
          </p>
        ) : (
          <AccountTable accounts={accounts} />
        )}
      </Section>

      {accounts && accounts.length > 0 && (
        <Section title="Total by currency">
          <CurrencyTotals totals={totalsByCurrency(accounts)} />
          <p className="mt-4 text-sm text-muted">
            Values are reported by each brokerage. Amounts in different
            currencies are not converted or combined.
          </p>
        </Section>
      )}

      <Section title="Access">
        <div className="flex flex-wrap gap-3">
          <form method="post" action="/logout">
            <button type="submit" className={actionButton}>
              Sign out
            </button>
          </form>
          <form method="post" action="/disconnect">
            <button
              type="submit"
              className={`${actionButton} text-attention hover:border-attention`}
            >
              Disconnect SnapTrade
            </button>
          </form>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          Sign out ends this browser session. Disconnect revokes Vaultfolio’s
          access at SnapTrade and deletes the stored tokens.
        </p>
      </Section>
    </>
  );
}

function AccountsLoading() {
  return (
    <div role="status" className="text-sm text-muted">
      Loading accounts from SnapTrade…
    </div>
  );
}

export default function AccountsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6">
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">Accounts</h1>
      <Suspense fallback={<AccountsLoading />}>
        <AccountsContent />
      </Suspense>
    </main>
  );
}
