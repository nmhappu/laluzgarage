/**
 * Calendar dates without a time of day, as ISO "YYYY-MM-DD" strings (the Compose app's LocalDate).
 * ISO strings sort and compare correctly as plain strings.
 */
export type LocalDate = string;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_NARROW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function makeDate(year: number, month: number, day: number): LocalDate {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The local calendar day of [date] (defaults to now). */
export function localDateOf(date: Date = new Date()): LocalDate {
  return makeDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function today(): LocalDate {
  return localDateOf(new Date());
}

/** The first 10 characters of a record date ("2026-10-14T09:30:00" or "2026-10-14"), if valid. */
export function parseRecordDate(raw: string | null | undefined): LocalDate | null {
  if (!raw) return null;
  const s = raw.trim().slice(0, 10);
  const m = ISO_DATE.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return s;
}

export function parts(d: LocalDate): { year: number; month: number; day: number } {
  return { year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)), day: Number(d.slice(8, 10)) };
}

export function toEpochDay(d: LocalDate): number {
  const { year, month, day } = parts(d);
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

export function fromEpochDay(n: number): LocalDate {
  const date = new Date(n * MS_PER_DAY);
  return makeDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addDays(d: LocalDate, n: number): LocalDate {
  return fromEpochDay(toEpochDay(d) + n);
}

/** Days from [a] to [b] (positive when [b] is later). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return toEpochDay(b) - toEpochDay(a);
}

export function minDate(a: LocalDate, b: LocalDate): LocalDate {
  return a < b ? a : b;
}

export function maxDate(a: LocalDate, b: LocalDate): LocalDate {
  return a > b ? a : b;
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(d: LocalDate): number {
  return new Date(toEpochDay(d) * MS_PER_DAY).getUTCDay();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function dayOfMonth(d: LocalDate): number {
  return parts(d).day;
}

/** A year-month as "YYYY-MM". */
export type YearMonth = string;

export function yearMonthOf(d: LocalDate): YearMonth {
  return d.slice(0, 7);
}

export function ymParts(ym: YearMonth): { year: number; month: number } {
  return { year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)) };
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const { year, month } = ymParts(ym);
  const index = year * 12 + (month - 1) + n;
  return `${Math.floor(index / 12)}-${pad((index % 12 + 12) % 12 + 1)}`;
}

export function monthsBetween(a: YearMonth, b: YearMonth): number {
  const pa = ymParts(a);
  const pb = ymParts(b);
  return (pb.year - pa.year) * 12 + (pb.month - pa.month);
}

export function ymLength(ym: YearMonth): number {
  const { year, month } = ymParts(ym);
  return daysInMonth(year, month);
}

export function ymDay(ym: YearMonth, day: number): LocalDate {
  return `${ym}-${pad(day)}`;
}

export function monthNameLong(ym: YearMonth): string {
  return MONTHS_LONG[ymParts(ym).month - 1];
}

export function monthNameShort(ym: YearMonth): string {
  return MONTHS_SHORT[ymParts(ym).month - 1];
}

/** "October 2026" */
export function monthYearLabel(ym: YearMonth): string {
  return `${monthNameLong(ym)} ${ymParts(ym).year}`;
}

/** "Oct 2026" */
export function shortMonthYearLabel(ym: YearMonth): string {
  return `${monthNameShort(ym)} ${ymParts(ym).year}`;
}

/** "14 Oct" */
export function shortLabel(d: LocalDate): string {
  const { month, day } = parts(d);
  return `${day} ${MONTHS_SHORT[month - 1]}`;
}

/** "Mon, 12 Oct" */
export function weekdayLabel(d: LocalDate): string {
  return `${DAYS_SHORT[dayOfWeek(d)]}, ${shortLabel(d)}`;
}

/** "Wednesday, 14 October" */
export function longLabel(d: LocalDate): string {
  const { month, day } = parts(d);
  return `${DAYS_LONG[dayOfWeek(d)]}, ${day} ${MONTHS_LONG[month - 1]}`;
}

/** "Wednesday, 14 October 2026" */
export function longLabelWithYear(d: LocalDate): string {
  return `${longLabel(d)} ${parts(d).year}`;
}

/** "Wed, 14 Oct 2026" (intake date fields). */
export function fieldDateLabel(d: LocalDate): string {
  return `${weekdayLabel(d)} ${parts(d).year}`;
}

/** "Today, 14 Oct" / "Yesterday, 13 Oct" / "Thu, 8 Oct" */
export function relativeDayLabel(d: LocalDate, todayDate: LocalDate = today()): string {
  if (d === todayDate) return `Today, ${shortLabel(d)}`;
  if (d === addDays(todayDate, -1)) return `Yesterday, ${shortLabel(d)}`;
  return weekdayLabel(d);
}

/** "9 Oct" or "9 Oct – 11 Oct": date and month only, no weekday. */
export function dateRangeShortText(from: LocalDate, to: LocalDate | null): string {
  return to === null || to === from ? shortLabel(from) : `${shortLabel(from)} – ${shortLabel(to)}`;
}

/** A Firestore Timestamp (or anything with toDate) as the local calendar day. */
export function timestampDate(value: unknown): LocalDate | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    try {
      return localDateOf((value as { toDate: () => Date }).toDate());
    } catch {
      return null;
    }
  }
  return null;
}

/** Milliseconds of a Firestore Timestamp, if it is one. */
export function timestampMillis(value: unknown): number | null {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: unknown }).toMillis === 'function') {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return null;
    }
  }
  return null;
}
