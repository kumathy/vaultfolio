"use client";

import { TbCheck } from "react-icons/tb";
import { buttonPrimary, card } from "@/components/ui";

export interface FormState {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: Record<string, string>;
}

export const idle: FormState = { status: "idle" };

export const inputClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted/70 transition-colors hover:border-muted aria-invalid:border-attention";

export const labelClass = "text-sm font-medium";

export function FieldError({
  state,
  name,
}: {
  state: FormState;
  name: string;
}) {
  const error = state.errors?.[name];
  return error ? (
    <p id={`${name}-error`} className="mt-1.5 text-sm text-attention">
      {error}
    </p>
  ) : null;
}

export const invalid = (state: FormState, name: string) =>
  state.errors?.[name]
    ? { "aria-invalid": true, "aria-describedby": `${name}-error` }
    : {};

export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`${card} scroll-mt-24 p-5 sm:p-6`}
    >
      <h2 id={`${id}-heading`} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
        {description}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function SaveRow({
  state,
  pending,
  label = "Save",
  children,
}: {
  state: FormState;
  pending: boolean;
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className={`${buttonPrimary} disabled:opacity-60`}
      >
        {pending ? "Saving…" : label}
      </button>
      {children}
      <p role="status" className="text-sm">
        {state.status === "saved" && (
          <span className="inline-flex items-center gap-1.5 text-accent">
            <TbCheck aria-hidden />
            {state.message ?? "Saved"}
          </span>
        )}
        {state.status === "error" && (
          <span className="text-attention">
            {state.message ?? "Some fields need attention."}
          </span>
        )}
      </p>
    </div>
  );
}
