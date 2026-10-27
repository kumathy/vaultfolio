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
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th scope="col" className="px-4 py-2.5 font-medium">
                Date
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Account
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Amount
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Count as contribution
              </th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-4 py-2.5 whitespace-nowrap">{t.date}</td>
                <td className="px-4 py-2.5">{t.account}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  {t.amount}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <input type="hidden" name="listed" value={t.id} />
                  <input
                    type="checkbox"
                    name="contribution"
                    value={t.id}
                    defaultChecked={t.counted}
                    aria-label={`Count the ${t.date} transfer of ${t.amount} as a contribution`}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SaveRow state={state} pending={saving} label="Save transfers" />
    </form>
  );
}
