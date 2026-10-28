import "server-only";

export const MOCK_SCENARIOS = ["full", "us", "empty", "sandbox"] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];

const isScenario = (value: string): value is MockScenario =>
  (MOCK_SCENARIOS as readonly string[]).includes(value);

// Generated brokerage data for local testing, chosen with VAULTFOLIO_MOCK_DATA.
// Production builds ignore the variable, so a deployed app always shows the
// user's own SnapTrade data and never generated figures.
export function mockScenario(): MockScenario | null {
  if (process.env.NODE_ENV === "production") return null;
  const value = process.env.VAULTFOLIO_MOCK_DATA;
  if (!value) return null;
  if (!isScenario(value)) {
    throw new Error(
      `VAULTFOLIO_MOCK_DATA must be one of: ${MOCK_SCENARIOS.join(", ")}`,
    );
  }
  return value;
}
