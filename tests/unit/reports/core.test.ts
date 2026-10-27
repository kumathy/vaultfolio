import { describe, expect, it } from "vitest";
import { activityKind, registeredType } from "@/lib/reports/classify";
import { money, perUnit, signedMoney, units } from "@/lib/reports/money";
import { normalizeAccountData } from "@/lib/reports/normalize";
import {
  addDays,
  addMonths,
  daysBetween,
  localDate,
  localDateTime,
  localTimestamp,
  parsePeriod,
} from "@/lib/reports/period";
import { resolveSettings } from "@/lib/reports/types";
import type { RawAccountData } from "@/lib/snaptrade/account-data";

describe("activityKind", () => {
  it.each([
    ["CONTRIBUTION", 30000, 0, "contribution"],
    ["CONTRIBUTION", -30000, 0, "withdrawal"],
    ["WITHDRAWAL", -5000, 0, "withdrawal"],
    ["TRANSFER", 100000, 0, "transfer_in"],
    ["TRANSFER", -100000, 0, "transfer_out"],
    ["TRANSFER", 0, 12, "transfer_in"],
    ["EXTERNAL_ASSET_TRANSFER_IN", 0, 0, "transfer_in"],
    ["BUY", -29587, 9, "buy"],
    ["SELL", 10000, -2, "sell"],
    ["REI", -1140, 0.3, "reinvestment"],
    ["DIVIDEND", 1140, 0, "distribution"],
    ["SUBSTITUTE_DIVIDEND", 500, 0, "distribution"],
    ["INTEREST", 12, 0, "interest"],
    ["FEE", -100, 0, "fee"],
    ["TAX", -100, 0, "fee"],
    ["SPLIT", 0, 10, "other"],
    ["BROKERAGE_SPECIFIC", 50, 0, "other"],
    ["buy", -100, 1, "buy"],
  ] as const)("%s %d cents %d units → %s", (type, cents, u, kind) => {
    expect(activityKind(type, cents, u)).toBe(kind);
  });
});

describe("registeredType", () => {
  it.each([
    ["TFSA", "TFSA"],
    ["Tax-Free Savings Account", "TFSA"],
    ["RRSP", "RRSP"],
    ["Spousal RRSP", "RRSP"],
    ["RSP", "RRSP"],
    ["FHSA", "FHSA"],
    ["First Home Savings Account", "FHSA"],
    ["LRSP", null],
    ["LIRA", null],
    ["Margin", null],
    ["Cash", null],
  ] as const)("%s → %s", (text, type) => {
    expect(registeredType(text)).toBe(type);
  });

  it("checks each description in order and ignores missing ones", () => {
    expect(registeredType(null, "Margin", "My TFSA")).toBe("TFSA");
  });
});

describe("period", () => {
  it("parses calendar months", () => {
    expect(parsePeriod("2026-02")).toEqual({
      id: "2026-02",
      year: 2026,
      month: 2,
      start: "2026-02-01",
      end: "2026-02-28",
      label: "February 2026",
    });
    expect(parsePeriod("2028-02")?.end).toBe("2028-02-29");
  });

  it("rejects malformed periods", () => {
    for (const id of ["2026-13", "2026-00", "26-10", "2026-1", "x"]) {
      expect(parsePeriod(id)).toBeNull();
    }
  });

  it("uses the configured time zone for dates", () => {
    const lateEvening = new Date("2026-11-01T02:30:00Z");
    expect(localDate(lateEvening, "America/Toronto")).toBe("2026-10-31");
    expect(localDate(lateEvening, "UTC")).toBe("2026-11-01");
    expect(localDateTime(lateEvening, "America/Toronto")).toBe(
      "2026-10-31 22:30 EDT",
    );
    expect(localTimestamp(lateEvening, "America/Toronto")).toBe(
      "2026-10-31T22:30:00-04:00",
    );
    expect(
      localTimestamp(new Date("2026-12-01T15:00:00Z"), "America/Halifax"),
    ).toBe("2026-12-01T11:00:00-04:00");
  });

  it("keeps whole-hour offsets when the time has seconds", () => {
    for (const seconds of ["00", "29", "30", "45", "59"]) {
      expect(
        localTimestamp(
          new Date(`2026-10-27T21:45:${seconds}.900Z`),
          "America/Toronto",
        ),
      ).toBe("2026-10-27T17:45:00-04:00");
    }
    expect(
      localTimestamp(new Date("2026-07-01T12:00:45Z"), "Asia/Kolkata"),
    ).toBe("2026-07-01T17:30:00+05:30");
  });

  it("does date arithmetic on calendar days", () => {
    expect(daysBetween("2026-10-01", "2026-10-27")).toBe(26);
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addMonths(parsePeriod("2026-11")!, 3).id).toBe("2027-02");
    expect(addMonths(parsePeriod("2026-01")!, -1).id).toBe("2025-12");
  });
});

describe("money formatting", () => {
  it("adds the currency code only outside the base currency", () => {
    expect(money(431255, "CAD", "CAD")).toBe("$4,312.55");
    expect(money(25050, "USD", "CAD")).toBe("$250.50 USD");
    expect(signedMoney(41255, "CAD", "CAD")).toBe("+$412.55");
    expect(signedMoney(-1200, "CAD", "CAD")).toBe("-$12.00");
    expect(signedMoney(0, "CAD", "CAD")).toBe("$0.00");
  });

  it("formats units and per-unit amounts", () => {
    expect(units(115)).toBe("115");
    expect(units(1234.56789)).toBe("1,234.5679");
    expect(perUnit(0.1, "CAD", "CAD")).toBe("$0.1000");
  });
});

describe("resolveSettings", () => {
  it("applies defaults, including for explicit undefined", () => {
    expect(resolveSettings({ timeZone: undefined })).toMatchObject({
      timeZone: "America/Toronto",
      baseCurrency: "CAD",
      uninvestedCashDays: 5,
      uninvestedCashThresholdCents: 2500,
    });
  });
});

describe("normalizeAccountData", () => {
  const raw: RawAccountData = {
    account: {
      id: "acc-1",
      brokerage_authorization: "conn-1",
      name: "Wealthsimple Trade TFSA",
      number: "HQ8KZ1hrg",
      institution_name: "Wealthsimple Trade",
      raw_type: "TFSA",
      is_paper: false,
      balance: {},
      sync_status: { transactions: { first_transaction_date: "2024-01-03" } },
    },
    balances: [
      { currency: { code: "cad" }, cash: 4.12 },
      { currency: null, cash: 10 },
    ],
    positions: {
      results: [
        {
          instrument: {
            symbol: "XEQT.TO",
            raw_symbol: "XEQT",
            currency: "CAD",
          },
          units: "115.0",
          price: "37.4646",
          currency: "CAD",
        },
        { instrument: { raw_symbol: "ZERO" }, units: "0", price: "1" },
      ],
      data_freshness: { as_of: "2026-10-27T13:00:00Z" },
    },
    activities: [
      {
        id: "b",
        type: "BUY",
        trade_date: "2026-10-02T00:00:00Z",
        amount: -295.87,
        units: 9,
        price: 32.874,
        currency: { code: "CAD" },
        symbol: { symbol: "XEQT.TO", raw_symbol: "XEQT" },
      },
      {
        id: "a",
        type: "CONTRIBUTION",
        trade_date: "2026-10-01T00:00:00Z",
        amount: 300,
        currency: { code: "CAD" },
      },
      { id: "no-date", type: "FEE", amount: -1 },
    ],
  };

  it("maps accounts, holdings, cash and activities", () => {
    const [account] = normalizeAccountData([raw]);
    expect(account).toMatchObject({
      id: "acc-1",
      name: "TFSA",
      label: "TFSA",
      registeredType: "TFSA",
      firstTransactionDate: "2024-01-03",
      dataAsOf: "2026-10-27T13:00:00Z",
      cash: [{ currency: "CAD", cents: 412 }],
      holdings: [
        {
          symbol: "XEQT",
          units: 115,
          price: 37.4646,
          valueCents: 430843,
          currency: "CAD",
        },
      ],
    });
    expect(
      account.activities?.map((a) => [a.id, a.kind, a.amountCents]),
    ).toEqual([
      ["a", "contribution", 30000],
      ["b", "buy", -29587],
    ]);
  });

  it("applies account tags and activity corrections from settings", () => {
    const [account] = normalizeAccountData([raw], {
      accountTypes: { "acc-1": null },
      activityKinds: { b: "transfer_in" },
    });
    expect(account.registeredType).toBeNull();
    expect(account.activities?.find((a) => a.id === "b")?.kind).toBe(
      "transfer_in",
    );
  });

  it("keeps failed parts as null and skips non-investment accounts", () => {
    const accounts = normalizeAccountData([
      { ...raw, balances: null, positions: null, activities: null },
      {
        ...raw,
        account: { ...raw.account, id: "chq", account_category: "DEPOSIT" },
      },
    ]);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      cash: null,
      holdings: null,
      activities: null,
      dataAsOf: null,
    });
  });

  it("labels accounts without a brokerage type as Unclassified", () => {
    const [account] = normalizeAccountData([
      { ...raw, account: { ...raw.account, raw_type: null } },
    ]);
    expect(account).toMatchObject({
      label: "Unclassified",
      registeredType: null,
    });
  });
});
