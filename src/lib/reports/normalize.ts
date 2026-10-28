import type { RawAccountData } from "@/lib/snaptrade/account-data";
import type {
  AccountValueHistory,
  AccountPosition,
  Activity as RawActivity,
  Balance,
} from "@/lib/snaptrade/types";
import { formatIsoDate } from "@/lib/format";
import { toAccountView, UNCLASSIFIED } from "@/lib/view-models/accounts";
import { activityKind, registeredType } from "./classify";
import { toCents } from "./money";
import type {
  Activity,
  CashBalance,
  Holding,
  ReportAccount,
  ReportSettings,
} from "./types";

const EXCLUDED_CATEGORIES = new Set(["DEPOSIT", "LOC", "ANNUITY"]);

const currencyCode = (value: unknown) =>
  typeof value === "string" && /^[A-Za-z]{3}$/.test(value)
    ? value.toUpperCase()
    : null;

const decimal = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

function toHolding(position: AccountPosition): Holding | null {
  const units = decimal(position.units);
  if (!units) return null;
  const instrument = position.instrument ?? {};
  const price = decimal(position.price);
  return {
    symbol: instrument.raw_symbol || instrument.symbol || "Unknown",
    description: instrument.description ?? null,
    units,
    price,
    valueCents: price === null ? null : toCents(units * price),
    currency: currencyCode(position.currency ?? instrument.currency),
  };
}

function toCash(balance: Balance): CashBalance | null {
  const currency = currencyCode(balance.currency?.code);
  const cash = decimal(balance.cash);
  return currency && cash !== null ? { currency, cents: toCents(cash) } : null;
}

function toActivity(
  activity: RawActivity,
  settings: ReportSettings,
): Activity | null {
  const date = formatIsoDate(activity.trade_date ?? activity.settlement_date);
  if (!date) return null;
  const amountCents = toCents(decimal(activity.amount) ?? 0);
  const units = decimal(activity.units) ?? 0;
  const type = activity.type ?? "UNKNOWN";
  const id = activity.id ?? `${date}-${type}-${amountCents}`;
  const kind =
    settings.activityKinds?.[id] ?? activityKind(type, amountCents, units);
  // Unit counts are reconstructed by summing these, so a sale must subtract
  // whichever sign the brokerage reports it with.
  const signedUnits =
    kind === "buy"
      ? Math.abs(units)
      : kind === "sell"
        ? -Math.abs(units)
        : units;
  return {
    id,
    date,
    kind,
    type,
    symbol: activity.symbol?.raw_symbol || activity.symbol?.symbol || null,
    units: signedUnits,
    price: decimal(activity.price),
    amountCents,
    currency: currencyCode(activity.currency?.code),
  };
}

const notNull = <T>(value: T | null): value is T => value !== null;

function toValueHistory(
  raw: AccountValueHistory | null | undefined,
): ReportAccount["valueHistory"] {
  const currency = currencyCode(raw?.currency);
  if (!raw || !currency || !Array.isArray(raw.history)) return null;
  const points = raw.history
    .map((item) => {
      const date = formatIsoDate(item.date);
      const value = decimal(item.total_value);
      return date && value !== null ? { date, cents: toCents(value) } : null;
    })
    .filter(notNull)
    .sort((a, b) => a.date.localeCompare(b.date));
  return points.length > 0 ? { currency, points } : null;
}

export function normalizeAccountData(
  data: RawAccountData[],
  settings: ReportSettings = {},
): ReportAccount[] {
  return data
    .filter(
      ({ account }) => !EXCLUDED_CATEGORIES.has(account.account_category ?? ""),
    )
    .flatMap(
      ({
        account,
        balances,
        positions,
        activities,
        valueHistory,
        rateLimited,
        brokerageName,
      }) => {
        const view = toAccountView(account, brokerageName);
        if (!view) return [];
        const tagged = settings.accountTypes?.[view.id];
        return {
          id: view.id,
          name: view.name,
          institution: view.institution,
          numberSuffix: view.numberSuffix,
          label: view.type,
          registeredType:
            tagged !== undefined
              ? tagged
              : view.type === UNCLASSIFIED
                ? null
                : registeredType(view.type),
          isPaper: view.isPaper,
          rateLimited: rateLimited ?? false,
          valueHistory: toValueHistory(valueHistory),
          holdings: positions
            ? (positions.results ?? []).map(toHolding).filter(notNull)
            : null,
          cash: balances ? balances.map(toCash).filter(notNull) : null,
          activities: activities
            ? activities
                .map((a) => toActivity(a, settings))
                .filter(notNull)
                .sort((a, b) => a.date.localeCompare(b.date))
            : null,
          firstTransactionDate: formatIsoDate(
            account.sync_status?.transactions?.first_transaction_date,
          ),
          dataAsOf: positions?.data_freshness?.as_of ?? null,
        } satisfies ReportAccount;
      },
    );
}
