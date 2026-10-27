import type { ActivityKind, RegisteredType } from "./types";

// SnapTrade normalizes common types and passes through brokerage-specific
// ones, so unknown types fall back to "other" and only the sign of the amount
// and units is relied on.
export function activityKind(
  type: string,
  amountCents: number,
  units: number,
): ActivityKind {
  const flow = amountCents !== 0 ? amountCents : units;
  switch (type.toUpperCase()) {
    case "CONTRIBUTION":
      return amountCents < 0 ? "withdrawal" : "contribution";
    case "WITHDRAWAL":
      return amountCents > 0 ? "contribution" : "withdrawal";
    case "EXTERNAL_ASSET_TRANSFER_IN":
      return "transfer_in";
    case "EXTERNAL_ASSET_TRANSFER_OUT":
      return "transfer_out";
    case "TRANSFER":
      return flow < 0 ? "transfer_out" : "transfer_in";
    case "BUY":
      return "buy";
    case "SELL":
      return "sell";
    case "REI":
      return "reinvestment";
    case "DIVIDEND":
    case "SUBSTITUTE_DIVIDEND":
      return "distribution";
    case "INTEREST":
      return "interest";
    case "FEE":
    case "TAX":
      return "fee";
    default:
      return "other";
  }
}

// Activities that change the number of units held in a position.
export const changesUnits = (kind: ActivityKind) =>
  kind !== "distribution" &&
  kind !== "interest" &&
  kind !== "fee" &&
  kind !== "contribution" &&
  kind !== "withdrawal";

const REGISTERED_PATTERNS: [RegisteredType, RegExp][] = [
  ["TFSA", /\bTFSA\b|tax[\s-]free savings/i],
  ["FHSA", /\bFHSA\b|first home savings/i],
  // LRSP/LIRA are locked-in accounts without new contributions; \b excludes them.
  ["RRSP", /\bRRSP\b|\bRSP\b|registered retirement savings/i],
];

export function registeredType(
  ...descriptions: (string | null | undefined)[]
): RegisteredType | null {
  for (const text of descriptions) {
    if (!text) continue;
    for (const [type, pattern] of REGISTERED_PATTERNS) {
      if (pattern.test(text)) return type;
    }
  }
  return null;
}
