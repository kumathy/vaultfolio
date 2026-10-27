// Only for layouts that show the currency code next to the amount.
export function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// "$" alone is ambiguous between CAD and USD.
export function formatMoney(amount: number, currency: string): string {
  return `${formatAmount(amount, currency)} ${currency}`;
}

// SnapTrade mixes date-only values, ISO timestamps and
// "YYYY-MM-DD HH:MM:SS.ffffff+00:00"; the leading date is common to all.
export function formatIsoDate(value: string | null | undefined): string | null {
  const match = value?.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

export function formatTimestampUtc(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
