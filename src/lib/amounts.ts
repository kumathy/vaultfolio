export interface TextPart {
  text: string;
  amount: boolean;
}

// Money as formatAmount writes it: an optional sign or "~", then a currency
// symbol ("$", "R$", "€") or a letter prefix followed by a no-break space
// ("CHF", "kr", "F CFA"), the number, and an optional ISO code ("$250.50 USD").
// The no-break space separates letter prefixes from ordinary words before a
// number.
const MONEY = String.raw`[-+~]*(?:[A-Za-z]{0,2}\p{Sc}|(?:[^\s\d()|]{1,4}[\u00a0\u202f]){1,2})\d[\d,]*\.\d+(?: [A-Z]{3})?`;
const UNITS = String.raw`\d[\d,]*(?:\.\d+)? units?\b`;
const AMOUNT = new RegExp(`${MONEY}|${UNITS}`, "gu");

const BARE_NUMBER = /^-?[\d,]+(?:\.\d+)?$/;

export const isBareNumber = (text: string) => BARE_NUMBER.test(text.trim());

// The yearly registered-account limits are published CRA figures, not the
// user's own, so the privacy screen leaves that line visible.
export const isPublicLimitLine = (text: string) =>
  /^\d{4} annual limits?:/.test(text);

// Unit counts reveal a position's size as clearly as its value does.
export const isUnitsColumn = (label: string) => /^units\b/i.test(label.trim());

export function splitAmounts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(AMOUNT)) {
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index), amount: false });
    }
    parts.push({ text: match[0], amount: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), amount: false });
  return parts;
}
