"use client";

import { useActionState } from "react";
import { saveOptions } from "@/app/(app)/settings/actions";
import { TIME_ZONES } from "@/lib/settings/parse";
import {
  AmountInput,
  FieldError,
  idle,
  inputClass,
  invalid,
  labelClass,
  SaveRow,
  Select,
} from "./form-kit";

export function OptionsForm({
  days,
  thresholdCents,
  timeZone,
  thresholdUnit,
}: {
  days: number;
  thresholdCents: number;
  timeZone: string;
  // The currency of the cash held, or "per currency" when there are several.
  thresholdUnit: string;
}) {
  const [state, save, saving] = useActionState(saveOptions, idle);
  return (
    <form action={save}>
      {/* Three columns only when the form itself is wide enough for every
          label on one line; otherwise stacked, as on phones. */}
      <div className="@container">
        <div className="grid gap-4 @3xl:grid-cols-3">
          <div>
            <label htmlFor="days" className={labelClass}>
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
          <div>
            <label htmlFor="threshold" className={labelClass}>
              Uninvested cash: minimum amount
            </label>
            <AmountInput
              id="threshold"
              name="threshold"
              unit={thresholdUnit}
              state={state}
              defaultValue={(thresholdCents / 100).toFixed(2)}
            />
            <FieldError state={state} name="threshold" />
          </div>
          <div>
            <label htmlFor="timeZone" className={labelClass}>
              Time zone
            </label>
            <Select
              id="timeZone"
              name="timeZone"
              defaultValue={timeZone}
              wrapperClassName="mt-1.5"
              {...invalid(state, "timeZone")}
            >
              {TIME_ZONES.map(([zone, label]) => (
                <option key={zone} value={zone}>
                  {label} ({zone})
                </option>
              ))}
            </Select>
            <FieldError state={state} name="timeZone" />
          </div>
        </div>
      </div>
      <SaveRow state={state} pending={saving} label="Save options" />
    </form>
  );
}
