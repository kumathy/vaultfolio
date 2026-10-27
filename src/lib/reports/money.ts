import { formatAmount } from "@/lib/format";

export const toCents = (amount: number) => Math.round(amount * 100);

// The ISO code is added only outside the base currency, so a single-currency
// report reads "$4,312.55" while a USD holding reads "$250.50 USD".
export function money(cents: number, currency: string, base: string): string {
  // `|| 0` turns -0 (from negating an empty sum) into 0, which formats as "$0.00".
  const text = formatAmount((cents || 0) / 100, currency);
  return currency === base ? text : `${text} ${currency}`;
}

export function signedMoney(
  cents: number,
  currency: string,
  base: string,
): string {
  return cents > 0
    ? `+${money(cents, currency, base)}`
    : money(cents, currency, base);
}

// Frontmatter values: plain numbers with two decimals, no symbols.
export const plainAmount = (cents: number) => (cents / 100).toFixed(2);

export function units(value: number): string {
  return new Intl.NumberFormat("en-CA", { maximumFractionDigits: 4 }).format(
    value,
  );
}

export function perUnit(
  amount: number,
  currency: string,
  base: string,
): string {
  const text = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount);
  return currency === base ? text : `${text} ${currency}`;
}

export const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

export function sumBy<T>(items: T[], cents: (item: T) => number): number {
  return items.reduce((total, item) => total + cents(item), 0);
}
