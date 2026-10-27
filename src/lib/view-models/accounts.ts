import { formatIsoDate } from "@/lib/format";
import type { Account, BrokerageAuthorization } from "@/lib/snaptrade/types";

export interface MoneyView {
  amount: number;
  currency: string;
}

export interface AccountView {
  id: string;
  connectionId: string;
  institution: string;
  name: string;
  numberSuffix: string | null;
  type: string;
  total: MoneyView | null;
  holdingsSyncedOn: string | null;
  isPaper: boolean;
}

export interface ConnectionView {
  id: string;
  brokerage: string;
  disabled: boolean;
  disabledOn: string | null;
}

export const UNCLASSIFIED = "Unclassified";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function money(value: Account["balance"]["total"]): MoneyView | null {
  const amount = value?.amount;
  const currency = text(value?.currency)?.toUpperCase();
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return null;
  }
  if (!currency || !/^[A-Z]{3}$/.test(currency)) {
    return null;
  }
  return { amount, currency };
}

// Account numbers may be masked by the brokerage; only the last four
// characters are ever displayed.
function numberSuffix(value: unknown): string | null {
  const characters = text(value)?.replace(/[^A-Za-z0-9]/g, "");
  return characters ? characters.slice(-4) : null;
}

function withoutInstitutionPrefix(name: string, institution: string): string {
  const prefixPattern = new RegExp(
    `^${institution.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\-–—:·|]+`,
    "i",
  );
  const rest = name.replace(prefixPattern, "");
  return rest && rest !== name ? rest : name;
}

export function toAccountView(account: Account): AccountView | null {
  const id = text(account?.id);
  if (!id) {
    return null;
  }
  const institution = text(account.institution_name) ?? "Unknown institution";
  return {
    id,
    connectionId: text(account.brokerage_authorization) ?? "",
    institution,
    name: withoutInstitutionPrefix(
      text(account.name) ?? institution,
      institution,
    ),
    numberSuffix: numberSuffix(account.number),
    type: text(account.raw_type) ?? UNCLASSIFIED,
    total: money(account.balance?.total),
    holdingsSyncedOn: formatIsoDate(
      account.sync_status?.holdings?.last_successful_sync,
    ),
    isPaper: account.is_paper === true,
  };
}

export function toConnectionView(
  connection: BrokerageAuthorization,
): ConnectionView | null {
  const id = text(connection?.id);
  if (!id) {
    return null;
  }
  return {
    id,
    brokerage:
      text(connection.brokerage?.display_name) ??
      text(connection.brokerage?.name) ??
      text(connection.name) ??
      "Unknown brokerage",
    disabled: connection.disabled === true,
    disabledOn: formatIsoDate(connection.disabled_date),
  };
}

function normalizeList<T, V>(
  raw: unknown,
  normalize: (item: T) => V | null,
): V[] {
  if (!Array.isArray(raw)) {
    throw new Error("Expected a list in the SnapTrade response");
  }
  return raw
    .map((item) => normalize(item as T))
    .filter((view): view is V => view !== null);
}

export const normalizeAccounts = (raw: unknown) =>
  normalizeList(raw, toAccountView);

export const normalizeConnections = (raw: unknown) =>
  normalizeList(raw, toConnectionView);

// No currency conversion: amounts are only ever summed within one currency.
export function totalsByCurrency(accounts: AccountView[]): MoneyView[] {
  const totals = new Map<string, number>();
  for (const { total } of accounts) {
    if (total) {
      totals.set(
        total.currency,
        (totals.get(total.currency) ?? 0) + total.amount,
      );
    }
  }
  return [...totals]
    .map(([currency, amount]) => ({
      currency,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
