"use client";

import { useActionState, useState } from "react";
import { TbPlus, TbTrash } from "react-icons/tb";
import { removePlan, savePlan } from "@/app/(app)/settings/actions";
import { compact, buttonSecondary } from "@/components/ui";
import type { PlanSettings } from "@/lib/reports/types";
import {
  FieldError,
  idle,
  inputClass,
  invalid,
  labelClass,
  SaveRow,
} from "./form-kit";

const MAX_FUNDS = 10;

export function PlanForm({
  plan,
  accounts,
}: {
  plan: PlanSettings | undefined;
  accounts: { id: string; label: string }[];
}) {
  const [state, save, saving] = useActionState(savePlan, idle);
  const [removed, remove, removing] = useActionState(removePlan, idle);
  // XEQT 100% is a starting suggestion in the form only; reports never assume it.
  const [funds, setFunds] = useState(
    plan?.targets.map((t) => ({
      symbol: t.symbol,
      weight: String(t.weightPercent),
    })) ?? [{ symbol: "XEQT", weight: "100" }],
  );
  const total = funds.reduce((sum, f) => sum + (Number(f.weight) || 0), 0);
  const shown = removed.status === "saved" ? removed : state;

  return (
    <form action={save} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="amount" className={labelClass}>
            Monthly amount (CAD)
          </label>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="300.00"
            defaultValue={
              plan ? (plan.monthlyAmountCents / 100).toFixed(2) : ""
            }
            className={`${inputClass} mt-1.5`}
            {...invalid(state, "amount")}
          />
          <FieldError state={state} name="amount" />
        </div>
        <div>
          <label htmlFor="day" className={labelClass}>
            Contribution day of the month
          </label>
          <input
            id="day"
            name="day"
            type="number"
            min={1}
            max={28}
            placeholder="1"
            defaultValue={plan?.contributionDay ?? 1}
            className={`${inputClass} mt-1.5`}
            {...invalid(state, "day")}
          />
          <FieldError state={state} name="day" />
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>Funds and target weights</legend>
        <div className="mt-2 space-y-2">
          {funds.map((fund, i) => (
            <div key={i}>
              <div className="flex items-center gap-2">
                <input
                  name="symbol"
                  aria-label={`Fund ${i + 1} symbol`}
                  placeholder="XEQT"
                  value={fund.symbol}
                  onChange={(e) =>
                    setFunds(
                      funds.map((f, j) =>
                        j === i ? { ...f, symbol: e.target.value } : f,
                      ),
                    )
                  }
                  className={`${inputClass} uppercase`}
                  {...invalid(state, `symbol.${i}`)}
                />
                <div className="relative w-32 shrink-0">
                  <input
                    name="weight"
                    aria-label={`Fund ${i + 1} weight in percent`}
                    inputMode="decimal"
                    placeholder="100"
                    value={fund.weight}
                    onChange={(e) =>
                      setFunds(
                        funds.map((f, j) =>
                          j === i ? { ...f, weight: e.target.value } : f,
                        ),
                      )
                    }
                    className={`${inputClass} pr-8 text-right tabular-nums`}
                    {...invalid(state, `weight.${i}`)}
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
                  onClick={() => setFunds(funds.filter((_, j) => j !== i))}
                  disabled={funds.length === 1}
                  aria-label={`Remove fund ${i + 1}`}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-40"
                >
                  <TbTrash aria-hidden />
                </button>
              </div>
              <FieldError state={state} name={`symbol.${i}`} />
              <FieldError state={state} name={`weight.${i}`} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFunds([...funds, { symbol: "", weight: "" }])}
            disabled={funds.length >= MAX_FUNDS}
            className={`${compact(buttonSecondary)} disabled:opacity-40`}
          >
            <TbPlus aria-hidden />
            Add fund
          </button>
          <p
            className={`text-sm tabular-nums ${Math.abs(total - 100) < 0.001 ? "text-muted" : "text-attention"}`}
          >
            Total {Math.round(total * 100) / 100}%
          </p>
        </div>
        <FieldError state={state} name="targets" />
      </fieldset>

      {accounts.length > 1 && (
        <fieldset>
          <legend className={labelClass}>Accounts the plan applies to</legend>
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
                    plan?.accountIds?.includes(account.id) ?? false
                  }
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {account.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <SaveRow state={shown} pending={saving} label="Save plan">
        {plan && (
          <button
            type="submit"
            formAction={remove}
            disabled={removing}
            className="inline-flex items-center rounded-full px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            Remove plan
          </button>
        )}
      </SaveRow>
    </form>
  );
}
