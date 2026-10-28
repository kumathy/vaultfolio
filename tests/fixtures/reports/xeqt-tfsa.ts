import type { RawAccountData } from "@/lib/snaptrade/account-data";
import type { Activity } from "@/lib/snaptrade/types";
import { buildReport } from "@/lib/reports/build-report";
import { normalizeAccountData } from "@/lib/reports/normalize";
import { parsePeriod, type Period } from "@/lib/reports/period";
import type { ReportSettings } from "@/lib/reports/types";

// A TFSA with $300 monthly XEQT purchases, in SnapTrade's response shapes.
// Report tests check its exact figures; the landing page has its own example.

const cad = { code: "CAD" };
const xeqt = { symbol: "XEQT.TO", raw_symbol: "XEQT" };

const purchases: [month: string, units: number, amount: number][] = [
  ["2025-10", 9, 288.9],
  ["2025-11", 9, 291.6],
  ["2025-12", 9, 295.2],
  ["2026-01", 9, 298.8],
  ["2026-02", 9, 297.9],
  ["2026-03", 8, 276.0],
  ["2026-04", 9, 300.6],
  ["2026-05", 9, 305.1],
  ["2026-06", 9, 307.8],
  ["2026-07", 9, 311.4],
  ["2026-08", 8, 286.4],
  ["2026-09", 9, 324.9],
  ["2026-10", 9, 336.29],
];

const distributions: [date: string, amount: number, perUnit: number | null][] =
  [
    ["2025-12-29", 2.97, 0.11],
    ["2026-03-27", 4.24, null],
    ["2026-06-27", 7.2, 0.09],
    ["2026-09-29", 10.6, 0.1],
  ];

const at = (date: string) => `${date}T00:00:00.000Z`;

const activities: Activity[] = [
  ...purchases.flatMap(([month, units, amount]): Activity[] => [
    {
      id: `dep-${month}`,
      type: "CONTRIBUTION",
      trade_date: at(`${month}-01`),
      amount: 300,
      currency: cad,
      symbol: null,
      units: 0,
      price: 0,
      description: "Contribution",
    },
    {
      id: `buy-${month}`,
      type: "BUY",
      trade_date: at(`${month}-02`),
      amount: -amount,
      units,
      price: Math.round((amount / units) * 10_000) / 10_000,
      currency: cad,
      symbol: xeqt,
      description: "Bought XEQT",
    },
  ]),
  ...distributions.map(([date, amount, perUnit]): Activity => ({
    id: `div-${date}`,
    type: "DIVIDEND",
    trade_date: at(date),
    amount,
    units: 0,
    price: perUnit ?? 0,
    currency: cad,
    symbol: xeqt,
    description: "Distribution",
  })),
].reverse();

export const EXAMPLE_ACCOUNT_DATA: RawAccountData[] = [
  {
    account: {
      id: "example-tfsa",
      brokerage_authorization: "example-connection",
      name: "TFSA",
      number: "HQ8KZ1234",
      institution_name: "Wealthsimple",
      raw_type: "TFSA",
      account_category: "INVESTMENT",
      is_paper: false,
      balance: { total: { amount: 4312.55, currency: "CAD" } },
      sync_status: {
        transactions: { first_transaction_date: "2025-10-01" },
      },
    },
    balances: [{ currency: cad, cash: 4.12 }],
    positions: {
      results: [
        {
          instrument: {
            kind: "etf",
            symbol: "XEQT.TO",
            raw_symbol: "XEQT",
            description: "iShares Core Equity ETF Portfolio",
            currency: "CAD",
          },
          units: "115",
          price: "37.4646",
          currency: "CAD",
        },
      ],
      data_freshness: { as_of: "2026-10-27T12:00:00.000Z" },
    },
    activities,
  },
];

export const EXAMPLE_NOW = new Date("2026-10-27T13:14:00.000Z");
export const EXAMPLE_PERIOD = parsePeriod("2026-10") as Period;

export const EXAMPLE_SETTINGS: ReportSettings = {
  contributionTargetCents: 300_00,
  allocation: [{ symbol: "XEQT", weightPercent: 100 }],
  room: { TFSA: { year: 2026, availableCents: 7_000_00 } },
};

export function buildExampleReport(
  settings: ReportSettings = EXAMPLE_SETTINGS,
  period: Period = EXAMPLE_PERIOD,
) {
  return buildReport(
    { accounts: normalizeAccountData(EXAMPLE_ACCOUNT_DATA, settings) },
    { period, now: EXAMPLE_NOW, settings },
  );
}
