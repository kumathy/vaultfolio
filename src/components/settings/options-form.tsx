"use client";

import { useActionState } from "react";
import { saveOptions } from "@/app/(app)/settings/actions";
import {
  AmountInput,
  FieldError,
  idle,
  useFieldErrors,
  inputClass,
  invalid,
  labelClass,
  SaveRow,
} from "./form-kit";

export function OptionsForm({
  days,
  thresholdCents,
  thresholdUnit,
}: {
  days: number;
  thresholdCents: number;
  // The currency of the cash held, or "per currency" when there are several.
  thresholdUnit: string;
}) {
  const [result, save, saving] = useActionState(saveOptions, idle);
  const { state, onChange } = useFieldErrors(result);
  return (
    <form action={save} onChange={onChange}>
      {/* Two columns only when the form itself is wide enough for both
          labels on one line; otherwise stacked, as on phones. */}
      <div className="@container">
        <div className="grid gap-4 @xl:grid-cols-2">
          <div>
            <label htmlFor="days" className={labelClass}>
              Days idle
            </label>
            <input
              id="days"
              name="days"
              type="number"
              min={1}
              max={365}
              defaultValue={days}
              className={`${inputClass} mt-1.5`}
              {...invalid(state, "days")}
            />
            <FieldError state={state} name="days" />
          </div>
          <div>
            <label htmlFor="threshold" className={labelClass}>
              Minimum amount
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
        </div>
      </div>
      <SaveRow state={state} pending={saving} label="Save" />
    </form>
  );
}
