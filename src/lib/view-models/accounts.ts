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

// The brokerage's name as its connection reports it ("Wealthsimple"), which
// can be shorter than an account's institution_name ("Wealthsimple Trade").
// The connection's own label (e.g. "Connection-1") is not a brokerage name.
export function brokerageName(
  connection: BrokerageAuthorization | undefined,
): string | null {
  return (
    text(connection?.brokerage?.display_name) ??
    text(connection?.brokerage?.name)
  );
}

// Brokerage names by connection ID, from a GET /authorizations response.
export function brokerageNames(raw: unknown): Map<string, string> {
  const names = new Map<string, string>();
  for (const connection of Array.isArray(raw) ? raw : []) {
    const id = text((connection as BrokerageAuthorization)?.id);
    const name = brokerageName(connection as BrokerageAuthorization);
    if (id && name) names.set(id, name);
  }
  return names;
}

// `brokerage` is the connection's name when known; institution_name is the
// fallback, and is also removed from the start of account names.
export function toAccountView(
  account: Account,
  brokerage?: string | null,
): AccountView | null {
  const id = text(account?.id);
  if (!id) {
    return null;
  }
  const reported = text(account.institution_name);
  const institution = text(brokerage) ?? reported ?? "Unknown institution";
  let name = text(account.name) ?? institution;
  for (const prefix of [reported, institution]) {
    if (prefix) name = withoutInstitutionPrefix(name, prefix);
  }
  return {
    id,
    connectionId: text(account.brokerage_authorization) ?? "",
    institution,
    name,
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

export const normalizeAccounts = (
  raw: unknown,
  names: Map<string, string> = new Map(),
) =>
  normalizeList(raw, (account: Account) =>
    toAccountView(
      account,
      names.get(text(account?.brokerage_authorization) ?? ""),
    ),
  );

export const normalizeConnections = (raw: unknown) =>
  normalizeList(raw, toConnectionView);

export interface InstitutionGroup {
  institution: string;
  accounts: AccountView[];
}

// Largest value first, comparing amounts only within one currency, since
// nothing is converted: main-currency accounts first, then other currencies
// grouped by code, then accounts without a value. Names break ties.
function compareAccounts(mainCurrency: string | undefined) {
  const rank = (account: AccountView) =>
    !account.total ? 2 : account.total.currency === mainCurrency ? 0 : 1;
  return (a: AccountView, b: AccountView) =>
    rank(a) - rank(b) ||
    (a.total?.currency ?? "").localeCompare(b.total?.currency ?? "") ||
    (b.total?.amount ?? 0) - (a.total?.amount ?? 0) ||
    a.name.localeCompare(b.name);
}

// Brokerages are ranked by their main-currency value, largest first. Those
// with nothing in the main currency follow in name order.
export function groupByInstitution(
  accounts: AccountView[],
  mainCurrency: string | undefined,
): InstitutionGroup[] {
  const groups = new Map<string, AccountView[]>();
  for (const account of accounts) {
    groups.set(account.institution, [
      ...(groups.get(account.institution) ?? []),
      account,
    ]);
  }
  const mainValue = (members: AccountView[]) => {
    const inMain = members.filter((a) => a.total?.currency === mainCurrency);
    return inMain.length === 0
      ? null
      : inMain.reduce((sum, a) => sum + (a.total?.amount ?? 0), 0);
  };
  return [...groups]
    .map(([institution, members]) => ({
      institution,
      accounts: members.sort(compareAccounts(mainCurrency)),
      value: mainValue(members),
    }))
    .sort(
      (a, b) =>
        Number(a.value === null) - Number(b.value === null) ||
        (b.value ?? 0) - (a.value ?? 0) ||
        a.institution.localeCompare(b.institution),
    )
    .map(({ institution, accounts: members }) => ({
      institution,
      accounts: members,
    }));
}

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
