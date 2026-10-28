import { describe, expect, it } from "vitest";
import {
  parseAccountTypesForm,
  parseDollars,
  parseOptionsForm,
  parseAllocationForm,
  parseSetupForm,
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

describe("parseSetupForm", () => {
  it("reads room for the shown types and the monthly target", () => {
    expect(
      parseSetupForm(
        form([
          ["TFSA", "7,000"],
          ["amount", "$300"],
        ]),
        2026,
        ["TFSA"],
      ),
    ).toEqual({
      ok: true,
      value: {
        room: { TFSA: { year: 2026, availableCents: 700000 } },
        contributionTargetCents: 30000,
      },
    });
  });

  it("treats every field as optional and ignores types not shown", () => {
    expect(
      parseSetupForm(
        form([
          ["TFSA", ""],
          ["RRSP", "5000"],
          ["amount", ""],
        ]),
        2026,
        ["TFSA"],
      ),
    ).toEqual({ ok: true, value: { room: {} } });
  });

  it("reports room and amount errors together", () => {
    const result = parseSetupForm(
      form([
        ["TFSA", "seven"],
        ["amount", "0"],
      ]),
      2026,
      ["TFSA"],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["TFSA", "amount"]);
    }
  });
});

describe("parseAllocationForm", () => {
  const accounts = ["tfsa", "rrsp"];

  it("accepts an allocation, normalizing symbols", () => {
    expect(
      parseAllocationForm(
        form([
          ["symbol", " xeqt "],
          ["weight", "100"],
        ]),
        accounts,
      ),
    ).toEqual({
      ok: true,
      value: { allocation: [{ symbol: "XEQT", weightPercent: 100 }] },
    });
  });

  it("clears the allocation when every row is empty", () => {
    expect(
      parseAllocationForm(
        form([
          ["symbol", ""],
          ["weight", ""],
        ]),
        accounts,
      ),
    ).toEqual({ ok: true, value: {} });
  });

  it("keeps known accounts only and ignores empty fund rows", () => {
    expect(
      parseAllocationForm(
        form([
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
      ),
    ).toEqual({
      ok: true,
      value: {
        allocation: [
          { symbol: "XEQT", weightPercent: 70 },
          { symbol: "VFV", weightPercent: 30 },
        ],
        scopeAccountIds: ["tfsa"],
      },
    });
  });

  it("reports each invalid field", () => {
    const result = parseAllocationForm(
      form([
        ["symbol", "XE QT"],
        ["weight", "150"],
      ]),
      accounts,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        "allocation",
        "symbol.0",
        "weight.0",
      ]);
    }
  });

  it("requires weights to total 100% and funds to be unique", () => {
    expect(
      parseAllocationForm(
        form([
          ["symbol", "XEQT"],
          ["weight", "60"],
          ["symbol", "VFV"],
          ["weight", "30"],
        ]),
        accounts,
      ),
    ).toMatchObject({
      ok: false,
      errors: { allocation: "Weights add up to 90%; they need to total 100%." },
    });
    expect(
      parseAllocationForm(
        form([
          ["symbol", "XEQT"],
          ["weight", "50"],
          ["symbol", "xeqt"],
          ["weight", "50"],
        ]),
        accounts,
      ),
    ).toMatchObject({
      ok: false,
      errors: { allocation: "Each fund can appear once." },
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
      contributionTargetCents: 30000,
      allocation: [{ symbol: "XEQT", weightPercent: 100 }],
      scopeAccountIds: ["tfsa"],
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
        contributionTargetCents: -5,
        allocation: [{ symbol: "BAD SYMBOL", weightPercent: 100 }],
        scopeAccountIds: "tfsa",
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
