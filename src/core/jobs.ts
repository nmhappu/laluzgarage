import type { Customer, ServiceRecord, Vehicle } from '../types';
import { daysBetween, parseRecordDate, today, type LocalDate } from './dates';

/** Job status as stored in Firestore (`serviceRecords.status`). "completed" reads "Delivered". */
export type ChipTone = 'pending' | 'in-progress' | 'completed' | 'overdue' | 'delivered' | 'neutral';

export interface JobStatus {
  value: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  label: string;
  tone: ChipTone;
}

export const JOB_STATUSES: Record<JobStatus['value'], JobStatus> = {
  pending: { value: 'pending', label: 'Pending', tone: 'pending' },
  'in-progress': { value: 'in-progress', label: 'In progress', tone: 'in-progress' },
  completed: { value: 'completed', label: 'Delivered', tone: 'completed' },
  cancelled: { value: 'cancelled', label: 'Cancelled', tone: 'neutral' },
};

export function jobStatusOf(raw: string | null | undefined): JobStatus {
  const key = (raw ?? '').trim().toLowerCase() as JobStatus['value'];
  return JOB_STATUSES[key] ?? JOB_STATUSES.pending;
}

export function isOpen(record: ServiceRecord): boolean {
  const s = jobStatusOf(record.status).value;
  return s === 'pending' || s === 'in-progress';
}

export function isCompleted(record: ServiceRecord): boolean {
  return jobStatusOf(record.status).value === 'completed';
}

// ---- Checklist (shared format with the Compose app: "[x] text" / "[ ] text") ----

export interface TaskLine {
  text: string;
  done: boolean;
}

const BULLET_PREFIX = /^(?:[-•*]\s+)+/;

export function parseTasks(description: string | null | undefined): TaskLine[] {
  return (description ?? '').split(/\r?\n/).flatMap((raw) => {
    let line = raw.trim().replace(BULLET_PREFIX, '');
    const done = line.toLowerCase().startsWith('[x]');
    if (done || line.startsWith('[ ]')) line = line.slice(3).trim();
    line = line.replace(BULLET_PREFIX, '');
    return line ? [{ text: line, done }] : [];
  });
}

export function serializeTasks(tasks: TaskLine[]): string {
  return tasks.map((t) => (t.done ? '[x] ' : '[ ] ') + t.text).join('\n');
}

/** Free text, one problem per line; done states carry over by line position. */
export function tasksFromText(text: string, previous: TaskLine[]): TaskLine[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((t, i) => ({ text: t, done: previous[i]?.done === true }));
}

// ---- Due flags ----

export interface DueFlag {
  label: string;
  overdueDays: number;
  isOverdue: boolean;
}

/** Overdue / due-today flag for open jobs. */
export function dueFlag(record: ServiceRecord, todayDate: LocalDate = today()): DueFlag | null {
  if (!isOpen(record)) return null;
  const expected = parseRecordDate(record.expectedDeliveryDate);
  if (!expected) return null;
  const diff = daysBetween(expected, todayDate);
  if (diff > 0) return { label: `${diff}d overdue`, overdueDays: diff, isOverdue: true };
  if (diff === 0) return { label: 'Due today', overdueDays: 0, isOverdue: false };
  return null;
}

// ---- Vehicle / customer labels ----

const INDIAN_PLATE = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/;

/** "KL07CB4521" → "KL 07 CB 4521". Unknown formats pass through unchanged. */
export function formatPlate(raw: string | null | undefined): string {
  const compact = (raw ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (!compact) return 'NO PLATE';
  const m = INDIAN_PLATE.exec(compact);
  if (!m) return (raw ?? '').toUpperCase().trim();
  return m.slice(1).filter(Boolean).join(' ');
}

/** "KL07CB4521" (compact, for dense rows). */
export function compactPlate(raw: string | null | undefined): string {
  return (raw ?? '').toUpperCase().replace(/[\s-]/g, '') || 'NO PLATE';
}

export function modelLabel(v: Vehicle | null | undefined): string {
  if (!v) return 'Vehicle';
  return `${v.make} ${v.model}`.trim() || 'Vehicle';
}

export function modelWithColor(v: Vehicle | null | undefined): string {
  const model = modelLabel(v);
  const color = (v?.color ?? '').trim();
  return color ? `${model} · ${color}` : model;
}

/** "+919072034455" / "9072034455" → "+91 90720 34455". Other formats pass through trimmed. */
export function formatPhone(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  let national: string;
  if (digits.length === 10) national = digits;
  else if (digits.length === 12 && digits.startsWith('91')) national = digits.slice(2);
  else return (raw ?? '').trim();
  return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
}

export function displayName(c: Customer | null | undefined): string {
  return c?.name?.trim() || 'Walk-in customer';
}

export type VehicleSecurity = { kind: 'key' } | { kind: 'pin'; value: string } | { kind: 'unknown' };

/** Physical key handover vs a PIN/password the customer shared. */
export function securityOf(passwordOrPin: string | null | undefined): VehicleSecurity {
  const raw = (passwordOrPin ?? '').trim();
  if (!raw) return { kind: 'unknown' };
  if (raw.toLowerCase() === 'physical key' || raw.toLowerCase() === 'key') return { kind: 'key' };
  return { kind: 'pin', value: raw };
}
