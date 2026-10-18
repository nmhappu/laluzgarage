import type { ServiceRecord } from '../types';
import {
  addDays,
  addMonths,
  dayOfMonth,
  dayOfWeek,
  DAYS_NARROW,
  daysBetween,
  monthNameLong,
  monthNameShort,
  parseRecordDate,
  parts,
  shortLabel,
  timestampDate,
  toEpochDay,
  yearMonthOf,
  ymDay,
  ymLength,
  ymParts,
  type LocalDate,
  type YearMonth,
} from './dates';
import { formatInrWhole } from './format';
import { isCompleted } from './jobs';

/** What a statistics screen measures (StatisticsData.kt). */
export type StatMetric = 'revenue' | 'completed' | 'arrivals';

export const STAT_METRICS: { key: StatMetric; title: string; noun: string; unit: string }[] = [
  { key: 'revenue', title: 'Revenue', noun: 'revenue', unit: '' },
  { key: 'completed', title: 'Jobs completed', noun: 'jobs completed', unit: 'jobs' },
  { key: 'arrivals', title: 'Arrivals', noun: 'arrivals', unit: 'arrivals' },
];

export function metricInfo(m: StatMetric) {
  return STAT_METRICS.find((x) => x.key === m)!;
}

const isMoney = (m: StatMetric) => m === 'revenue';

/** 8.0 → "8", 8.34 → "8.3". */
export function formatCount(value: number): string {
  const oneDecimal = Math.round(value * 10) / 10;
  return Number.isInteger(oneDecimal) ? String(oneDecimal) : oneDecimal.toFixed(1);
}

/** The figure as shown on screen: whole rupees, or a count (one decimal for averages). */
export function formatMetric(m: StatMetric, value: number): string {
  return isMoney(m) ? formatInrWhole(value) : formatCount(value);
}

/** A figure with its unit: "9 jobs", "₹4,200". */
export function formatMetricWithUnit(m: StatMetric, value: number): string {
  return isMoney(m) ? formatMetric(m, value) : `${formatMetric(m, value)} ${metricInfo(m).unit}`;
}

/** The caption beside the headline total: "in total" or "jobs in total". */
export function inTotal(m: StatMetric): string {
  return isMoney(m) ? 'in total' : `${metricInfo(m).unit} in total`;
}

/** Size of one y-axis step: the axis tops out at a whole multiple of it. */
export function axisStep(m: StatMetric): number {
  return isMoney(m) ? 5000 : 4;
}

/** Axis label: 12000 → "₹12k", 12500 → "₹12.5k"; counts as whole numbers. */
export function axisLabel(m: StatMetric, value: number): string {
  if (!isMoney(m)) return formatCount(value);
  if (value === 0) return '0';
  const k = value / 1000;
  return '₹' + (Number.isInteger(k) ? String(k) : k.toFixed(1)) + 'k';
}

export type StatRange = 'week' | 'month' | 'custom' | 'all';

export const STAT_RANGES: { key: StatRange; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'custom', label: 'Custom' },
  { key: 'all', label: 'All' },
];

export interface StatBar {
  value: number;
  /** Spoken and shown above the chart when the bar is selected: "Wed, 14 Oct". */
  label: string;
  /** The short label under the bar; empty when the bar has none. */
  axis: string;
  /** A day still to come in the current month: drawn as empty space, not selectable. */
  isFuture: boolean;
}

export interface StatRow {
  title: string;
  sub: string | null;
  value: number;
}

export interface StatPeriod {
  title: string;
  start: LocalDate;
  end: LocalDate;
  bars: StatBar[];
  /** The day of the first bar; null when bars are months (All). */
  firstDay: LocalDate | null;
  total: number;
  average: number;
  averageUnit: string;
  comparison: string | null;
  comparisonUp: boolean;
  rowsTitle: string;
  rowsColumn: string;
  rows: StatRow[];
  canGoBack: boolean;
  canGoForward: boolean;
}

export function defaultSelection(p: StatPeriod): number {
  for (let i = p.bars.length - 1; i >= 0; i--) if (!p.bars[i].isFuture) return i;
  return 0;
}

export function isDense(p: StatPeriod): boolean {
  return p.bars.length > 14;
}

/** The y-axis top: the biggest bar rounded up to a whole step. */
export function axisMax(p: StatPeriod, m: StatMetric): number {
  const max = p.bars.filter((b) => !b.isFuture).reduce((a, b) => Math.max(a, b.value), 0);
  const step = axisStep(m);
  return Math.max(step, Math.ceil(max / step) * step);
}

/** The day a delivered job counts on: when it was marked delivered, else its intake day. */
function completionDate(r: ServiceRecord): LocalDate | null {
  return timestampDate(r.updatedAt) ?? parseRecordDate(r.date);
}

/**
 * One number per day for [metric]: cars that arrived (any job not cancelled), jobs delivered, or
 * the billed total of jobs delivered that day.
 */
export function dailyTotals(records: ServiceRecord[], metric: StatMetric): Map<LocalDate, number> {
  const out = new Map<LocalDate, number>();
  for (const r of records) {
    let day: LocalDate | null;
    let amount: number;
    if (metric === 'arrivals') {
      if (r.status.toLowerCase() === 'cancelled') continue;
      day = parseRecordDate(r.date);
      amount = 1;
    } else {
      if (!isCompleted(r)) continue;
      day = completionDate(r);
      amount = metric === 'revenue' ? r.totalCost : 1;
    }
    if (!day) continue;
    out.set(day, (out.get(day) ?? 0) + amount);
  }
  return out;
}

const MAX_CUSTOM_DAYS = 366;

/** The "Custom" range shown before the user picks one: the last 12 days. */
export function defaultCustomRange(todayDate: LocalDate): [LocalDate, LocalDate] {
  return [addDays(todayDate, -11), todayDate];
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Wed, 14 Oct". */
export function dayLabel(d: LocalDate): string {
  return `${SHORT_DAYS[dayOfWeek(d)]}, ${shortLabel(d)}`;
}

function shortMonthOf(d: LocalDate): string {
  return monthNameShort(yearMonthOf(d));
}

/** "8–14 Oct" within a month, "31 Aug – 14 Oct" across months, "9 Oct" for a single day. */
export function span(a: LocalDate, b: LocalDate): string {
  if (a === b) return `${dayOfMonth(a)} ${shortMonthOf(a)}`;
  if (yearMonthOf(a) === yearMonthOf(b)) return `${dayOfMonth(a)}–${dayOfMonth(b)} ${shortMonthOf(b)}`;
  return `${dayOfMonth(a)} ${shortMonthOf(a)} – ${dayOfMonth(b)} ${shortMonthOf(b)}`;
}

/** "+8% vs previous 7 days"; null when the previous period had nothing to compare with. */
export function comparisonText(current: number, previous: number, label: string, withPrefix = true): string | null {
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct >= 0 ? '+' : '-';
  return `${sign}${Math.abs(pct)}% ${withPrefix ? `vs ${label}` : label}`;
}

function sumDays(totals: Map<LocalDate, number>, days: LocalDate[]): number {
  return days.reduce((s, d) => s + (totals.get(d) ?? 0), 0);
}

function rangeDays(start: LocalDate, end: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Monday-start weeks of [days] (ascending), newest first. */
function weekRows(totals: Map<LocalDate, number>, days: LocalDate[]): StatRow[] {
  const weeks = new Map<LocalDate, LocalDate[]>();
  for (const d of days) {
    const monday = addDays(d, -((dayOfWeek(d) + 6) % 7));
    const list = weeks.get(monday);
    if (list) list.push(d);
    else weeks.set(monday, [d]);
  }
  return [...weeks.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([, week]) => ({ title: span(week[0], week[week.length - 1]), sub: null, value: sumDays(totals, week) }));
}

function rowsColumnFor(metric: StatMetric, weekly: boolean): string {
  if (weekly) return 'Total';
  if (metric === 'revenue') return 'Revenue';
  if (metric === 'completed') return 'Completed';
  return 'Arrived';
}

function dayPeriod(
  totals: Map<LocalDate, number>,
  metric: StatMetric,
  start: LocalDate,
  end: LocalDate,
  todayDate: LocalDate,
  earliest: LocalDate | null,
  offset: number,
  weekly: boolean,
  previousLabel: string,
  title: string
): StatPeriod {
  const days = rangeDays(start, end);
  const dense = days.length > 14;
  const bars: StatBar[] = days.map((d) => ({
    value: totals.get(d) ?? 0,
    label: dayLabel(d),
    axis: !dense ? DAYS_NARROW[dayOfWeek(d)] : dayOfWeek(d) === 1 ? String(dayOfMonth(d)) : '',
    isFuture: false,
  }));
  const sum = sumDays(totals, days);
  const average = sum / days.length;
  const previousStart = addDays(start, -days.length);
  const previousSum = sumDays(totals, rangeDays(previousStart, addDays(start, -1)));
  const previousAverage = previousSum / days.length;
  const rows = !weekly
    ? [...days].reverse().map((d) => ({ title: dayLabel(d), sub: d === todayDate ? 'Today' : null, value: totals.get(d) ?? 0 }))
    : weekRows(totals, days);
  return {
    title,
    start,
    end,
    bars,
    firstDay: start,
    total: sum,
    average,
    averageUnit: 'day',
    comparison: comparisonText(average, previousAverage, previousLabel),
    comparisonUp: average >= previousAverage,
    rowsTitle: weekly ? `Weekly ${metricInfo(metric).noun}` : `Daily ${metricInfo(metric).noun}`,
    rowsColumn: rowsColumnFor(metric, weekly),
    rows,
    canGoBack: earliest !== null && start > earliest,
    canGoForward: offset > 0,
  };
}

const AXIS_DAYS = new Set([1, 5, 10, 15, 20, 25, 30]);

function monthPeriod(totals: Map<LocalDate, number>, metric: StatMetric, offset: number, todayDate: LocalDate, earliest: LocalDate | null): StatPeriod {
  const month = addMonths(yearMonthOf(todayDate), -offset);
  const first = ymDay(month, 1);
  const last = ymDay(month, ymLength(month));
  const lastWithData = last < todayDate ? last : todayDate;
  const realDays = rangeDays(first, lastWithData);
  const bars: StatBar[] = [];
  for (let dom = 1; dom <= ymLength(month); dom++) {
    const d = ymDay(month, dom);
    const future = d > todayDate;
    bars.push({ value: future ? 0 : totals.get(d) ?? 0, label: future ? '' : dayLabel(d), axis: AXIS_DAYS.has(dom) ? String(dom) : '', isFuture: future });
  }
  const total = sumDays(totals, realDays);
  const average = realDays.length > 0 ? total / realDays.length : 0;
  const previous = addMonths(month, -1);
  const previousDays = ymLength(previous);
  let previousTotal = 0;
  for (let i = 1; i <= previousDays; i++) previousTotal += totals.get(ymDay(previous, i)) ?? 0;
  const previousAverage = previousTotal / previousDays;
  return {
    title: `${monthNameLong(month)} ${ymParts(month).year}`,
    start: first,
    end: lastWithData,
    bars,
    firstDay: first,
    total,
    average,
    averageUnit: 'day',
    comparison: comparisonText(average, previousAverage, `vs ${monthNameLong(previous)}`, false),
    comparisonUp: average >= previousAverage,
    rowsTitle: `Weekly ${metricInfo(metric).noun}`,
    rowsColumn: 'Total',
    rows: weekRows(totals, realDays),
    canGoBack: earliest !== null && first > earliest,
    canGoForward: offset > 0,
  };
}

function monthLabel(ym: YearMonth): string {
  return `${monthNameShort(ym)} ${ymParts(ym).year}`;
}

function allPeriod(totals: Map<LocalDate, number>, metric: StatMetric, todayDate: LocalDate, earliest: LocalDate | null): StatPeriod {
  const lastMonth = yearMonthOf(todayDate);
  const firstMonth = earliest ? yearMonthOf(earliest) : lastMonth;
  const months: YearMonth[] = [];
  for (let m = firstMonth; m <= lastMonth; m = addMonths(m, 1)) months.push(m);
  let totalSum = 0;
  const perMonth = months.map((m) => {
    const days = m === lastMonth ? parts(todayDate).day : ymLength(m);
    let sum = 0;
    for (let i = 1; i <= days; i++) sum += totals.get(ymDay(m, i)) ?? 0;
    totalSum += sum;
    return [m, sum] as const;
  });
  const bars: StatBar[] = perMonth.map(([m, v]) => {
    const mo = ymParts(m).month;
    return {
      value: v,
      label: `${monthLabel(m)} · total`,
      axis: mo === 1 ? `Jan ${ymParts(m).year % 100}` : (mo - 1) % 3 === 0 ? monthNameShort(m) : '',
      isFuture: false,
    };
  });
  const rows = [...perMonth].reverse().map(([m, v]) => ({ title: monthLabel(m), sub: m === lastMonth ? 'Month to date' : null, value: v }));
  const title = months.length === 1 ? monthLabel(firstMonth) : `${monthLabel(firstMonth)} – ${monthLabel(lastMonth)}`;
  return {
    title,
    start: ymDay(firstMonth, 1),
    end: todayDate,
    bars,
    firstDay: null,
    total: totalSum,
    average: totalSum / months.length,
    averageUnit: 'month',
    comparison: null,
    comparisonUp: true,
    rowsTitle: `Monthly ${metricInfo(metric).noun}`,
    rowsColumn: 'Total',
    rows,
    canGoBack: false,
    canGoForward: false,
  };
}

/**
 * Builds the screen's data. [offset] pages back through time (0 = now): by a week, a month, or
 * the custom range's own length.
 */
export function buildPeriod(
  totals: Map<LocalDate, number>,
  metric: StatMetric,
  range: StatRange,
  offset: number,
  customFrom: LocalDate | null,
  customTo: LocalDate | null,
  todayDate: LocalDate
): StatPeriod {
  let earliest: LocalDate | null = null;
  for (const k of totals.keys()) if (earliest === null || k < earliest) earliest = k;
  switch (range) {
    case 'week': {
      const end = addDays(todayDate, -7 * offset);
      const start = addDays(end, -6);
      return dayPeriod(totals, metric, start, end, todayDate, earliest, offset, false, 'previous 7 days', span(start, end));
    }
    case 'custom': {
      const [defFrom, defTo] = defaultCustomRange(todayDate);
      let from = customFrom ?? defFrom;
      let to = customTo ?? customFrom ?? defTo;
      if (to > todayDate) to = todayDate;
      if (from > todayDate) from = todayDate;
      if (to < from) [from, to] = [to, from];
      if (daysBetween(from, to) >= MAX_CUSTOM_DAYS) from = addDays(to, -(MAX_CUSTOM_DAYS - 1));
      const length = daysBetween(from, to) + 1;
      const end = addDays(to, -length * offset);
      const start = addDays(from, -length * offset);
      return dayPeriod(totals, metric, start, end, todayDate, earliest, offset, length > 7, `previous ${length} days`, span(start, end));
    }
    case 'month':
      return monthPeriod(totals, metric, offset, todayDate, earliest);
    case 'all':
      return allPeriod(totals, metric, todayDate, earliest);
  }
}

export function epochOf(d: LocalDate): number {
  return toEpochDay(d);
}
