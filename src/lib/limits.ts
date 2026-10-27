// Yearly registered-account limits, in cents. Updated each year from CRA
// announcements; report logic never contains these figures directly.

export interface YearLimits {
  tfsaAnnualCents: number;
  rrspMaximumCents: number;
  // RRSP contributions up to this date (inclusive) can be deducted for the year.
  rrspDeadline: string;
  fhsaAnnualCents: number;
  fhsaLifetimeCents: number;
}

export const LIMITS: Record<number, YearLimits> = {
  2026: {
    tfsaAnnualCents: 7_000_00,
    rrspMaximumCents: 33_810_00,
    rrspDeadline: "2027-03-01",
    fhsaAnnualCents: 8_000_00,
    fhsaLifetimeCents: 40_000_00,
  },
};

export function limitsFor(year: number): YearLimits | null {
  return LIMITS[year] ?? null;
}
