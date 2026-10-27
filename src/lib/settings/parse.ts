import type {
  PlanSettings,
  RegisteredType,
  ReportSettings,
  RoomSetting,
} from "@/lib/reports/types";

// Settings arrive from forms and from the database; both are treated as
// untrusted and validated here before use.

export interface StoredSettings extends ReportSettings {
  roomPromptDismissed?: boolean;
}

export const TIME_ZONES = [
  ["America/St_Johns", "Newfoundland"],
  ["America/Halifax", "Atlantic"],
  ["America/Toronto", "Eastern"],
  ["America/Winnipeg", "Central"],
  ["America/Regina", "Saskatchewan"],
  ["America/Edmonton", "Mountain"],
  ["America/Vancouver", "Pacific"],
  ["UTC", "UTC"],
] as const;

const REGISTERED: RegisteredType[] = ["TFSA", "RRSP", "FHSA"];
const MAX_TARGETS = 10;
const MAX_TRANSFERS = 500;
const MAX_DOLLARS = 10_000_000;

export type FieldErrors = Record<string, string>;
export type Parsed<T> =
  { ok: true; value: T } | { ok: false; errors: FieldErrors };

interface FormLike {
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
}

const field = (form: FormLike, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

const all = (form: FormLike, name: string) =>
  form.getAll(name).map((v) => (typeof v === "string" ? v.trim() : ""));

// Dollar amounts as typed: "300", "300.5", "1,250.00", "$7,000".
export function parseDollars(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents <= MAX_DOLLARS * 100 ? cents : null;
}

export const normalizeSymbol = (text: string) => text.trim().toUpperCase();
const SYMBOL = /^[A-Z0-9][A-Z0-9.-]{0,11}$/;

export function parsePlanForm(
  form: FormLike,
  knownAccountIds: string[],
): Parsed<PlanSettings> {
  const errors: FieldErrors = {};

  const monthlyAmountCents = parseDollars(field(form, "amount"));
  if (!monthlyAmountCents)
    errors.amount = "Enter a monthly amount greater than $0.";

  const day = Number(field(form, "day"));
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    errors.day = "Choose a day from 1 to 28.";
  }

  const symbols = all(form, "symbol");
  const weights = all(form, "weight");
  const targets: PlanSettings["targets"] = [];
  symbols.forEach((raw, i) => {
    const symbol = normalizeSymbol(raw);
    const weightText = weights[i] ?? "";
    if (!symbol && !weightText) return;
    const weight = Number(weightText);
    if (!SYMBOL.test(symbol)) {
      errors[`symbol.${i}`] = "Use letters, digits, dots or dashes.";
    }
    if (!/^\d+(\.\d{1,2})?$/.test(weightText) || weight <= 0 || weight > 100) {
      errors[`weight.${i}`] = "Use a weight above 0 and up to 100.";
    }
    targets.push({ symbol, weightPercent: weight });
  });
  if (targets.length === 0) errors.targets = "Add at least one fund.";
  if (targets.length > MAX_TARGETS)
    errors.targets = `Use at most ${MAX_TARGETS} funds.`;
  if (new Set(targets.map((t) => t.symbol)).size !== targets.length) {
    errors.targets = "Each fund can appear once.";
  }
  const total = targets.reduce((sum, t) => sum + (t.weightPercent || 0), 0);
  if (!errors.targets && Math.abs(total - 100) > 0.001) {
    errors.targets = `Weights add up to ${Math.round(total * 100) / 100}%; they need to total 100%.`;
  }

  const accountIds = all(form, "account").filter((id) =>
    knownAccountIds.includes(id),
  );

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      monthlyAmountCents: monthlyAmountCents!,
      contributionDay: day,
      targets,
      ...(accountIds.length > 0 ? { accountIds } : {}),
    },
  };
}

export function parseRoomForm(
  form: FormLike,
  year: number,
): Parsed<Partial<Record<RegisteredType, RoomSetting>>> {
  const errors: FieldErrors = {};
  const room: Partial<Record<RegisteredType, RoomSetting>> = {};
  for (const type of REGISTERED) {
    const text = field(form, type);
    if (!text) continue;
    const cents = parseDollars(text);
    if (cents === null) {
      errors[type] = "Enter an amount such as 7,000.00, or leave it empty.";
      continue;
    }
    room[type] = { year, availableCents: cents };
  }
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, value: room };
}

export function parseAccountTypesForm(
  form: FormLike,
  knownAccountIds: string[],
): Record<string, RegisteredType | null> {
  const tags: Record<string, RegisteredType | null> = {};
  for (const id of knownAccountIds) {
    const value = field(form, `type.${id}`);
    if (value === "none") tags[id] = null;
    else if (REGISTERED.includes(value as RegisteredType)) {
      tags[id] = value as RegisteredType;
    }
  }
  return tags;
}

// Only transfers listed on the form are touched; corrections for others stay.
export function parseTransfersForm(
  form: FormLike,
  current: ReportSettings["activityKinds"] = {},
): NonNullable<ReportSettings["activityKinds"]> {
  const validId = (id: string) => id.length > 0 && id.length <= 128;
  const listed = new Set(
    all(form, "listed").filter(validId).slice(0, MAX_TRANSFERS),
  );
  const checked = new Set(all(form, "contribution").filter(validId));
  const next = { ...current };
  for (const id of listed) {
    if (checked.has(id)) next[id] = "contribution";
    else delete next[id];
  }
  return next;
}

export function parseOptionsForm(
  form: FormLike,
): Parsed<
  Pick<
    ReportSettings,
    "uninvestedCashDays" | "uninvestedCashThresholdCents" | "timeZone"
  >
> {
  const errors: FieldErrors = {};
  const days = Number(field(form, "days"));
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    errors.days = "Choose a number of days from 1 to 60.";
  }
  const threshold = parseDollars(field(form, "threshold"));
  if (threshold === null) errors.threshold = "Enter an amount such as 25.00.";
  const timeZone = field(form, "timeZone");
  if (!TIME_ZONES.some(([zone]) => zone === timeZone)) {
    errors.timeZone = "Choose a time zone from the list.";
  }
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : {
        ok: true,
        value: {
          uninvestedCashDays: days,
          uninvestedCashThresholdCents: threshold!,
          timeZone,
        },
      };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isCents = (v: unknown): v is number =>
  typeof v === "number" &&
  Number.isInteger(v) &&
  v >= 0 &&
  v <= MAX_DOLLARS * 100;

// Keeps every valid part of a stored document and drops anything else, so a
// malformed value can never break report generation.
export function parseStoredSettings(raw: unknown): StoredSettings {
  if (!isRecord(raw)) return {};
  const settings: StoredSettings = {};

  if (TIME_ZONES.some(([zone]) => zone === raw.timeZone)) {
    settings.timeZone = raw.timeZone as string;
  }
  if (
    typeof raw.uninvestedCashDays === "number" &&
    Number.isInteger(raw.uninvestedCashDays) &&
    raw.uninvestedCashDays >= 1 &&
    raw.uninvestedCashDays <= 60
  ) {
    settings.uninvestedCashDays = raw.uninvestedCashDays;
  }
  if (isCents(raw.uninvestedCashThresholdCents)) {
    settings.uninvestedCashThresholdCents = raw.uninvestedCashThresholdCents;
  }

  const plan = raw.plan;
  if (
    isRecord(plan) &&
    isCents(plan.monthlyAmountCents) &&
    plan.monthlyAmountCents > 0 &&
    typeof plan.contributionDay === "number" &&
    Number.isInteger(plan.contributionDay) &&
    plan.contributionDay >= 1 &&
    plan.contributionDay <= 28 &&
    Array.isArray(plan.targets)
  ) {
    const targets = plan.targets.filter(
      (t): t is { symbol: string; weightPercent: number } =>
        isRecord(t) &&
        typeof t.symbol === "string" &&
        SYMBOL.test(t.symbol) &&
        typeof t.weightPercent === "number" &&
        t.weightPercent > 0 &&
        t.weightPercent <= 100,
    );
    const accountIds = Array.isArray(plan.accountIds)
      ? plan.accountIds.filter((id): id is string => typeof id === "string")
      : [];
    if (targets.length > 0) {
      settings.plan = {
        monthlyAmountCents: plan.monthlyAmountCents,
        contributionDay: plan.contributionDay,
        targets: targets.map(({ symbol, weightPercent }) => ({
          symbol,
          weightPercent,
        })),
        ...(accountIds.length > 0 ? { accountIds } : {}),
      };
    }
  }

  if (isRecord(raw.room)) {
    const room: Partial<Record<RegisteredType, RoomSetting>> = {};
    for (const type of REGISTERED) {
      const entry = raw.room[type];
      if (
        isRecord(entry) &&
        typeof entry.year === "number" &&
        Number.isInteger(entry.year) &&
        isCents(entry.availableCents)
      ) {
        room[type] = { year: entry.year, availableCents: entry.availableCents };
      }
    }
    settings.room = room;
  }

  if (isRecord(raw.accountTypes)) {
    const tags: Record<string, RegisteredType | null> = {};
    for (const [id, value] of Object.entries(raw.accountTypes)) {
      if (value === null || REGISTERED.includes(value as RegisteredType)) {
        tags[id] = value as RegisteredType | null;
      }
    }
    settings.accountTypes = tags;
  }

  if (isRecord(raw.activityKinds)) {
    const kinds: NonNullable<ReportSettings["activityKinds"]> = {};
    for (const [id, value] of Object.entries(raw.activityKinds)) {
      if (value === "contribution" || value === "transfer_in")
        kinds[id] = value;
    }
    settings.activityKinds = kinds;
  }

  if (raw.roomPromptDismissed === true) settings.roomPromptDismissed = true;
  return settings;
}
