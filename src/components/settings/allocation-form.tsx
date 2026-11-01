"use client";

import { useActionState, useState } from "react";
import { TbPlus, TbTrash } from "react-icons/tb";
import { clearAllocation, saveAllocation } from "@/app/(app)/settings/actions";
import { compact, buttonSecondary } from "@/components/ui";
import type { Allocation } from "@/lib/settings/parse";
import {
  FieldError,
  idle,
  inputClass,
  invalid,
  labelClass,
  SaveRow,
  useFieldErrors,
} from "./form-kit";

const MAX_FUNDS = 10;

export function AllocationForm({
  targets,
  accounts,
}: {
  targets: Allocation;
  accounts: { id: string; label: string }[];
}) {
  const [result, save, saving] = useActionState(saveAllocation, idle);
  const { state, dismiss } = useFieldErrors(result);
  const [cleared, clear, clearing] = useActionState(clearAllocation, idle);
  const [funds, setFunds] = useState(
    targets.allocation?.map((t) => ({
      symbol: t.symbol,
      weight: String(t.weightPercent),
    })) ?? [{ symbol: "", weight: "" }],
  );
  const update = (i: number, field: "symbol" | "weight", value: string) => {
    setFunds(funds.map((f, j) => (j === i ? { ...f, [field]: value } : f)));
    dismiss(`${field}.${i}`, field === "symbol" ? "allocation" : "total");
  };
  const total = funds.reduce((sum, f) => sum + (Number(f.weight) || 0), 0);
  // Flagged only after a save is rejected, and only while still off 100%.
  const totalOff =
    state.errors?.total !== undefined && Math.abs(total - 100) > 0.001;
  // A single fund's total is its own weight, so the total line appears with
  // two or more funds. A single fund off 100% is flagged under its field,
  // unless the field already shows its own error.
  const single = funds.length === 1;
  const showTotal =
    !single && (totalOff || funds.some((f) => f.weight.trim() !== ""));
  const singleOff = single && totalOff && !state.errors?.["weight.0"];
  const configured = targets.allocation !== undefined;
  const latest =
    (cleared.savedAt ?? 0) > (state.savedAt ?? 0) ? cleared : state;

  return (
    <form action={save} className="space-y-5">
      <fieldset>
        <legend className="sr-only">Funds and target weights</legend>
        <div className="max-w-lg space-y-2">
          {funds.map((fund, i) => (
            // Each error sits under its own field, or full width on phones.
            <div
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_8rem_auto] items-center gap-x-2"
            >
              <input
                name="symbol"
                aria-label={`Fund ${i + 1} symbol`}
                placeholder="XEQT"
                value={fund.symbol}
                onChange={(e) => update(i, "symbol", e.target.value)}
                className={`${inputClass} uppercase`}
                {...invalid(state, `symbol.${i}`)}
              />
              <div className="relative">
                <input
                  name="weight"
                  aria-label={`Fund ${i + 1} weight in percent`}
                  inputMode="decimal"
                  placeholder="100"
                  value={fund.weight}
                  onChange={(e) => update(i, "weight", e.target.value)}
                  className={`${inputClass} pr-8 text-right tabular-nums`}
                  {...(singleOff
                    ? {
                        "aria-invalid": true,
                        "aria-describedby": "total-error",
                      }
                    : invalid(state, `weight.${i}`))}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted"
                >
                  %
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFunds(
                    funds.length === 1
                      ? [{ symbol: "", weight: "" }]
                      : funds.filter((_, j) => j !== i),
                  );
                  // Later rows move up, so row errors no longer match.
                  dismiss(...Object.keys(state.errors ?? {}));
                }}
                aria-label={`Remove fund ${i + 1}`}
                className="-mr-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-40"
              >
                <TbTrash aria-hidden />
              </button>
              <div className="col-span-3 self-start sm:col-span-1">
                <FieldError state={state} name={`symbol.${i}`} />
              </div>
              <div className="col-span-3 self-start sm:col-span-2">
                <FieldError state={state} name={`weight.${i}`} />
                {singleOff && (
                  <p id="total-error" className="mt-1.5 text-sm text-attention">
                    Use 100% for a single fund.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex max-w-lg flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFunds([...funds, { symbol: "", weight: "" }])}
            disabled={funds.length >= MAX_FUNDS}
            className={`${compact(buttonSecondary)} disabled:opacity-40`}
          >
            <TbPlus aria-hidden />
            Add fund
          </button>
          {showTotal && (
            <p
              className={`text-sm tabular-nums ${totalOff ? "text-attention" : "text-muted"}`}
            >
              Total {Math.round(total * 100) / 100}%
              {totalOff && " (must be 100%)"}
            </p>
          )}
        </div>
        <FieldError state={state} name="allocation" />
      </fieldset>

      {accounts.length > 1 && (
        <fieldset>
          <legend className={labelClass}>
            Accounts for monthly target and allocation
          </legend>
          <p className="mt-1 text-sm text-muted">
            None selected means all accounts.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {accounts.map((account) => (
              <label
                key={account.id}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-muted"
              >
                <input
                  type="checkbox"
                  name="account"
                  value={account.id}
                  defaultChecked={
                    targets.scopeAccountIds?.includes(account.id) ?? false
                  }
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {account.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <SaveRow
        state={state}
        confirmation={latest}
        pending={saving}
        label="Save allocation"
      >
        {configured && (
          <button
            type="submit"
            formAction={clear}
            disabled={clearing}
            className="inline-flex items-center rounded-full px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            Clear allocation
          </button>
        )}
      </SaveRow>
    </form>
  );
}
