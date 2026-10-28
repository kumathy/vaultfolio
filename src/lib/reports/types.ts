export type RegisteredType = "TFSA" | "RRSP" | "FHSA";

export type ActivityKind =
  | "contribution"
  | "withdrawal"
  | "transfer_in"
  | "transfer_out"
  | "buy"
  | "sell"
  | "reinvestment"
  | "distribution"
  | "interest"
  | "fee"
  | "other";

export interface Activity {
  id: string;
  // Date as recorded by the brokerage (activities are often date-only).
  date: string;
  kind: ActivityKind;
  type: string;
  symbol: string | null;
  units: number;
  price: number | null;
  // Integer cents. Positive is cash in, negative is cash out.
  amountCents: number;
  currency: string | null;
}

export interface Holding {
  symbol: string;
  description: string | null;
  units: number;
  price: number | null;
  valueCents: number | null;
  currency: string | null;
}

export interface CashBalance {
  currency: string;
  cents: number;
}

// `null` collections mark data that failed to load.
export interface ReportAccount {
  id: string;
  name: string;
  institution: string;
  numberSuffix: string | null;
  label: string;
  registeredType: RegisteredType | null;
  isPaper: boolean;
  holdings: Holding[] | null;
  cash: CashBalance[] | null;
  activities: Activity[] | null;
  firstTransactionDate: string | null;
  dataAsOf: string | null;
  // Some data is missing because SnapTrade's request limit was reached.
  rateLimited: boolean;
  // Estimated daily account value, oldest first; null when unavailable.
  valueHistory: { currency: string; points: ValuePoint[] } | null;
}

export interface ValuePoint {
  date: string;
  cents: number;
}

export interface ReportInput {
  accounts: ReportAccount[];
}

export interface AllocationTarget {
  symbol: string;
  weightPercent: number;
}

export interface RoomSetting {
  year: number;
  // TFSA and FHSA: room available on January 1. RRSP: deduction limit.
  availableCents: number;
}

export interface ReportSettings {
  timeZone?: string;
  uninvestedCashDays?: number;
  uninvestedCashThresholdCents?: number;
  // Monthly total regardless of how often deposits are made.
  contributionTargetCents?: number;
  allocation?: AllocationTarget[];
  // Accounts the target and allocation apply to; all accounts when omitted.
  scopeAccountIds?: string[];
  room?: Partial<Record<RegisteredType, RoomSetting>>;
  // User tags override the brokerage account type; null marks non-registered.
  accountTypes?: Record<string, RegisteredType | null>;
  // User corrections for transfers that were really contributions, or the reverse.
  activityKinds?: Record<string, "contribution" | "transfer_in">;
}

type Defaulted =
  "timeZone" | "uninvestedCashDays" | "uninvestedCashThresholdCents";

export type ResolvedSettings = Required<Pick<ReportSettings, Defaulted>> &
  Omit<ReportSettings, Defaulted> & { baseCurrency: string };

export const DEFAULT_SETTINGS = {
  timeZone: "America/Toronto",
  baseCurrency: "CAD",
  uninvestedCashDays: 5,
  uninvestedCashThresholdCents: 25_00,
} as const;

// The currency shown without a code, and the one deposits are counted in for
// the monthly target. A TFSA, RRSP or FHSA means a Canadian investor, so CAD.
// Otherwise it is the currency holding the most value; comparing totals across
// currencies only picks this default and never converts a figure.
export function baseCurrencyOf(accounts: ReportAccount[]): string {
  if (accounts.some((a) => a.registeredType !== null)) return "CAD";
  const totals = new Map<string, number>();
  const add = (currency: string, cents: number) =>
    totals.set(currency, (totals.get(currency) ?? 0) + cents);
  for (const account of accounts) {
    for (const cash of account.cash ?? []) add(cash.currency, cash.cents);
    for (const h of account.holdings ?? []) {
      if (h.currency) add(h.currency, h.valueCents ?? 0);
    }
  }
  const fallback = DEFAULT_SETTINGS.baseCurrency;
  const ranked = [...totals].sort(
    ([a, x], [b, y]) =>
      y - x ||
      Number(b === fallback) - Number(a === fallback) ||
      a.localeCompare(b),
  );
  return ranked[0]?.[0] ?? fallback;
}

// Settings that depend only on the user's choices need no accounts; pass them
// whenever amounts are formatted or compared.
export function resolveSettings(
  settings: ReportSettings = {},
  accounts: ReportAccount[] = [],
): ResolvedSettings {
  return {
    ...settings,
    timeZone: settings.timeZone ?? DEFAULT_SETTINGS.timeZone,
    baseCurrency: baseCurrencyOf(accounts),
    uninvestedCashDays:
      settings.uninvestedCashDays ?? DEFAULT_SETTINGS.uninvestedCashDays,
    uninvestedCashThresholdCents:
      settings.uninvestedCashThresholdCents ??
      DEFAULT_SETTINGS.uninvestedCashThresholdCents,
  };
}

export type Status =
  | "On track"
  | "In progress"
  | "Attention"
  | "Not applicable"
  | "Not configured";

// Document model shared by the Markdown output and the web preview.
export type Inline = string | { bold: string };

export interface Column {
  label: string;
  align?: "left" | "right";
}

export type Block =
  | { kind: "heading"; level: 1 | 2; text: string; id: string }
  | {
      kind: "callout";
      callout: "summary" | "info" | "warning";
      title: string;
      lines: Inline[][];
    }
  | { kind: "table"; columns: Column[]; rows: string[][] }
  | { kind: "paragraph"; text: Inline[] }
  | { kind: "footer"; text: string };

export interface ReportDocument {
  frontmatter: [key: string, value: string][];
  blocks: Block[];
}
