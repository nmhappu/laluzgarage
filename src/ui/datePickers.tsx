import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../core/format';
import {
  addMonths,
  dateRangeShortText,
  DAYS_NARROW,
  dayOfWeek,
  longLabelWithYear,
  maxDate,
  minDate,
  monthYearLabel,
  today as todayFn,
  weekdayLabel,
  yearMonthOf,
  ymDay,
  ymLength,
  type LocalDate,
} from '../core/dates';
import { DialogTextButton, IconButton } from './components';
import { Modal } from './overlays';

/** Sunday-first grid: leading blanks, then each day of the month. */
function monthCells(ym: string): (LocalDate | null)[] {
  const first = ymDay(ym, 1);
  const lead = dayOfWeek(first);
  const cells: (LocalDate | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= ymLength(ym); d++) cells.push(ymDay(ym, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function MonthHeader({ month, onMonth }: { month: string; onMonth: (m: string) => void }) {
  return (
    <div className="flex items-center pl-3">
      <span className="flex-1 text-on-surface t-title-md" aria-live="polite">
        {monthYearLabel(month)}
      </span>
      <IconButton icon="chevronLeft" label="Previous month" onClick={() => onMonth(addMonths(month, -1))} className="text-on-surface" />
      <IconButton icon="chevronRight" label="Next month" onClick={() => onMonth(addMonths(month, 1))} className="text-on-surface" />
    </div>
  );
}

function WeekdayRow() {
  return (
    <div className="grid grid-cols-7" aria-hidden="true">
      {DAYS_NARROW.map((w, i) => (
        <span key={i} className="flex h-8 items-center justify-center text-on-surface-variant t-label-md">
          {w}
        </span>
      ))}
    </div>
  );
}

function PickerCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-2 rounded-2xl bg-surface-container-high px-3 pt-6 pb-3', className)}>{children}</div>;
}

/**
 * Docked date picker from the intake artboard: label and selected-date headline, month row with
 * previous / next, 48dp cells with 40dp day circles, Cancel / OK. Days failing [isAllowed] are disabled.
 */
export function DatePickerDialog({
  open,
  label,
  initial,
  isAllowed,
  onDismiss,
  onConfirm,
}: {
  open: boolean;
  label: string;
  initial: LocalDate | null;
  isAllowed: (d: LocalDate) => boolean;
  onDismiss: () => void;
  onConfirm: (d: LocalDate) => void;
}) {
  const todayDate = todayFn();
  const [selected, setSelected] = useState<LocalDate | null>(initial);
  const [month, setMonth] = useState(yearMonthOf(initial ?? todayDate));
  const titleId = useId();
  useEffect(() => {
    if (open) {
      setSelected(initial);
      setMonth(yearMonthOf(initial ?? todayFn()));
    }
  }, [open, initial]);
  return (
    <Modal open={open} onDismiss={onDismiss} labelledBy={titleId} className="w-full max-w-[420px]">
      <PickerCard>
        <div className="flex flex-col gap-1 px-3">
          <span id={titleId} className="text-on-surface-variant t-label-lg">
            {label}
          </span>
          <span className="text-on-surface t-headline-md">{selected ? weekdayLabel(selected) : 'Select date'}</span>
        </div>
        <div className="mt-2 h-px bg-outline-variant" />
        <MonthHeader month={month} onMonth={setMonth} />
        <div>
          <WeekdayRow />
          <div className="grid grid-cols-7">
            {monthCells(month).map((day, i) => {
              if (!day) return <span key={i} className="h-12" />;
              const enabled = isAllowed(day);
              const isSel = day === selected;
              const isToday = day === todayDate;
              return (
                <span key={i} className="flex h-12 items-center justify-center">
                  <button
                    type="button"
                    disabled={!enabled}
                    aria-pressed={isSel}
                    aria-label={longLabelWithYear(day)}
                    onClick={() => setSelected(day)}
                    className={cn(
                      'state-layer flex size-10 items-center justify-center rounded-full t-body-md',
                      isSel ? 'bg-primary font-bold text-on-primary' : enabled ? 'text-on-surface' : 'text-on-surface/38',
                      isToday && !isSel && enabled && 'shadow-[inset_0_0_0_1px_var(--color-primary)]'
                    )}
                  >
                    {Number(day.slice(8))}
                  </button>
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <DialogTextButton text="Cancel" onClick={onDismiss} className="text-tertiary" />
          <DialogTextButton text="OK" onClick={() => (selected ? onConfirm(selected) : onDismiss())} className="text-tertiary" />
        </div>
      </PickerCard>
    </Modal>
  );
}

/**
 * Range calendar (ServicesDateFilter.kt): tap a day for one date, a second day for a range. Days
 * with jobs carry a dot. As a popup under its anchor, or [centered] as a dialog over a scrim.
 */
export function DateRangePicker({
  open,
  from,
  to,
  arrivalDays,
  centered = false,
  anchor,
  onChange,
  onDismiss,
}: {
  open: boolean;
  from: LocalDate | null;
  to: LocalDate | null;
  arrivalDays?: Set<LocalDate>;
  centered?: boolean;
  anchor?: HTMLElement | null;
  onChange: (from: LocalDate | null, to: LocalDate | null) => void;
  onDismiss: () => void;
}) {
  const [month, setMonth] = useState(yearMonthOf(from ?? todayFn()));
  const titleId = useId();
  // Only when it opens: paging months must not snap back to the selection.
  const fromRef = useRef(from);
  fromRef.current = from;
  useEffect(() => {
    if (open) setMonth(yearMonthOf(fromRef.current ?? todayFn()));
  }, [open]);
  const lo = from;
  const hi = from === null ? null : to ?? from;
  const headline = lo === null || hi === null ? 'Select dates' : lo === hi ? weekdayLabel(lo) : dateRangeShortText(lo, hi);
  const hint =
    lo === null || hi === null ? 'Tap a day, or tap two days for a range.' : lo === hi ? 'Tap another day to make a range.' : `Showing ${weekdayLabel(lo)} to ${weekdayLabel(hi)}.`;

  const pick = (day: LocalDate) => {
    if (from === null || (to !== null && to !== from)) onChange(day, null);
    else if (day === from) onChange(day, day);
    else onChange(minDate(from, day), maxDate(from, day));
  };

  const card = (
    <PickerCard className="w-[358px] max-w-[calc(100vw-32px)] shadow-level3">
      <div className="flex flex-col gap-1 px-3">
        <span id={titleId} className="text-on-surface-variant t-label-lg">
          Arrival date
        </span>
        <span className="text-on-surface t-headline-md">{headline}</span>
      </div>
      <div className="mt-2 h-px bg-outline-variant" />
      <MonthHeader month={month} onMonth={setMonth} />
      <div>
        <WeekdayRow />
        <div className="grid grid-cols-7">
          {monthCells(month).map((day, i) => {
            if (!day) return <span key={i} className="h-12" />;
            const isEnd = lo !== null && (day === lo || day === hi);
            const inBand = lo !== null && hi !== null && lo !== hi && day >= lo && day <= hi;
            const hasJobs = arrivalDays?.has(day) ?? false;
            const bandRadius = `${day === lo ? '999px' : '0'} ${day === hi ? '999px' : '0'} ${day === hi ? '999px' : '0'} ${day === lo ? '999px' : '0'}`;
            return (
              <button
                key={i}
                type="button"
                aria-pressed={isEnd}
                aria-label={weekdayLabel(day) + (hasJobs ? ', has jobs' : '')}
                onClick={() => pick(day)}
                className="relative flex h-12 items-center justify-center"
              >
                {inBand && <span aria-hidden="true" className="absolute inset-x-0 inset-y-1 bg-secondary-container" style={{ borderRadius: bandRadius }} />}
                <span
                  className={cn(
                    'state-layer relative flex size-10 items-center justify-center rounded-full t-body-md',
                    isEnd ? 'bg-primary font-bold text-on-primary' : inBand ? 'text-on-secondary-container' : 'text-on-surface'
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                {hasJobs && <span aria-hidden="true" className={cn('absolute bottom-[3px] size-1 rounded-full', isEnd ? 'bg-on-primary' : 'bg-primary')} />}
              </button>
            );
          })}
        </div>
      </div>
      <p className="m-0 px-3 text-on-surface-variant t-body-sm">{hint}</p>
      <div className="flex justify-end gap-2 pt-1">
        <DialogTextButton text="Clear" onClick={() => onChange(null, null)} className="text-tertiary" />
        <DialogTextButton text="Done" onClick={onDismiss} className="text-tertiary" />
      </div>
    </PickerCard>
  );

  if (centered) {
    return (
      <Modal open={open} onDismiss={onDismiss} labelledBy={titleId}>
        {card}
      </Modal>
    );
  }
  return <AnchoredPopup open={open} anchor={anchor ?? null} onDismiss={onDismiss} labelledBy={titleId}>{card}</AnchoredPopup>;
}

/** A popup under the end of [anchor]; outside clicks and Escape dismiss it. */
function AnchoredPopup({ open, anchor, onDismiss, labelledBy, children }: { open: boolean; anchor: HTMLElement | null; onDismiss: () => void; labelledBy: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: Math.max(16, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, anchor]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !anchor?.contains(t)) onDismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, anchor, onDismiss]);
  return createPortal(
    <AnimatePresence>
      {open && pos && (
        <motion.div
          ref={ref}
          role="dialog"
          aria-labelledby={labelledBy}
          className="fixed z-50"
          style={{ top: pos.top, right: pos.right, transformOrigin: 'top right' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
