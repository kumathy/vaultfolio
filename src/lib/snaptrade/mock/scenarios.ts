import "server-only";

import type {
  Account,
  AccountPositionsResponse,
  AccountValueHistory,
  Activity,
  Balance,
  BrokerageAuthorization,
} from "../types";
import type { MockScenario } from "./config";
import {
  addDays,
  dateOf,
  isoDay,
  Ledger,
  type Instrument,
} from "@/lib/sample-data/ledger";

export type MockPart = "balances" | "positions" | "activities" | "valueHistory";

export interface MockAccount {
  account: Account;
  balances: Balance[];
  positions: AccountPositionsResponse;
  activities: Activity[];
  valueHistory: AccountValueHistory;
  // HTTP status returned instead of the data, to exercise partial failures.
  failures: Partial<Record<MockPart, number>>;
}

export interface MockData {
  authorizations: BrokerageAuthorization[];
  accounts: MockAccount[];
}

// Stable IDs, so settings saved against mock accounts survive restarts.
export const MOCK_IDS = {
  wealthsimple: "c0000000-0000-4000-8000-000000000001",
  questrade: "c0000000-0000-4000-8000-000000000002",
  ibkr: "c0000000-0000-4000-8000-000000000003",
  td: "c0000000-0000-4000-8000-000000000004",
  fidelity: "c0000000-0000-4000-8000-000000000005",
  sandbox: "c0000000-0000-4000-8000-000000000006",
  tfsa: "a0000000-0000-4000-8000-000000000001",
  rrsp: "a0000000-0000-4000-8000-000000000002",
  fhsa: "a0000000-0000-4000-8000-000000000003",
  margin: "a0000000-0000-4000-8000-000000000004",
  cashOnly: "a0000000-0000-4000-8000-000000000005",
  personal: "a0000000-0000-4000-8000-000000000006",
  usIndividual: "a0000000-0000-4000-8000-000000000007",
  usRoth: "a0000000-0000-4000-8000-000000000008",
  sandboxAccount: "a0000000-0000-4000-8000-000000000009",
} as const;

const INSTRUMENTS: Record<string, Instrument> = {
  XEQT: {
    listing: "XEQT.TO",
    description: "iShares Core Equity ETF Portfolio",
    currency: "CAD",
    price: 36.8,
    yearlyGrowth: 0.11,
  },
  VEQT: {
    listing: "VEQT.TO",
    description: "Vanguard All-Equity ETF Portfolio",
    currency: "CAD",
    price: 47.2,
    yearlyGrowth: 0.1,
  },
  VFV: {
    listing: "VFV.TO",
    description: "Vanguard S&P 500 Index ETF",
    currency: "CAD",
    price: 158.4,
    yearlyGrowth: 0.14,
  },
  TD: {
    listing: "TD.TO",
    description: "Toronto-Dominion Bank",
    currency: "CAD",
    price: 92.15,
    yearlyGrowth: 0.06,
  },
  SHOP: {
    listing: "SHOP.TO",
    description: "Shopify Inc.",
    currency: "CAD",
    price: 168.3,
    yearlyGrowth: 0.25,
  },
  AAPL: {
    listing: "AAPL",
    description: "Apple Inc.",
    currency: "USD",
    price: 262.1,
    yearlyGrowth: 0.12,
  },
  VTI: {
    listing: "VTI",
    description: "Vanguard Total Stock Market ETF",
    currency: "USD",
    price: 318.4,
    yearlyGrowth: 0.12,
  },
  VOO: {
    listing: "VOO",
    description: "Vanguard S&P 500 ETF",
    currency: "USD",
    price: 590.2,
    yearlyGrowth: 0.13,
  },
};

interface Clock {
  now: Date;
  today: string;
  until: string;
  year: number;
  month: number;
}

function clock(now: Date): Clock {
  const today = isoDay(now);
  return {
    now,
    today,
    until: addDays(today, -1),
    year: now.getUTCFullYear(),
    month: now.getUTCMonth(),
  };
}

// Calls `run` for each month from `monthsBack` months ago to the current one.
function eachMonth(
  c: Clock,
  monthsBack: number,
  run: (year: number, month: number, current: boolean) => void,
) {
  for (let back = monthsBack; back >= 0; back--) {
    const first = new Date(Date.UTC(c.year, c.month - back, 1));
    run(first.getUTCFullYear(), first.getUTCMonth(), back === 0);
  }
}

// Quarterly payments in March, June, September and December.
function quarterly(
  c: Clock,
  fromYear: number,
  day: number,
  run: (date: string, quarter: number) => void,
) {
  for (let year = fromYear; year <= c.year; year++) {
    [2, 5, 8, 11].forEach((month, quarter) =>
      run(dateOf(year, month, day), quarter),
    );
  }
}

const ledger = (c: Clock, key: string, currency = "CAD") =>
  new Ledger(key, currency, INSTRUMENTS, c.until, c.today);

// No value within 8 days of the month end four months ago, so that month's
// value and growth show "Not available".
function historyGap(c: Clock): [string, string] {
  const monthEnd = dateOf(c.year, c.month - 3, 0);
  return [addDays(monthEnd, -8), addDays(monthEnd, 8)];
}

function mockAccount(
  c: Clock,
  options: {
    id: string;
    connection: string;
    name: string;
    institution: string;
    rawType: string | null;
    number: string;
    ledger: Ledger;
    currency?: string;
    failures?: MockAccount["failures"];
    withActivities?: boolean;
    withHistory?: boolean;
  },
): MockAccount {
  const l = options.ledger;
  const synced = new Date(c.now.getTime() - 2 * 3_600_000).toISOString();
  return {
    account: {
      id: options.id,
      brokerage_authorization: options.connection,
      name: options.name,
      number: options.number,
      institution_name: options.institution,
      raw_type: options.rawType,
      account_category: "INVESTMENT",
      status: "open",
      is_paper: false,
      balance: {
        total: {
          amount: l.valueOn(c.today),
          currency: options.currency ?? "CAD",
        },
      },
      sync_status: {
        holdings: {
          initial_sync_completed: true,
          last_successful_sync: synced,
        },
        transactions: {
          initial_sync_completed: true,
          last_successful_sync: `${c.until}T06:00:00.000Z`,
          first_transaction_date:
            options.withActivities === false ? null : l.firstDate(),
        },
      },
    },
    balances: l.balances(),
    positions: { results: l.positions(), data_freshness: { as_of: synced } },
    activities: options.withActivities === false ? [] : l.activityHistory(),
    valueHistory: l.valueHistory(
      options.withHistory === false ? [] : [historyGap(c)],
    ),
    failures: {
      ...(options.withHistory === false ? { valueHistory: 403 } : {}),
      ...options.failures,
    },
  };
}

// Monthly XEQT purchases for two years, quarterly distributions, and a
// withdrawal last year re-contributed this year. This month's deposit is left
// uninvested, which raises the uninvested-cash check after five days.
function tfsa(c: Clock): MockAccount {
  const l = ledger(c, "tfsa");
  eachMonth(c, 24, (year, month, current) => {
    l.deposit(dateOf(year, month, 2), 500);
    if (!current) l.buy(dateOf(year, month, 4), "XEQT");
  });
  quarterly(c, c.year - 2, 27, (date, q) =>
    l.distribute(date, "XEQT", [0.11, 0.13, 0.12, 0.24][q]),
  );
  l.sellFor(dateOf(c.year - 1, 7, 13), "XEQT", 2000);
  l.withdraw(dateOf(c.year - 1, 7, 15), 2000);
  l.deposit(dateOf(c.year, 1, 10), 2000);
  l.buy(dateOf(c.year, 1, 12), "XEQT");
  return mockAccount(c, {
    id: MOCK_IDS.tfsa,
    connection: MOCK_IDS.wealthsimple,
    name: "Wealthsimple TFSA",
    institution: "Wealthsimple",
    rawType: "TFSA",
    number: "HQ8KZ1TF",
    ledger: l.settle(),
  });
}

// VFV each month, a CAD transfer from another RRSP this year (not a new
// contribution) and a USD transfer last year that bought VTI.
function rrsp(c: Clock): MockAccount {
  const l = ledger(c, "rrsp");
  eachMonth(c, 12, (year, month) => {
    l.deposit(dateOf(year, month, 15), 400);
    l.buy(dateOf(year, month, 16), "VFV");
  });
  l.transferIn(
    dateOf(c.year - 1, 5, 10),
    1500,
    "Transfer in from RRSP at another institution (USD)",
    "USD",
  );
  l.buy(dateOf(c.year - 1, 5, 12), "VTI");
  l.transferIn(
    dateOf(c.year, 2, 5),
    5000,
    "Transfer in from RRSP at another institution",
  );
  l.buy(dateOf(c.year, 2, 7), "VFV");
  quarterly(c, c.year - 1, 23, (date) => l.distribute(date, "VFV", 0.19));
  quarterly(c, c.year - 1, 25, (date) => l.distribute(date, "VTI", 0.92));
  return mockAccount(c, {
    id: MOCK_IDS.rrsp,
    connection: MOCK_IDS.questrade,
    name: "Questrade RRSP",
    institution: "Questrade",
    rawType: "RRSP",
    number: "51842207",
    ledger: l.settle(),
  });
}

// Opened in April last year with two lump sums, then monthly deposits.
function fhsa(c: Clock): MockAccount {
  const l = ledger(c, "fhsa");
  l.deposit(dateOf(c.year - 1, 3, 3), 4000);
  l.buy(dateOf(c.year - 1, 3, 5), "XEQT");
  l.deposit(dateOf(c.year - 1, 10, 3), 4000);
  l.buy(dateOf(c.year - 1, 10, 5), "XEQT");
  eachMonth(c, c.month, (year, month) => {
    l.deposit(dateOf(year, month, 8), 250);
    l.buy(dateOf(year, month, 10), "XEQT");
  });
  quarterly(c, c.year - 1, 27, (date, q) =>
    l.distribute(date, "XEQT", [0.11, 0.13, 0.12, 0.24][q]),
  );
  return mockAccount(c, {
    id: MOCK_IDS.fhsa,
    connection: MOCK_IDS.wealthsimple,
    name: "Wealthsimple FHSA",
    institution: "Wealthsimple",
    rawType: "FHSA",
    number: "HQ8KZ1FH",
    ledger: l.settle(),
  });
}

// Non-registered: individual stocks in CAD and USD, a sale, and fees.
function margin(c: Clock): MockAccount {
  const l = ledger(c, "margin");
  const start = new Date(Date.UTC(c.year, c.month - 22, 1));
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth();
  l.deposit(dateOf(y, m, 5), 3000);
  l.buy(dateOf(y, m, 7), "SHOP", 2500);
  l.fee(dateOf(y, m, 7), 9.99, "Commission");
  l.deposit(dateOf(y, m + 3, 8), 2000, "USD");
  l.buy(dateOf(y, m + 3, 9), "AAPL", 1800);
  l.sellFor(dateOf(c.year - 1, 9, 14), "SHOP", 800);
  l.fee(dateOf(c.year - 1, 9, 14), 9.99, "Commission");
  l.deposit(dateOf(c.year, 0, 20), 1000);
  l.buy(dateOf(c.year, 0, 21), "TD", 900);
  for (let year = c.year - 2; year <= c.year; year++) {
    for (const month of [1, 4, 7, 10]) {
      l.distribute(dateOf(year, month, 15), "AAPL", 0.26);
    }
    l.distribute(dateOf(year, 3, 30), "TD", 1.05);
    l.distribute(dateOf(year, 9, 31), "TD", 1.05);
  }
  return mockAccount(c, {
    id: MOCK_IDS.margin,
    connection: MOCK_IDS.questrade,
    name: "Questrade Margin",
    institution: "Questrade",
    rawType: "Margin",
    number: "51842311",
    ledger: l.settle(),
  });
}

// Cash only. Transactions fail with HTTP 429, SnapTrade's rate limit.
function cashOnly(c: Clock): MockAccount {
  const l = ledger(c, "cash");
  eachMonth(c, 6, (year, month) => {
    l.deposit(dateOf(year, month, 20), 250);
    l.interest(dateOf(year, month, 28), 1.2);
  });
  return mockAccount(c, {
    id: MOCK_IDS.cashOnly,
    connection: MOCK_IDS.ibkr,
    name: "IBKR Individual",
    institution: "Interactive Brokers",
    rawType: "Individual",
    number: "U7741052",
    ledger: l.settle(),
    failures: { activities: 429 },
  });
}

// Holdings fail to load (HTTP 500); the rest of the account still appears.
function personal(c: Clock): MockAccount {
  const l = ledger(c, "personal");
  l.deposit(dateOf(c.year - 1, 0, 10), 2000);
  l.buy(dateOf(c.year - 1, 0, 12), "VEQT");
  l.distribute(dateOf(c.year - 1, 11, 29), "VEQT", 0.55);
  return mockAccount(c, {
    id: MOCK_IDS.personal,
    connection: MOCK_IDS.wealthsimple,
    name: "Wealthsimple Personal",
    institution: "Wealthsimple",
    rawType: "Non-registered",
    number: "HQ8KZ1NR",
    ledger: l.settle(),
    failures: { positions: 500 },
  });
}

function full(c: Clock): MockData {
  return {
    authorizations: [
      connection(MOCK_IDS.wealthsimple, "Wealthsimple"),
      connection(MOCK_IDS.questrade, "Questrade"),
      connection(MOCK_IDS.ibkr, "Interactive Brokers"),
      {
        ...connection(MOCK_IDS.td, "TD Direct Investing"),
        disabled: true,
        disabled_date: new Date(c.now.getTime() - 3 * 86_400_000).toISOString(),
      },
    ],
    accounts: [tfsa(c), rrsp(c), fhsa(c), margin(c), cashOnly(c), personal(c)],
  };
}

// A US investor: everything in USD, and a Roth IRA, which is not a Canadian
// registered account.
function us(c: Clock): MockData {
  const individual = ledger(c, "us-ind", "USD");
  eachMonth(c, 18, (year, month) => {
    individual.deposit(dateOf(year, month, 1), 300);
    individual.buy(dateOf(year, month, 3), "VOO");
  });
  const start = new Date(Date.UTC(c.year, c.month - 18, 1));
  individual.deposit(
    dateOf(start.getUTCFullYear(), start.getUTCMonth(), 10),
    1000,
  );
  individual.buy(
    dateOf(start.getUTCFullYear(), start.getUTCMonth(), 11),
    "AAPL",
    1000,
  );
  quarterly(c, c.year - 2, 26, (date) =>
    individual.distribute(date, "VOO", 1.7),
  );

  const roth = ledger(c, "us-roth", "USD");
  eachMonth(c, 12, (year, month) => {
    roth.deposit(dateOf(year, month, 5), 500);
    roth.buy(dateOf(year, month, 6), "VTI");
  });
  quarterly(c, c.year - 1, 25, (date) => roth.distribute(date, "VTI", 0.92));

  return {
    authorizations: [connection(MOCK_IDS.fidelity, "Fidelity")],
    accounts: [
      mockAccount(c, {
        id: MOCK_IDS.usIndividual,
        connection: MOCK_IDS.fidelity,
        name: "Fidelity Individual",
        institution: "Fidelity",
        rawType: "Individual",
        number: "Z38841207",
        currency: "USD",
        ledger: individual.settle(),
      }),
      mockAccount(c, {
        id: MOCK_IDS.usRoth,
        connection: MOCK_IDS.fidelity,
        name: "Fidelity Roth IRA",
        institution: "Fidelity",
        rawType: "Roth IRA",
        number: "Z38841311",
        currency: "USD",
        ledger: roth.settle(),
      }),
    ],
  };
}

// Like the SnapTrade Sandbox brokerage: positions and cash, no transactions,
// no account type, and no value history (the add-on returns 403).
function sandbox(c: Clock): MockData {
  const l = ledger(c, "sandbox");
  l.deposit(dateOf(c.year, c.month, 0), 10_000);
  l.buy(dateOf(c.year, c.month, 0), "VFV", 4000);
  l.buy(dateOf(c.year, c.month, 0), "SHOP", 2000);
  return {
    authorizations: [
      { id: MOCK_IDS.sandbox, name: "Sandbox connection", brokerage: {} },
    ],
    accounts: [
      mockAccount(c, {
        id: MOCK_IDS.sandboxAccount,
        connection: MOCK_IDS.sandbox,
        name: "Sandbox Account",
        institution: "SnapTrade Sandbox",
        rawType: null,
        number: "SANDBOX01",
        ledger: l.settle(),
        withActivities: false,
        withHistory: false,
      }),
    ],
  };
}

function connection(id: string, name: string): BrokerageAuthorization {
  return {
    id,
    name: `${name} connection`,
    disabled: false,
    disabled_date: null,
    brokerage: { name, display_name: name },
  };
}

const scenarios: Record<MockScenario, (c: Clock) => MockData> = {
  full,
  us,
  sandbox,
  empty: () => ({ authorizations: [], accounts: [] }),
};

// Generated once per scenario and day; dates move with the calendar.
const generated = new Map<string, MockData>();

export function mockData(scenario: MockScenario, now = new Date()): MockData {
  const key = `${scenario}:${isoDay(now)}`;
  let data = generated.get(key);
  if (!data) {
    data = scenarios[scenario](clock(now));
    generated.clear();
    generated.set(key, data);
  }
  return data;
}
