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
  baseCurrency?: string;
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

export type ResolvedSettings = Required<
  Pick<
    ReportSettings,
    | "timeZone"
    | "baseCurrency"
    | "uninvestedCashDays"
    | "uninvestedCashThresholdCents"
  >
> &
  Omit<
    ReportSettings,
    | "timeZone"
    | "baseCurrency"
    | "uninvestedCashDays"
    | "uninvestedCashThresholdCents"
  >;

export const DEFAULT_SETTINGS = {
  timeZone: "America/Toronto",
  baseCurrency: "CAD",
  uninvestedCashDays: 5,
  uninvestedCashThresholdCents: 25_00,
} as const;

export function resolveSettings(
  settings: ReportSettings = {},
): ResolvedSettings {
  return {
    ...settings,
    timeZone: settings.timeZone ?? DEFAULT_SETTINGS.timeZone,
    baseCurrency: settings.baseCurrency ?? DEFAULT_SETTINGS.baseCurrency,
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
  frontmatter: [key: string, value: string | number | null][];
  blocks: Block[];
}
