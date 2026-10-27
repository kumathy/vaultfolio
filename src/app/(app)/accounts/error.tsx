"use client";

import { TbRefresh } from "react-icons/tb";
import { Notice } from "@/components/notice";
import { buttonSecondary } from "@/components/ui";

export default function AccountsError({ retry }: { retry: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Accounts
      </h1>
      <div className="max-w-xl">
        <Notice tone="warning">Accounts could not be displayed.</Notice>
      </div>
      <button type="button" onClick={retry} className={buttonSecondary}>
        <TbRefresh aria-hidden />
        Retry
      </button>
    </div>
  );
}
