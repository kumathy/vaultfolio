import "server-only";

import type {
  AccountPosition,
  AccountValueHistory,
  Activity,
  Balance,
} from "../types";

// Builds one mock account's history in SnapTrade's response shapes. Events
// are recorded in any order, then replayed by date so cash and units stay
// consistent: positions, balances, activities and value history all come from
// the same ledger.

export interface Instrument {
  listing: string;
  description: string;
  currency: string;
  // Price on the current date; earlier prices are derived from it.
  price: number;
  yearlyGrowth: number;
}

// The brokerage's own estimate for its converted account totals. Vaultfolio
// never converts currencies; this only fills SnapTrade's `balance.total` and
// value history, which arrive already converted.
const USD_IN_CAD = 1.37;

const DAY_MS = 86_400_000;

export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  return isoDay(new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS));
}

// Month index from 0; days past the month's end roll into the next month.
export const dateOf = (year: number, month: number, day: number) =>
  isoDay(new Date(Date.UTC(year, month, day)));

const round2 = (value: number) => Math.round(value * 100) / 100;

// A steady trend with a gentle wave, so month-end values differ and past
// prices are lower than today's.
export function priceOn(
  instrument: Instrument,
  date: string,
  today: string,
): number {
  const years = (Date.parse(today) - Date.parse(date)) / (365.25 * DAY_MS);
  const wave = 1 + 0.025 * Math.sin(Date.parse(date) / DAY_MS / 17);
  return round2(
    (instrument.price / (1 + instrument.yearlyGrowth) ** years) * wave,
  );
}

interface Snapshot {
  date: string;
  cash: Map<string, number>;
  units: Map<string, number>;
}

interface Pending {
  date: string;
  order: number;
  run: () => void;
}

export class Ledger {
  private readonly activities: Activity[] = [];
  private readonly cash = new Map<string, number>();
  private readonly units = new Map<string, number>();
  private readonly snapshots: Snapshot[] = [];
  private readonly pending: Pending[] = [];
  private sequence = 0;

  constructor(
    private readonly key: string,
    private readonly currency: string,
    private readonly instruments: Record<string, Instrument>,
    // Activities sync with a one-day delay, so nothing after this date exists.
    private readonly until: string,
    private readonly today: string,
  ) {
    this.cash.set(currency, 0);
  }

  deposit(date: string, amount: number, currency = this.currency) {
    this.later(date, () =>
      this.record(date, "CONTRIBUTION", amount, currency, {
        description: "Contribution",
      }),
    );
  }

  withdraw(date: string, amount: number, currency = this.currency) {
    this.later(date, () =>
      this.record(date, "WITHDRAWAL", -amount, currency, {
        description: "Withdrawal",
      }),
    );
  }

  transferIn(
    date: string,
    amount: number,
    description: string,
    currency = this.currency,
  ) {
    this.later(date, () =>
      this.record(date, "TRANSFER", amount, currency, { description }),
    );
  }

  // Spends `budget`, or all cash in the instrument's currency, on whole units.
  buy(date: string, symbol: string, budget?: number) {
    this.later(date, () => {
      const instrument = this.instruments[symbol];
      const price = priceOn(instrument, date, this.today);
      const available = (this.cash.get(instrument.currency) ?? 0) / 100;
      const count = Math.floor((budget ?? available) / price);
      if (count <= 0) return;
      this.record(date, "BUY", -round2(count * price), instrument.currency, {
        symbol,
        units: count,
        price,
        description: `Bought ${count} ${symbol}`,
      });
    });
  }

  // Sells enough whole units to raise at least `amount`.
  sellFor(date: string, symbol: string, amount: number) {
    this.later(date, () => {
      const instrument = this.instruments[symbol];
      const price = priceOn(instrument, date, this.today);
      const count = Math.min(
        Math.ceil(amount / price),
        this.units.get(symbol) ?? 0,
      );
      if (count <= 0) return;
      this.record(date, "SELL", round2(count * price), instrument.currency, {
        symbol,
        units: -count,
        price,
        description: `Sold ${count} ${symbol}`,
      });
    });
  }

  distribute(date: string, symbol: string, perUnit: number) {
    this.later(date, () => {
      const held = this.units.get(symbol) ?? 0;
      if (held <= 0) return;
      const instrument = this.instruments[symbol];
      this.record(
        date,
        "DIVIDEND",
        round2(held * perUnit),
        instrument.currency,
        { symbol, price: perUnit, description: `${symbol} distribution` },
      );
    });
  }

  fee(date: string, amount: number, description: string) {
    this.later(date, () =>
      this.record(date, "FEE", -amount, this.currency, { description }),
    );
  }

  interest(date: string, amount: number) {
    this.later(date, () =>
      this.record(date, "INTEREST", amount, this.currency, {
        description: "Interest",
      }),
    );
  }

  // Replays the recorded events in date order. Call once, after recording.
  settle(): this {
    this.pending
      .filter((event) => event.date <= this.until)
      .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)
      .forEach((event) => event.run());
    this.pending.length = 0;
    return this;
  }

  firstDate(): string | null {
    return this.snapshots[0]?.date ?? null;
  }

  // SnapTrade returns the newest activity first.
  activityHistory(): Activity[] {
    return [...this.activities].reverse();
  }

  balances(): Balance[] {
    return [...this.cash].map(([code, cents]) => ({
      currency: { code },
      cash: cents / 100,
    }));
  }

  positions(): AccountPosition[] {
    return [...this.units]
      .filter(([, count]) => count > 0)
      .map(([symbol, count]) => {
        const instrument = this.instruments[symbol];
        return {
          instrument: {
            symbol: instrument.listing,
            raw_symbol: symbol,
            description: instrument.description,
            currency: instrument.currency,
          },
          units: String(count),
          price: String(priceOn(instrument, this.today, this.today)),
          currency: instrument.currency,
        };
      });
  }

  // Total in the account's currency, converted the way a brokerage would.
  valueOn(date: string): number {
    const state = this.stateOn(date);
    const inAccountCurrency = (amount: number, currency: string) => {
      if (currency === this.currency) return amount;
      return this.currency === "CAD"
        ? amount * USD_IN_CAD
        : amount / USD_IN_CAD;
    };
    let total = 0;
    for (const [currency, cents] of state.cash) {
      total += inAccountCurrency(cents / 100, currency);
    }
    for (const [symbol, count] of state.units) {
      const instrument = this.instruments[symbol];
      total += inAccountCurrency(
        count * priceOn(instrument, date, this.today),
        instrument.currency,
      );
    }
    return round2(total);
  }

  // Daily values for up to a year, skipping dates inside `gaps`.
  valueHistory(gaps: [from: string, to: string][] = []): AccountValueHistory {
    const first = this.firstDate();
    const history: { date: string; total_value: string }[] = [];
    if (first) {
      const yearAgo = addDays(this.today, -365);
      let date = first > yearAgo ? first : yearAgo;
      for (; date <= this.until; date = addDays(date, 1)) {
        if (gaps.some(([from, to]) => date >= from && date <= to)) continue;
        history.push({ date, total_value: this.valueOn(date).toFixed(2) });
      }
    }
    return { currency: this.currency, history };
  }

  private later(date: string, run: () => void) {
    this.pending.push({ date, order: this.pending.length, run });
  }

  private stateOn(date: string): Snapshot {
    let state: Snapshot = {
      date,
      cash: new Map([[this.currency, 0]]),
      units: new Map(),
    };
    for (const snapshot of this.snapshots) {
      if (snapshot.date > date) break;
      state = snapshot;
    }
    return state;
  }

  private record(
    date: string,
    type: string,
    amount: number,
    currency: string,
    details: {
      symbol?: string;
      units?: number;
      price?: number;
      description: string;
    },
  ) {
    const amountCents = Math.round(amount * 100);
    this.cash.set(currency, (this.cash.get(currency) ?? 0) + amountCents);
    if (details.symbol && details.units) {
      const held = this.units.get(details.symbol) ?? 0;
      this.units.set(details.symbol, held + details.units);
    }
    const instrument = details.symbol
      ? this.instruments[details.symbol]
      : undefined;
    this.activities.push({
      id: `${this.key}-${date}-${++this.sequence}`,
      type,
      trade_date: `${date}T00:00:00.000Z`,
      settlement_date: `${date}T00:00:00.000Z`,
      amount: amountCents / 100,
      units: details.units ?? 0,
      price: details.price ?? 0,
      currency: { code: currency },
      symbol:
        instrument && details.symbol
          ? { symbol: instrument.listing, raw_symbol: details.symbol }
          : null,
      description: details.description,
    });
    this.snapshots.push({
      date,
      cash: new Map(this.cash),
      units: new Map(this.units),
    });
  }
}
