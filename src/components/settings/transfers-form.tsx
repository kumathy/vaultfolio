"use client";

import { useActionState } from "react";
import { saveTransfers } from "@/app/(app)/settings/actions";
import { idle, SaveRow } from "./form-kit";

export interface TransferRow {
  id: string;
  date: string;
  account: string;
  amount: string;
  counted: boolean;
}

export function TransfersForm({ transfers }: { transfers: TransferRow[] }) {
  const [state, save, saving] = useActionState(saveTransfers, idle);
  if (transfers.length === 0) {
    return (
      <p className="text-sm text-muted">
        No transfers into TFSA, RRSP or FHSA accounts were found.
      </p>
    );
  }
  return (
    <form action={save}>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {transfers.map((t) => (
          <li
            key={t.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium tabular-nums">{t.amount}</p>
              <p className="text-sm text-muted">
                {t.date} · {t.account}
              </p>
            </div>
            <label className="inline-flex items-center gap-2.5 text-sm">
              <input type="hidden" name="listed" value={t.id} />
              <input
                type="checkbox"
                name="contribution"
                value={t.id}
                defaultChecked={t.counted}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Count as contribution
            </label>
          </li>
        ))}
      </ul>
      <SaveRow state={state} pending={saving} label="Save transfers" />
    </form>
  );
}
