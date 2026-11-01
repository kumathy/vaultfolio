import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSettings, saveSettings } from "@/db/settings";

// Any database access fails the test.
vi.mock("@/db/client", () => ({
  db: () => {
    throw new Error("database used");
  },
}));

afterEach(() => vi.unstubAllEnvs());

describe("settings in mock mode", () => {
  it("are kept apart from the database", async () => {
    vi.stubEnv("VAULTFOLIO_MOCK_DATA", "full");
    await saveSettings("user-1", { contributionTargetCents: 1150_00 });
    expect(await loadSettings("user-1")).toEqual({
      contributionTargetCents: 1150_00,
    });
  });

  it("are kept per scenario", async () => {
    vi.stubEnv("VAULTFOLIO_MOCK_DATA", "full");
    await saveSettings("user-2", { contributionTargetCents: 1150_00 });
    vi.stubEnv("VAULTFOLIO_MOCK_DATA", "us");
    expect(await loadSettings("user-2")).toEqual({});
  });

  it("are not used once mock data is off", async () => {
    vi.stubEnv("VAULTFOLIO_MOCK_DATA", "full");
    await saveSettings("user-3", { contributionTargetCents: 1150_00 });
    vi.stubEnv("VAULTFOLIO_MOCK_DATA", "");
    await expect(loadSettings("user-3")).rejects.toThrow("database used");
  });
});
