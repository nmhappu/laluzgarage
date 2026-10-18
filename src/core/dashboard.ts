import type { Customer, Part, ServiceRecord, Vehicle } from '../types';
import {
  addDays,
  daysBetween,
  monthsBetween,
  parseRecordDate,
  shortLabel,
  shortMonthYearLabel,
  today,
  yearMonthOf,
  type LocalDate,
} from './dates';
import { formatInrWhole } from './format';
import { compactPlate, displayName, dueFlag, formatPlate, isOpen, jobStatusOf, modelLabel, type JobStatus } from './jobs';

/** Range options on the Total services card; [days] is null for all time. */
export type ServiceRange = '7d' | '45d' | 'all';

export const SERVICE_RANGES: { key: ServiceRange; days: number | null; label: string }[] = [
  { key: '7d', days: 7, label: '7D' },
  { key: '45d', days: 45, label: '45D' },
  { key: 'all', days: null, label: 'ALL' },
];

/** All time: the graph switches from per-day to per-month points once the history is longer than this. */
const ALL_TIME_DAILY_MAX_DAYS = 90;
/** All time has no previous period, so the pill counts what came in over this many days instead. */
const ALL_TIME_RECENT_DAYS = 30;

export interface AttentionItem {
  record: ServiceRecord;
  plate: string;
  vehicle: string;
  customer: string;
  total: string;
  flag: string;
  overdue: boolean;
}

export interface RecentItem {
  record: ServiceRecord;
  vehicle: string;
  plate: string;
  customer: string;
  status: JobStatus;
  date: string;
}

export interface DashboardStats {
  total: number;
  deltaText: string;
  deltaUp: boolean;
  caption: string;
  daily: number[];
  pending: number;
  inProgress: number;
  completedInRange: number;
  completedShare: number;
  attention: AttentionItem[];
  overdueCount: number;
  vehicles: number;
  customers: number;
  partsFitted: number;
  lowStock: number;
  recent: RecentItem[];
}

interface RangeTrend {
  records: ServiceRecord[];
  points: number[];
  deltaText: string;
  deltaUp: boolean;
  caption: string;
}

type Dated = [ServiceRecord, LocalDate];

/** Last [n] days, compared with the [n] days before. */
function periodTrend(dated: Dated[], n: number, todayDate: LocalDate): RangeTrend {
  const start = addDays(todayDate, -(n - 1));
  const prevStart = addDays(start, -n);
  const inRange = dated.filter(([, d]) => d >= start && d <= todayDate);
  const prevCount = dated.filter(([, d]) => d >= prevStart && d < start).length;
  const daily = new Array<number>(n).fill(0);
  inRange.forEach(([, d]) => {
    daily[daysBetween(start, d)]++;
  });
  const total = inRange.length;
  const pct = prevCount === 0 && total === 0 ? 0 : prevCount === 0 ? 100 : Math.round(((total - prevCount) * 100) / prevCount);
  return {
    records: inRange.map(([r]) => r),
    points: daily,
    deltaText: (pct >= 0 ? '+' : '−') + Math.abs(pct) + '%',
    deltaUp: pct >= 0,
    caption: `vs previous ${n} days · ${(total / n).toFixed(1)} per day`,
  };
}

/**
 * Every record, undated ones included. The graph runs from the first dated job to today, per day
 * for a short history and per month after that; the pill shows the last 30 days' intake.
 */
function allTimeTrend(records: ServiceRecord[], dated: Dated[], todayDate: LocalDate): RangeTrend {
  const past = dated.map(([, d]) => d).filter((d) => d <= todayDate);
  const first = past.reduce((a, b) => (b < a ? b : a), todayDate);
  const spanDays = daysBetween(first, todayDate) + 1;
  let points: number[];
  if (spanDays <= ALL_TIME_DAILY_MAX_DAYS) {
    points = new Array<number>(spanDays).fill(0);
    past.forEach((d) => {
      points[daysBetween(first, d)]++;
    });
  } else {
    const firstMonth = yearMonthOf(first);
    const months = monthsBetween(firstMonth, yearMonthOf(todayDate)) + 1;
    points = new Array<number>(months).fill(0);
    past.forEach((d) => {
      points[monthsBetween(firstMonth, yearMonthOf(d))]++;
    });
  }
  const recentStart = addDays(todayDate, -(ALL_TIME_RECENT_DAYS - 1));
  const recent = past.filter((d) => d >= recentStart).length;
  const since = past.length === 0 ? 'All time' : `Since ${shortMonthYearLabel(yearMonthOf(first))}`;
  return {
    records,
    points,
    deltaText: `+${recent}`,
    deltaUp: true,
    caption: `${since} · +${recent} in the last ${ALL_TIME_RECENT_DAYS} days`,
  };
}

/** Pure aggregation over the streamed Firestore collections (computeDashboard in the Compose app). */
export function computeDashboard(
  records: ServiceRecord[],
  vehicles: Map<string, Vehicle>,
  customers: Map<string, Customer>,
  parts: Part[],
  range: ServiceRange,
  todayDate: LocalDate = today()
): DashboardStats {
  const dated: Dated[] = records.flatMap((r) => {
    const d = parseRecordDate(r.date);
    return d ? [[r, d] as Dated] : [];
  });
  const days = SERVICE_RANGES.find((x) => x.key === range)?.days ?? null;
  const trend = days !== null ? periodTrend(dated, days, todayDate) : allTimeTrend(records, dated, todayDate);
  const inRange = trend.records;
  const total = inRange.length;

  // Status tiles follow the hero card's range, so both cards count the same jobs.
  const statusCount = (s: string) => inRange.filter((r) => jobStatusOf(r.status).value === s).length;
  const pending = statusCount('pending');
  const inProgress = statusCount('in-progress');
  const completedInRange = statusCount('completed');

  const attention: AttentionItem[] = records
    .filter(isOpen)
    .flatMap((r) => {
      const flag = dueFlag(r, todayDate);
      return flag ? [{ r, flag }] : [];
    })
    .sort((a, b) => b.flag.overdueDays - a.flag.overdueDays)
    .map(({ r, flag }) => {
      const v = vehicles.get(r.vehicleId);
      return {
        record: r,
        plate: formatPlate(v?.plateNumber),
        vehicle: modelLabel(v),
        customer: displayName(customers.get(r.customerId)),
        total: formatInrWhole(r.totalCost),
        flag: flag.label,
        overdue: flag.isOverdue,
      };
    });

  const recent: RecentItem[] = records.slice(0, 5).map((r) => {
    const v = vehicles.get(r.vehicleId);
    const d = parseRecordDate(r.date);
    return {
      record: r,
      vehicle: modelLabel(v),
      plate: compactPlate(v?.plateNumber),
      customer: displayName(customers.get(r.customerId)),
      status: jobStatusOf(r.status),
      date: d ? shortLabel(d) : '',
    };
  });

  return {
    total,
    deltaText: trend.deltaText,
    deltaUp: trend.deltaUp,
    caption: trend.caption,
    daily: trend.points,
    pending,
    inProgress,
    completedInRange,
    completedShare: total === 0 ? 0 : Math.round((completedInRange * 100) / total),
    attention,
    overdueCount: attention.filter((a) => a.overdue).length,
    vehicles: vehicles.size,
    customers: customers.size,
    partsFitted: inRange.reduce((sum, r) => sum + r.partsUsed.reduce((s, p) => s + p.quantity, 0), 0),
    lowStock: parts.filter((p) => p.stockQuantity <= p.minStockLevel).length,
    recent,
  };
}

/** "Good morning" until noon, "Good afternoon" until 5pm, then "Good evening". */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h <= 11) return 'Good morning';
  if (h <= 16) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Smooth sparkline on the artboard's 300×72 grid (6 unit inset, 60 tall): the line path and the
 * area under it.
 */
export function sparklinePaths(values: number[]): { line: string; area: string } | null {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(max - min, 1);
  const pts = values.map((v, i) => [(i * 300) / (values.length - 1), 6 + 60 - ((v - min) / span) * 60]);
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx.toFixed(2)} ${y0.toFixed(2)} ${mx.toFixed(2)} ${y1.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  return { line: d, area: `${d} L300 72 L0 72 Z` };
}
