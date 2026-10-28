"use server";

import { refresh } from "next/cache";
import type { FormState } from "@/components/settings/form-kit";
import { revokePluginToken } from "@/db/plugin";
import { loadSettings, updateSettings } from "@/db/settings";
import { requireUserId } from "@/lib/auth/session";
import { localDate } from "@/lib/reports/period";
import { resolveSettings, type RegisteredType } from "@/lib/reports/types";
import {
  parseAccountTypesForm,
  parseOptionsForm,
  parseAllocationForm,
  parseSetupForm,
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

const REGISTERED: RegisteredType[] = ["TFSA", "RRSP", "FHSA"];

export async function saveSetup(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const { timeZone } = resolveSettings(await loadSettings(userId));
  const year = Number(localDate(new Date(), timeZone).slice(0, 4));
  // Only the room fields shown on the form are replaced.
  const shown = REGISTERED.filter((type) => form.get(type) !== null);
  const parsed = parseSetupForm(form, year, shown);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  await updateSettings(userId, (s) => {
    const room = { ...s.room };
    for (const type of shown) delete room[type];
    const next: StoredSettings = {
      ...s,
      room: { ...room, ...parsed.value.room },
    };
    delete next.contributionTargetCents;
    if (parsed.value.contributionTargetCents !== undefined) {
      next.contributionTargetCents = parsed.value.contributionTargetCents;
    }
    return next;
  });
  return saved("Report setup saved");
}

function withoutAllocation(s: StoredSettings): StoredSettings {
  const next = { ...s };
  delete next.allocation;
  delete next.scopeAccountIds;
  return next;
}

export async function saveAllocation(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const ids = await accountIds(userId);
  if (!ids) return unavailable;
  const parsed = parseAllocationForm(form, ids);
  if (!parsed.ok) return { status: "error", errors: parsed.errors };
  await updateSettings(userId, (s) => ({
    ...withoutAllocation(s),
    ...parsed.value,
  }));
  return saved("Allocation saved");
}

export async function clearAllocation(): Promise<FormState> {
  const userId = await requireUserId();
  await updateSettings(userId, withoutAllocation);
  return saved("Allocation cleared");
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Bound to one vault's id in the form; revocation is scoped to the signed-in
// user, so another user's id has no effect.
export async function revokeVault(id: string): Promise<void> {
  const userId = await requireUserId();
  if (!UUID.test(id)) return;
  await revokePluginToken(userId, id);
  refresh();
}
