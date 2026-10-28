"use client";

import { useActionState } from "react";
import { saveSetup } from "@/app/(app)/settings/actions";
import type { RegisteredType } from "@/lib/reports/types";
import { AmountInput, FieldError, idle, labelClass, SaveRow } from "./form-kit";

const ROOM_LABELS: Record<RegisteredType, (year: number) => string> = {
  TFSA: (y) => `TFSA room on January 1, ${y}`,
  RRSP: (y) => `RRSP deduction limit for ${y}`,
  FHSA: (y) => `FHSA room on January 1, ${y}`,
};

const cents = (value: number | undefined) =>
  value === undefined ? "" : (value / 100).toFixed(2);

export function SetupForm({
  year,
  types,
  room,
  contributionTargetCents,
  currency,
}: {
  year: number;
  // Registered types the user holds; only these get a room field.
  types: RegisteredType[];
  room: Partial<Record<RegisteredType, number>>;
  contributionTargetCents: number | undefined;
  currency: string;
}) {
  const [state, save, saving] = useActionState(saveSetup, idle);

  return (
    <form action={save}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => (
          <div key={type}>
            <label htmlFor={`room-${type}`} className={labelClass}>
              {ROOM_LABELS[type](year)}
            </label>
            <AmountInput
              id={`room-${type}`}
              name={type}
              unit={currency}
              state={state}
              placeholder="Not set"
              defaultValue={cents(room[type])}
            />
            <FieldError state={state} name={type} />
          </div>
        ))}
        <div>
          <label htmlFor="amount" className={labelClass}>
            Monthly contribution target
          </label>
          <AmountInput
            id="amount"
            name="amount"
            unit={currency}
            state={state}
            placeholder="Not set"
            defaultValue={cents(contributionTargetCents)}
          />
          <FieldError state={state} name="amount" />
        </div>
      </div>
      <SaveRow state={state} pending={saving} label="Save" />
    </form>
  );
}
