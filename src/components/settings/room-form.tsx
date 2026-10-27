"use client";

import { useActionState } from "react";
import { saveRoom } from "@/app/(app)/settings/actions";
import type { RegisteredType } from "@/lib/reports/types";
import {
  FieldError,
  idle,
  inputClass,
  invalid,
  labelClass,
  SaveRow,
} from "./form-kit";

const FIELDS: { type: RegisteredType; label: (year: number) => string }[] = [
  { type: "TFSA", label: (y) => `TFSA room available on January 1, ${y}` },
  { type: "RRSP", label: (y) => `RRSP deduction limit for ${y}` },
  { type: "FHSA", label: (y) => `FHSA room available on January 1, ${y}` },
];

export function RoomForm({
  year,
  room,
}: {
  year: number;
  room: Partial<Record<RegisteredType, number>>;
}) {
  const [state, save, saving] = useActionState(saveRoom, idle);
  return (
    <form action={save}>
      <div className="grid gap-4 md:grid-cols-3">
        {FIELDS.map(({ type, label }) => (
          <div key={type}>
            <label htmlFor={`room-${type}`} className={labelClass}>
              {label(year)}
            </label>
            <input
              id={`room-${type}`}
              name={type}
              inputMode="decimal"
              placeholder="Not set"
              defaultValue={
                room[type] !== undefined ? (room[type]! / 100).toFixed(2) : ""
              }
              className={`${inputClass} mt-1.5 tabular-nums`}
              {...invalid(state, type)}
            />
            <FieldError state={state} name={type} />
          </div>
        ))}
      </div>
      <SaveRow state={state} pending={saving} label="Save starting room" />
    </form>
  );
}
