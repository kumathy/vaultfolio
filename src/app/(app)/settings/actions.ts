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
  parseRoomForm,
  parseTargetsForm,
  parseTransfersForm,
  type StoredSettings,
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

// Saving replaces all three fields, so an emptied field clears that target.
function withoutTargets(s: StoredSettings): StoredSettings {
  const next = { ...s };
  delete next.contributionTargetCents;
  delete next.allocation;
  delete next.scopeAccountIds;
  return next;
}

export async function saveTargets(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const ids = await accountIds(userId);
  if (!ids) return unavailable;
  const parsed = parseTargetsForm(form, ids);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  await updateSettings(userId, (s) => ({
    ...withoutTargets(s),
    ...parsed.value,
  }));
  return saved("Targets saved");
}

export async function clearTargets(): Promise<FormState> {
  const userId = await requireUserId();
  await updateSettings(userId, withoutTargets);
  return saved("Targets cleared");
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
