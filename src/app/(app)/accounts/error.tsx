"use client";

import { TbAlertTriangle, TbRefresh } from "react-icons/tb";
import { buttonSecondary } from "@/components/ui";

export default function AccountsError({ retry }: { retry: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Accounts</h1>
      <div className="max-w-xl rounded-xl border border-attention/25 bg-attention-soft px-4 py-3 text-sm">
        <p className="flex items-center gap-1.5 font-medium text-attention">
          <TbAlertTriangle aria-hidden className="text-base" />
          Attention
        </p>
        <p className="mt-1">Accounts could not be displayed.</p>
      </div>
      <button type="button" onClick={retry} className={buttonSecondary}>
        <TbRefresh aria-hidden />
        Retry
      </button>
    </div>
  );
}
