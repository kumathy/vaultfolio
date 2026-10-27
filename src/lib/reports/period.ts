export interface Period {
  id: string;
  year: number;
  month: number;
  start: string;
  end: string;
  label: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parsePeriod(id: string): Period | null {
  const match = /^(\d{4})-(\d{2})$/.exec(id);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 2000) return null;
  return {
    id,
    year,
    month,
    start: isoDate(year, month, 1),
    end: isoDate(year, month, daysInMonth(year, month)),
    label: `${MONTHS[month - 1]} ${year}`,
  };
}

function parts(date: Date, timeZone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return values as Record<string, string>;
}

export function localDate(date: Date, timeZone: string): string {
  const p = parts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function localDateTime(date: Date, timeZone: string): string {
  const p = parts(date, timeZone);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${p.timeZoneName}`;
}

// ISO 8601 with the zone's offset, e.g. 2026-10-27T09:14:00-04:00.
export function localTimestamp(date: Date, timeZone: string): string {
  const p = parts(date, timeZone);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
  );
  // The local parts stop at minutes, so the instant is truncated to match.
  const minuteStart = Math.floor(date.getTime() / 60_000) * 60_000;
  const offsetMinutes = Math.round((asUtc - minuteStart) / 60_000);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function periodOf(date: string): string {
  return date.slice(0, 7);
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

export function addDays(date: string, days: number): string {
  const d = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function addMonths(period: Period, months: number): Period {
  const index = period.year * 12 + (period.month - 1) + months;
  return parsePeriod(
    `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`,
  ) as Period;
}
