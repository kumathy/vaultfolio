import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  AccountsLoading,
  AccountsView,
} from "@/components/accounts/accounts-view";
import { loadSettings } from "@/db/settings";
import { deleteAllSessions, requireUserId } from "@/lib/auth/session";
import { resolveSettings } from "@/lib/reports/types";
import { loadAccountsOverview } from "@/lib/snaptrade/accounts";
import { tokenDeps } from "@/lib/snaptrade/config";
import { ReauthorizationRequired } from "@/lib/snaptrade/tokens";

export const metadata: Metadata = { title: "Accounts" };

async function AccountsContent() {
  const userId = await requireUserId();

  let overview;
  let timeZone;
  try {
    [overview, { timeZone }] = await Promise.all([
      loadAccountsOverview(tokenDeps, userId),
      loadSettings(userId).then(resolveSettings),
    ]);
  } catch (error) {
    if (!(error instanceof ReauthorizationRequired)) {
      throw error;
    }
    await deleteAllSessions(userId);
    redirect("/?error=reauthorize");
  }

  return <AccountsView overview={overview} timeZone={timeZone} />;
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsLoading />}>
      <AccountsContent />
    </Suspense>
  );
}
