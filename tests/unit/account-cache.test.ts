import { describe, expect, it, vi } from "vitest";
import {
  cachedAccountData,
  clearAccountData,
} from "@/lib/snaptrade/account-cache";
import type { RawAccountData } from "@/lib/snaptrade/account-data";

const loaded = (complete = true): RawAccountData[] => [
  {
    account: { id: "tfsa" } as RawAccountData["account"],
    balances: [],
    positions: complete ? { results: [] } : null,
    activities: [],
  },
];

describe("cachedAccountData", () => {
  it("reuses a complete fetch for one minute", async () => {
    let time = 0;
    const load = vi.fn(async () => loaded());
    await cachedAccountData("a", load, () => time);
    time = 59_000;
    await cachedAccountData("a", load, () => time);
    expect(load).toHaveBeenCalledTimes(1);
    time = 60_000;
    await cachedAccountData("a", load, () => time);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one fetch between concurrent requests", async () => {
    const load = vi.fn(async () => loaded());
    await Promise.all([
      cachedAccountData("b", load, () => 0),
      cachedAccountData("b", load, () => 0),
    ]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not keep partial results or errors", async () => {
    const partial = vi.fn(async () => loaded(false));
    await cachedAccountData("c", partial, () => 0);
    await cachedAccountData("c", partial, () => 0);
    expect(partial).toHaveBeenCalledTimes(2);

    const failing = vi.fn(async () => {
      throw new Error("network");
    });
    await expect(cachedAccountData("d", failing, () => 0)).rejects.toThrow();
    await expect(cachedAccountData("d", failing, () => 0)).rejects.toThrow();
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it("keeps users apart and can be cleared", async () => {
    const load = vi.fn(async () => loaded());
    await cachedAccountData("e", load, () => 0);
    await cachedAccountData("f", load, () => 0);
    expect(load).toHaveBeenCalledTimes(2);
    clearAccountData("e");
    await cachedAccountData("e", load, () => 0);
    expect(load).toHaveBeenCalledTimes(3);
  });
});
