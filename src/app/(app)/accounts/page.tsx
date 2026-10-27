import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  AccountsLoading,
  AccountsView,
} from "@/components/accounts/accounts-view";
import { deleteAllSessions, requireUserId } from "@/lib/auth/session";
import { loadAccountsOverview } from "@/lib/snaptrade/accounts";
import { tokenDeps } from "@/lib/snaptrade/config";
import { ReauthorizationRequired } from "@/lib/snaptrade/tokens";

export const metadata: Metadata = { title: "Accounts" };

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

  return <AccountsView overview={overview} />;
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsLoading />}>
      <AccountsContent />
    </Suspense>
  );
}
