"use client";

import { useActionState } from "react";
import { saveOptions } from "@/app/(app)/settings/actions";
import { TIME_ZONES } from "@/lib/settings/parse";
import {
  FieldError,
  idle,
  inputClass,
  invalid,
  labelClass,
  SaveRow,
} from "./form-kit";

export function OptionsForm({
  days,
  thresholdCents,
  timeZone,
}: {
  days: number;
  thresholdCents: number;
  timeZone: string;
}) {
  const [state, save, saving] = useActionState(saveOptions, idle);
  return (
    <form action={save}>
      {/* Labels sit at the bottom of their cell, so the three fields stay level
          when a label wraps. */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col">
          <label
            htmlFor="days"
            className={`${labelClass} md:flex md:flex-1 md:items-end`}
          >
            Uninvested cash: days
          </label>
          <input
            id="days"
            name="days"
            type="number"
            min={1}
            max={60}
            defaultValue={days}
            className={`${inputClass} mt-1.5`}
            {...invalid(state, "days")}
          />
          <FieldError state={state} name="days" />
        </div>
        <div className="flex flex-col">
          <label
            htmlFor="threshold"
            className={`${labelClass} md:flex md:flex-1 md:items-end`}
          >
            Uninvested cash: minimum
          </label>
          <input
            id="threshold"
            name="threshold"
            inputMode="decimal"
            defaultValue={(thresholdCents / 100).toFixed(2)}
            className={`${inputClass} mt-1.5 tabular-nums`}
            {...invalid(state, "threshold")}
          />
          <FieldError state={state} name="threshold" />
        </div>
        <div className="flex flex-col">
          <label
            htmlFor="timeZone"
            className={`${labelClass} md:flex md:flex-1 md:items-end`}
          >
            Time zone
          </label>
          <select
            id="timeZone"
            name="timeZone"
            defaultValue={timeZone}
            className={`${inputClass} mt-1.5`}
            {...invalid(state, "timeZone")}
          >
            {TIME_ZONES.map(([zone, label]) => (
              <option key={zone} value={zone}>
                {label} ({zone})
              </option>
            ))}
          </select>
          <FieldError state={state} name="timeZone" />
        </div>
      </div>
      <SaveRow state={state} pending={saving} label="Save options" />
    </form>
  );
}
