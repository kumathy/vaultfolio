import type { RawAccountData } from "@/lib/snaptrade/account-data";
import type { Activity } from "@/lib/snaptrade/types";

// Synthetic SnapTrade responses for report tests. No real brokerage data.

let sequence = 0;
const nextId = () => `act-${++sequence}`;
const at = (date: string) => `${date}T00:00:00.000Z`;
const money = (code: string) => ({ code });

export const act = {
  deposit: (date: string, amount: number, currency = "CAD"): Activity => ({
    id: nextId(),
    type: "CONTRIBUTION",
    trade_date: at(date),
    amount,
    units: 0,
    currency: money(currency),
    symbol: null,
  }),
  withdrawal: (date: string, amount: number, currency = "CAD"): Activity => ({
    id: nextId(),
    type: "WITHDRAWAL",
    trade_date: at(date),
    amount: -amount,
    units: 0,
    currency: money(currency),
    symbol: null,
  }),
  transferIn: (date: string, amount: number, currency = "CAD"): Activity => ({
    id: nextId(),
    type: "TRANSFER",
    trade_date: at(date),
    amount,
    units: 0,
    currency: money(currency),
    symbol: null,
  }),
  buy: (
    date: string,
    symbol: string,
    units: number,
    amount: number,
    currency = "CAD",
  ): Activity => ({
    id: nextId(),
    type: "BUY",
    trade_date: at(date),
    amount: -amount,
    units,
    price: amount / units,
    currency: money(currency),
    symbol: { symbol, raw_symbol: symbol },
  }),
  sell: (
    date: string,
    symbol: string,
    units: number,
    amount: number,
    currency = "CAD",
  ): Activity => ({
    id: nextId(),
    type: "SELL",
    trade_date: at(date),
    amount,
    units,
    price: amount / units,
    currency: money(currency),
    symbol: { symbol, raw_symbol: symbol },
  }),
  dividend: (
    date: string,
    symbol: string,
    amount: number,
    perUnit = 0,
    currency = "CAD",
  ): Activity => ({
    id: nextId(),
    type: "DIVIDEND",
    trade_date: at(date),
    amount,
    units: 0,
    price: perUnit,
    currency: money(currency),
    symbol: { symbol, raw_symbol: symbol },
  }),
};

export interface AccountOptions {
  id: string;
  name?: string;
  rawType?: string | null;
  institution?: string;
  isPaper?: boolean;
  cash?: [currency: string, amount: number][];
  positions?: [
    symbol: string,
    units: number,
    price: number,
    currency?: string,
  ][];
  activities?: Activity[] | null;
  firstTransactionDate?: string;
  holdingsAsOf?: string;
  rateLimited?: boolean;
  // [date, value] pairs from SnapTrade's account value history.
  valueHistory?: [date: string, value: number][];
}

export function rawAccount(options: AccountOptions): RawAccountData {
  return {
    account: {
      id: options.id,
      brokerage_authorization: "conn-1",
      name: options.name ?? options.rawType ?? "Account",
      number: `0000${options.id.length}`,
      institution_name: options.institution ?? "Wealthsimple",
      raw_type: options.rawType === undefined ? "TFSA" : options.rawType,
      account_category: "INVESTMENT",
      is_paper: options.isPaper ?? false,
      balance: {},
      sync_status: {
        transactions: {
          first_transaction_date: options.firstTransactionDate ?? null,
        },
      },
    },
    balances: (options.cash ?? [["CAD", 0]]).map(([code, cash]) => ({
      currency: { code },
      cash,
    })),
    positions: {
      results: (options.positions ?? []).map(
        ([symbol, units, price, currency = "CAD"]) => ({
          instrument: { symbol, raw_symbol: symbol, currency },
          units: String(units),
          price: String(price),
          currency,
        }),
      ),
      data_freshness: { as_of: options.holdingsAsOf ?? null },
    },
    rateLimited: options.rateLimited,
    valueHistory: options.valueHistory
      ? {
          currency: "CAD",
          history: options.valueHistory.map(([date, value]) => ({
            date,
            total_value: String(value),
          })),
        }
      : null,
    activities:
      options.activities === null
        ? null
        : [...(options.activities ?? [])].reverse(),
  };
}
