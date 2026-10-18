import type { Customer, ServiceRecord, Vehicle } from '../types';
import { addDays, parseRecordDate, shortLabel, timestampDate, today, weekdayLabel, type LocalDate } from './dates';
import { formatInrWhole } from './format';
import {
  displayName,
  dueFlag,
  formatPlate,
  isOpen,
  jobStatusOf,
  modelLabel,
  modelWithColor,
  parseTasks,
  securityOf,
  type JobStatus,
  type VehicleSecurity,
} from './jobs';

export interface JobCardModel {
  record: ServiceRecord;
  plate: string;
  vehicle: string;
  /** Make and model only, for compact cards. */
  vehicleModel: string;
  customer: string;
  status: JobStatus;
  lateLabel: string | null;
  /** Arrival day; the list groups cards under it. Null when the record has no usable date. */
  arrivedDate: LocalDate | null;
  security: VehicleSecurity;
  battery: number | null;
  tasksDone: number;
  tasksTotal: number;
  tasks: string[];
  deliveredText: string;
  totalLabel: string;
  total: string;
}

export type StatusFilter = 'all' | 'pending' | 'in-progress' | 'completed';

export interface ServicesQuery {
  statusFilter: StatusFilter;
  search: string;
  newestFirst: boolean;
  dateFrom: LocalDate | null;
  dateTo: LocalDate | null;
}

export interface ServicesListUi {
  cards: JobCardModel[];
  counts: Record<StatusFilter, number>;
  summary: string;
  arrivalDays: Set<LocalDate>;
}

interface Entry {
  card: JobCardModel;
  plateKey: string;
  nameKey: string;
  phoneKey: string;
  modelKey: string;
}

export function buildCard(r: ServiceRecord, v: Vehicle | undefined, c: Customer | undefined, todayDate: LocalDate): JobCardModel {
  const status = jobStatusOf(r.status);
  const tasks = parseTasks(r.description);
  const isDone = status.value === 'completed';
  const delivered = timestampDate(r.updatedAt);
  const notBilled = r.totalCost <= 0 && !isDone;
  const flag = dueFlag(r, todayDate);
  return {
    record: r,
    plate: formatPlate(v?.plateNumber),
    vehicle: modelWithColor(v),
    vehicleModel: modelLabel(v),
    customer: displayName(c),
    status,
    lateLabel: flag?.isOverdue ? flag.label : null,
    arrivedDate: parseRecordDate(r.date),
    security: securityOf(v?.passwordOrPin),
    battery: r.battery ?? null,
    tasksDone: tasks.filter((t) => t.done).length,
    tasksTotal: tasks.length,
    tasks: tasks.map((t) => t.text),
    deliveredText: delivered ? `Delivered ${weekdayLabel(delivered)}` : 'Delivered',
    totalLabel: isDone ? 'Billed' : notBilled ? '' : 'Est.',
    total: notBilled ? 'Not billed' : formatInrWhole(r.totalCost),
  };
}

/**
 * Card models plus pre-normalised search keys, built once per Firestore snapshot so a keystroke
 * or filter change only re-filters (ServicesListIndex in the Compose app).
 */
export class ServicesListIndex {
  private readonly entries: Entry[];
  readonly counts: Record<StatusFilter, number>;
  readonly summary: string;
  readonly arrivalDays: Set<LocalDate>;

  constructor(records: ServiceRecord[], vehicles: Map<string, Vehicle>, customers: Map<string, Customer>, todayDate: LocalDate = today()) {
    this.entries = records.map((r) => {
      const v = vehicles.get(r.vehicleId);
      const c = customers.get(r.customerId);
      return {
        card: buildCard(r, v, c, todayDate),
        plateKey: (v?.plateNumber ?? '').toLowerCase().replaceAll(' ', ''),
        nameKey: (c?.name ?? '').toLowerCase(),
        phoneKey: (c?.phone ?? '').replaceAll(' ', ''),
        modelKey: `${v?.make ?? 'null'} ${v?.model ?? 'null'}`.toLowerCase(),
      };
    });
    this.arrivalDays = new Set(this.entries.flatMap((e) => (e.card.arrivedDate ? [e.card.arrivedDate] : [])));
    const by = (s: string) => records.filter((r) => jobStatusOf(r.status).value === s).length;
    this.counts = { all: records.length, pending: by('pending'), 'in-progress': by('in-progress'), completed: by('completed') };
    const open = records.filter(isOpen).length;
    const arrivedToday = records.filter((r) => parseRecordDate(r.date) === todayDate).length;
    this.summary = `${open} open · ${this.counts.completed} delivered · ${arrivedToday} arrived today`;
  }

  select(q: ServicesQuery): JobCardModel[] {
    const needle = q.search.trim().toLowerCase();
    const compact = needle.replaceAll(' ', '');
    const cards = this.entries
      .filter((e) => q.statusFilter === 'all' || e.card.record.status.toLowerCase() === q.statusFilter)
      .filter(
        (e) =>
          !needle ||
          e.plateKey.includes(compact) ||
          e.nameKey.includes(needle) ||
          e.phoneKey.includes(compact) ||
          e.modelKey.includes(needle)
      )
      .filter((e) => {
        if (!q.dateFrom) return true;
        const to = q.dateTo ?? q.dateFrom;
        const d = e.card.arrivedDate;
        return d !== null && d >= q.dateFrom && d <= to;
      })
      .map((e) => e.card);
    return q.newestFirst ? cards : cards.reverse();
  }
}

export interface DayGroup {
  key: string;
  label: string;
  cards: JobCardModel[];
}

/** Consecutive cards sharing an arrival day, keeping the list's sort order. */
export function groupByArrivalDay(cards: JobCardModel[], todayDate: LocalDate = today()): DayGroup[] {
  const out: DayGroup[] = [];
  let current: DayGroup | null = null;
  for (const card of cards) {
    const d = card.arrivedDate;
    const key = d ?? 'undated';
    if (!current || current.key !== key) {
      const label =
        d === null
          ? 'No date'
          : d === todayDate
            ? `Today · ${shortLabel(d)}`
            : d === addDays(todayDate, -1)
              ? `Yesterday · ${shortLabel(d)}`
              : weekdayLabel(d);
      current = { key, label, cards: [] };
      out.push(current);
    }
    current.cards.push(card);
  }
  return out;
}
