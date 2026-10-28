import type { RawAccountData } from "@/lib/snaptrade/account-data";
import { dateOf, Ledger, type Instrument } from "@/lib/sample-data/ledger";
import { buildReport } from "./build-report";
import { normalizeAccountData } from "./normalize";
import { parsePeriod, type Period } from "./period";
import type { ReportSettings } from "./types";

// The landing page's illustrative report: a Wealthsimple TFSA buying exactly
// $500 of XEQT each month since January 2025 (about 95% of the account), plus
// small one-off purchases of NVIDIA and Amazon. Purchases are fractional and
// distributions are reinvested, so no cash sits idle. The stocks are CAD-listed
// CDRs, as commonly held in a TFSA, so the account stays in one currency and
// past months can show an estimated value from the account value history.

const INSTRUMENTS: Record<string, Instrument> = {
  XEQT: {
    listing: "XEQT.TO",
    description: "iShares Core Equity ETF Portfolio",
    currency: "CAD",
    price: 37.46,
    yearlyGrowth: 0.12,
  },
  NVDA: {
    listing: "NVDA.NE",
    description: "NVIDIA Corporation CDR (CAD Hedged)",
    currency: "CAD",
    price: 33.8,
    yearlyGrowth: 0.45,
  },
  AMZN: {
    listing: "AMZN.NE",
    description: "Amazon.com, Inc. CDR (CAD Hedged)",
    currency: "CAD",
    price: 27.4,
    yearlyGrowth: 0.18,
  },
};

export const EXAMPLE_NOW = new Date("2026-10-27T13:14:00.000Z");
export const EXAMPLE_PERIOD = parsePeriod("2026-10") as Period;

const TODAY = "2026-10-27";
// SnapTrade syncs transactions with a one-day delay.
const UNTIL = "2026-10-26";

function exampleAccount(): RawAccountData {
  const l = new Ledger("example", "CAD", INSTRUMENTS, UNTIL, TODAY);
  // Exactly $500 of XEQT each month, in fractional units.
  for (let month = 0; month < 22; month++) {
    l.deposit(dateOf(2025, month, 1), 500);
    l.buyAmount(dateOf(2025, month, 2), "XEQT", 500);
  }
  l.deposit(dateOf(2025, 6, 16), 200);
  l.buyAmount(dateOf(2025, 6, 17), "NVDA", 200);
  l.deposit(dateOf(2026, 1, 16), 250);
  l.buyAmount(dateOf(2026, 1, 17), "AMZN", 250);
  // Quarterly distributions, reinvested through a DRIP.
  for (const year of [2025, 2026]) {
    [0.11, 0.13, 0.12, 0.24].forEach((perUnit, quarter) =>
      l.distribute(dateOf(year, quarter * 3 + 2, 27), "XEQT", perUnit, {
        reinvest: true,
      }),
    );
  }
  l.settle();

  const syncedAt = "2026-10-27T12:00:00.000Z";
  return {
    account: {
      id: "example-tfsa",
      brokerage_authorization: "example-connection",
      name: "TFSA",
      number: "HQ8KZ1234",
      institution_name: "Wealthsimple",
      raw_type: "TFSA",
      account_category: "INVESTMENT",
      is_paper: false,
      balance: { total: { amount: l.valueOn(TODAY), currency: "CAD" } },
      sync_status: {
        holdings: { last_successful_sync: syncedAt },
        transactions: { first_transaction_date: l.firstDate() },
      },
    },
    balances: l.balances(),
    positions: { results: l.positions(), data_freshness: { as_of: syncedAt } },
    activities: l.activityHistory(),
    valueHistory: l.valueHistory(),
  };
}

export const EXAMPLE_ACCOUNT_DATA: RawAccountData[] = [exampleAccount()];

export const EXAMPLE_SETTINGS: ReportSettings = {
  contributionTargetCents: 500_00,
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
