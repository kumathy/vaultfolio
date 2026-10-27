"use server";

import { refresh } from "next/cache";
import type { FormState } from "@/components/settings/form-kit";
import { loadSettings, updateSettings } from "@/db/settings";
import { requireUserId } from "@/lib/auth/session";
import { localDate } from "@/lib/reports/period";
import { resolveSettings } from "@/lib/reports/types";
import {
  parseAccountTypesForm,
  parseOptionsForm,
  parsePlanForm,
  parseRoomForm,
  parseTransfersForm,
} from "@/lib/settings/parse";
import { snaptradeGet } from "@/lib/snaptrade/api";
import { tokenDeps } from "@/lib/snaptrade/config";
import type { Account } from "@/lib/snaptrade/types";

// Server Actions are public POST endpoints: each one re-checks the session and
// validates its input. Account IDs are checked against the user's own accounts.

async function accountIds(userId: string): Promise<string[] | null> {
  try {
    const accounts = await snaptradeGet<Account[]>(
      tokenDeps,
      userId,
      "/accounts",
    );
    return Array.isArray(accounts) ? accounts.map((a) => a.id) : [];
  } catch {
    return null;
  }
}

const unavailable: FormState = {
  status: "error",
  message: "Accounts could not be loaded from SnapTrade. Try again shortly.",
};

const saved = (message = "Saved"): FormState => {
  refresh();
  return { status: "saved", message };
};

export async function savePlan(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const ids = await accountIds(userId);
  if (!ids) return unavailable;
  const parsed = parsePlanForm(form, ids);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  await updateSettings(userId, (s) => ({ ...s, plan: parsed.value }));
  return saved("Plan saved");
}

export async function removePlan(): Promise<FormState> {
  const userId = await requireUserId();
  await updateSettings(userId, (s) => {
    const next = { ...s };
    delete next.plan;
    return next;
  });
  return saved("Plan removed");
}

export async function saveRoom(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const { timeZone } = resolveSettings(await loadSettings(userId));
  const year = Number(localDate(new Date(), timeZone).slice(0, 4));
  const parsed = parseRoomForm(form, year);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  await updateSettings(userId, (s) => ({ ...s, room: parsed.value }));
  return saved("Starting room saved");
}

export async function saveAccountTypes(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const ids = await accountIds(userId);
  if (!ids) return unavailable;
  const accountTypes = parseAccountTypesForm(form, ids);
  await updateSettings(userId, (s) => ({ ...s, accountTypes }));
  return saved("Account types saved");
}

export async function saveTransfers(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  await updateSettings(userId, (s) => ({
    ...s,
    activityKinds: parseTransfersForm(form, s.activityKinds),
  }));
  return saved("Transfers saved");
}

export async function saveOptions(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = parseOptionsForm(form);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  await updateSettings(userId, (s) => ({ ...s, ...parsed.value }));
  return saved("Options saved");
}
