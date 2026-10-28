import "server-only";

import type { StoredSettings } from "@/lib/settings/parse";
import type { MockScenario } from "./config";
import { MOCK_IDS, mockData } from "./scenarios";

// A complete set of settings for a mock scenario, so configured reports can be
// compared with zero-setup ones. Figures are chosen to produce different
// statuses: TFSA on track, RRSP already over its deduction limit, FHSA well
// within.
export function mockSettings(
  scenario: MockScenario,
  year: number,
): StoredSettings {
  switch (scenario) {
    case "full": {
      const usdTransfer = mockData(scenario)
        .accounts.find((a) => a.account.id === MOCK_IDS.rrsp)
        ?.activities.find(
          (a) => a.type === "TRANSFER" && a.currency?.code === "USD",
        );
      return {
        contributionTargetCents: 1150_00,
        allocation: [
          { symbol: "XEQT", weightPercent: 70 },
          { symbol: "VFV", weightPercent: 30 },
        ],
        scopeAccountIds: [MOCK_IDS.tfsa, MOCK_IDS.rrsp, MOCK_IDS.fhsa],
        room: {
          // The $7,000 annual limit plus last year's $2,000 withdrawal,
          // restored on January 1.
          TFSA: { year, availableCents: 9000_00 },
          RRSP: { year, availableCents: 3500_00 },
          FHSA: { year, availableCents: 8000_00 },
        },
        // The cash-only account tagged by hand, as a user would.
        accountTypes: { [MOCK_IDS.cashOnly]: null },
        // The USD transfer came from a non-registered account, so it counts.
        activityKinds: usdTransfer?.id
          ? { [usdTransfer.id]: "contribution" }
          : undefined,
        uninvestedCashDays: 5,
        uninvestedCashThresholdCents: 25_00,
        timeZone: "America/Halifax",
      };
    }
    case "us":
      return {
        contributionTargetCents: 800_00,
        allocation: [
          { symbol: "VOO", weightPercent: 60 },
          { symbol: "VTI", weightPercent: 40 },
        ],
        uninvestedCashThresholdCents: 50_00,
        timeZone: "America/Toronto",
      };
    case "sandbox":
    case "empty":
      return { contributionTargetCents: 500_00 };
  }
}
