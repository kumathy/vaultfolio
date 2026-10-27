import { describe, expect, it } from "vitest";
import {
  parseAccountTypesForm,
  parseDollars,
  parseOptionsForm,
  parsePlanForm,
  parseRoomForm,
  parseStoredSettings,
  parseTransfersForm,
} from "@/lib/settings/parse";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("parseDollars", () => {
  it.each([
    ["300", 30000],
    ["300.5", 30050],
    ["1,250.00", 125000],
    ["$7,000", 700000],
    [" 25 ", 2500],
    ["0", 0],
  ])("%j → %d cents", (text, cents) => {
    expect(parseDollars(text)).toBe(cents);
  });

  it.each(["", "abc", "-5", "1.234", "1e3", "99999999"])(
    "rejects %j",
    (text) => {
      expect(parseDollars(text)).toBeNull();
    },
  );
});

describe("parsePlanForm", () => {
  const accounts = ["tfsa", "rrsp"];

  it("accepts a single-fund plan and normalizes symbols", () => {
    const result = parsePlanForm(
      form([
        ["amount", "300"],
        ["day", "1"],
        ["symbol", " xeqt "],
        ["weight", "100"],
      ]),
      accounts,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        monthlyAmountCents: 30000,
        contributionDay: 1,
        targets: [{ symbol: "XEQT", weightPercent: 100 }],
      },
    });
  });

  it("keeps known accounts only and ignores empty fund rows", () => {
    const result = parsePlanForm(
      form([
        ["amount", "1000"],
        ["day", "15"],
        ["symbol", "XEQT"],
        ["weight", "70"],
        ["symbol", "VFV"],
        ["weight", "30"],
        ["symbol", ""],
        ["weight", ""],
        ["account", "tfsa"],
        ["account", "someone-else"],
      ]),
      accounts,
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        targets: [
          { symbol: "XEQT", weightPercent: 70 },
          { symbol: "VFV", weightPercent: 30 },
        ],
        accountIds: ["tfsa"],
      },
    });
  });

  it("reports each invalid field", () => {
    const result = parsePlanForm(
      form([
        ["amount", "0"],
        ["day", "31"],
        ["symbol", "XE QT"],
        ["weight", "150"],
      ]),
      accounts,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        "amount",
        "day",
        "symbol.0",
        "targets",
        "weight.0",
      ]);
    }
  });

  it("requires weights to total 100% and funds to be unique", () => {
    const short = parsePlanForm(
      form([
        ["amount", "100"],
        ["day", "1"],
        ["symbol", "XEQT"],
        ["weight", "60"],
        ["symbol", "VFV"],
        ["weight", "30"],
      ]),
      accounts,
    );
    expect(short).toMatchObject({
      ok: false,
      errors: { targets: "Weights add up to 90%; they need to total 100%." },
    });
    const duplicate = parsePlanForm(
      form([
        ["amount", "100"],
        ["day", "1"],
        ["symbol", "XEQT"],
        ["weight", "50"],
        ["symbol", "xeqt"],
        ["weight", "50"],
      ]),
      accounts,
    );
    expect(duplicate).toMatchObject({
      ok: false,
      errors: { targets: "Each fund can appear once." },
    });
  });
});

describe("parseRoomForm", () => {
  it("stores entered room for the given year and skips empty fields", () => {
    expect(
      parseRoomForm(
        form([
          ["TFSA", "7,000"],
          ["RRSP", ""],
          ["FHSA", "8000"],
        ]),
        2026,
      ),
    ).toEqual({
      ok: true,
      value: {
        TFSA: { year: 2026, availableCents: 700000 },
        FHSA: { year: 2026, availableCents: 800000 },
      },
    });
  });

  it("rejects malformed amounts", () => {
    expect(parseRoomForm(form([["TFSA", "seven"]]), 2026)).toMatchObject({
      ok: false,
      errors: { TFSA: expect.any(String) },
    });
  });
});

describe("parseAccountTypesForm", () => {
  it("maps tags, keeps brokerage defaults out, and ignores unknown accounts", () => {
    expect(
      parseAccountTypesForm(
        form([
          ["type.a", "TFSA"],
          ["type.b", "none"],
          ["type.c", ""],
          ["type.d", "LIRA"],
          ["type.x", "RRSP"],
        ]),
        ["a", "b", "c", "d"],
      ),
    ).toEqual({ a: "TFSA", b: null });
  });
});

describe("parseTransfersForm", () => {
  it("updates only the transfers shown on the form", () => {
    expect(
      parseTransfersForm(
        form([
          ["listed", "t1"],
          ["listed", "t2"],
          ["contribution", "t1"],
        ]),
        { t2: "contribution", other: "contribution" },
      ),
    ).toEqual({ t1: "contribution", other: "contribution" });
  });
});

describe("parseOptionsForm", () => {
  it("accepts valid options", () => {
    expect(
      parseOptionsForm(
        form([
          ["days", "7"],
          ["threshold", "50"],
          ["timeZone", "America/Halifax"],
        ]),
      ),
    ).toEqual({
      ok: true,
      value: {
        uninvestedCashDays: 7,
        uninvestedCashThresholdCents: 5000,
        timeZone: "America/Halifax",
      },
    });
  });

  it("rejects out-of-range values and unknown time zones", () => {
    const result = parseOptionsForm(
      form([
        ["days", "0"],
        ["threshold", "-1"],
        ["timeZone", "Mars/Olympus"],
      ]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        "days",
        "threshold",
        "timeZone",
      ]);
    }
  });
});

describe("parseStoredSettings", () => {
  it("round-trips valid settings", () => {
    const settings = {
      timeZone: "America/Toronto",
      uninvestedCashDays: 5,
      uninvestedCashThresholdCents: 2500,
      plan: {
        monthlyAmountCents: 30000,
        contributionDay: 1,
        targets: [{ symbol: "XEQT", weightPercent: 100 }],
        accountIds: ["tfsa"],
      },
      room: { TFSA: { year: 2026, availableCents: 700000 } },
      accountTypes: { a: "TFSA" as const, b: null },
      activityKinds: { t1: "contribution" as const },
      roomPromptDismissed: true,
    };
    expect(parseStoredSettings(JSON.parse(JSON.stringify(settings)))).toEqual(
      settings,
    );
  });

  it("drops invalid parts and keeps the rest", () => {
    expect(
      parseStoredSettings({
        timeZone: "Mars/Olympus",
        uninvestedCashDays: 1.5,
        plan: { monthlyAmountCents: -5, contributionDay: 1, targets: [] },
        room: {
          TFSA: { year: 2026, availableCents: "lots" },
          RRSP: { year: 2026, availableCents: 100 },
        },
        accountTypes: { a: "LIRA", b: "FHSA" },
        activityKinds: { t1: "delete-everything" },
        roomPromptDismissed: "yes",
        extra: { injected: true },
      }),
    ).toEqual({
      room: { RRSP: { year: 2026, availableCents: 100 } },
      accountTypes: { b: "FHSA" },
      activityKinds: {},
    });
  });

  it.each([null, undefined, "text", 42, []])(
    "returns no settings for %j",
    (raw) => {
      expect(parseStoredSettings(raw)).toEqual({});
    },
  );
});
