"use client";

import { useActionState } from "react";
import { saveAccountTypes } from "@/app/(app)/settings/actions";
import type { RegisteredType } from "@/lib/reports/types";
import { idle, SaveRow, Select } from "./form-kit";

export interface AccountTypeRow {
  id: string;
  label: string;
  institution: string;
  brokerageType: string;
  tag: RegisteredType | null | undefined;
}

export function AccountTypesForm({ accounts }: { accounts: AccountTypeRow[] }) {
  const [state, save, saving] = useActionState(saveAccountTypes, idle);
  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted">
        No brokerage accounts are shared with Vaultfolio.
      </p>
    );
  }
  return (
    <form action={save}>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{account.label}</p>
              <p className="text-sm text-muted">
                {account.institution} · reported as {account.brokerageType}
              </p>
            </div>
            <label className="sm:w-56">
              <span className="sr-only">Type for {account.label}</span>
              <Select
                name={`type.${account.id}`}
                defaultValue={
                  account.tag === null ? "none" : (account.tag ?? "")
                }
              >
                <option value="">As reported ({account.brokerageType})</option>
                <option value="TFSA">TFSA</option>
                <option value="RRSP">RRSP</option>
                <option value="FHSA">FHSA</option>
                <option value="none">Non-registered</option>
              </Select>
            </label>
          </li>
        ))}
      </ul>
      <SaveRow state={state} pending={saving} label="Save account types" />
    </form>
  );
}
