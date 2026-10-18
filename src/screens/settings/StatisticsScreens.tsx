import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDays, dateRangeShortText, daysBetween, monthsBetween, today, yearMonthOf, type LocalDate } from '../../core/dates';
import { cn } from '../../core/format';
import {
  buildPeriod,
  dailyTotals,
  defaultSelection,
  epochOf,
  formatMetric,
  formatMetricWithUnit,
  inTotal,
  metricInfo,
  STAT_METRICS,
  STAT_RANGES,
  type StatMetric,
  type StatRange,
} from '../../core/statistics';
import { useData } from '../../data/store';
import { connectedRadius, IconButton } from '../../ui/components';
import { DateRangePicker } from '../../ui/datePickers';
import { Icon, type IconName } from '../../ui/icons';
import { SettingsFrame } from './SettingsFrame';
import { StatChart } from './StatChart';

const METRIC_ICON: Record<StatMetric, IconName> = { revenue: 'rupee', completed: 'checkCircle', arrivals: 'arrival' };

/** Settings → Statistics: one row per metric, each with its latest 7-day daily average. */
export function StatisticsMenuPage({ onBack, pane }: { onBack?: () => void; pane: boolean }) {
  const { records } = useData();
  const navigate = useNavigate();
  const todayDate = today();
  const summaries = useMemo(
    () =>
      STAT_METRICS.map((m) => {
        const avg = buildPeriod(dailyTotals(records, m.key), m.key, 'week', 0, null, null, todayDate).average;
        const figure = m.key === 'revenue' ? formatMetric(m.key, avg) : `${formatMetric(m.key, avg)} ${m.unit}`;
        return `${figure} per day · last 7 days`;
      }),
    [records, todayDate]
  );
  return (
    <SettingsFrame title="Statistics" onBack={onBack} pane={pane}>
      <p className={cn('m-0 pb-4 text-on-surface-variant t-body-md', pane ? 'px-2' : 'px-6')}>Choose what to look at</p>
      <div className={cn('flex flex-col gap-0.5 pb-8', pane ? '' : 'px-4')}>
        {STAT_METRICS.map((m, i) => (
          <button
            key={m.key}
            type="button"
            onClick={() => navigate(`/settings/statistics/${m.key}`)}
            className="state-layer flex w-full items-center gap-4 bg-surface-container-low p-4 text-left text-on-surface"
            style={{ borderRadius: connectedRadius(i, STAT_METRICS.length) }}
          >
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-container-high text-on-surface">
              <Icon name={METRIC_ICON[m.key]} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="t-title-md">{m.title}</span>
              <span className="text-on-surface-variant t-body-md">{summaries[i]}</span>
            </span>
            <Icon name="chevronRight" className="text-on-surface-variant" />
          </button>
        ))}
      </div>
    </SettingsFrame>
  );
}

const isMetric = (s: string | undefined): s is StatMetric => s === 'revenue' || s === 'completed' || s === 'arrivals';

/** One statistic: range tabs, headline, chart, list (StatisticsDetailScreen). */
export function StatisticsDetailPage({ onBack, pane }: { onBack: () => void; pane: boolean }) {
  const { metric: raw } = useParams();
  const metric: StatMetric = isMetric(raw) ? raw : 'revenue';
  const { records } = useData();
  const todayDate = today();
  const [range, setRange] = useState<StatRange>('week');
  // Each range keeps its own place, so coming back to Week returns to the week that was showing.
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [customOffset, setCustomOffset] = useState(0);
  const [customFrom, setCustomFrom] = useState<LocalDate | null>(null);
  const [customTo, setCustomTo] = useState<LocalDate | null>(null);
  // The chosen bar: a day (epoch day) in the day-based ranges, a month bar's index in All.
  const [pickedDay, setPickedDay] = useState<number | null>(null);
  const [pickedMonth, setPickedMonth] = useState(-1);
  const [showPicker, setShowPicker] = useState(false);

  const offset = range === 'week' ? weekOffset : range === 'month' ? monthOffset : range === 'custom' ? customOffset : 0;
  const totals = useMemo(() => dailyTotals(records, metric), [records, metric]);
  const { period, older, newer } = useMemo(() => {
    const at = (o: number) => buildPeriod(totals, metric, range, o, customFrom, customTo, todayDate);
    const p = at(offset);
    // The periods either side, shown beside the chart while it is swiped.
    return { period: p, older: p.canGoBack ? at(offset + 1) : null, newer: p.canGoForward ? at(offset - 1) : null };
  }, [totals, metric, range, offset, customFrom, customTo, todayDate]);

  const firstDay = period.firstDay;
  const rawSel = firstDay === null ? pickedMonth : pickedDay !== null ? pickedDay - epochOf(firstDay) : -1;
  const selected = rawSel >= 0 && rawSel < period.bars.length && !period.bars[rawSel].isFuture ? rawSel : defaultSelection(period);
  const selectedBar = period.bars[selected];
  const selectedDay = firstDay ? addDays(firstDay, selected) : null;

  const page = (by: number) => {
    if (range === 'week') setWeekOffset((o) => o + by);
    else if (range === 'month') setMonthOffset((o) => o + by);
    else if (range === 'custom') setCustomOffset((o) => o + by);
  };

  const chooseRange = (r: StatRange) => {
    // Week and Month zoom around the selected day: it stays selected, and the new range shows the
    // period holding it (the remembered week, when that week still holds it).
    if (r !== range && selectedDay && (r === 'week' || r === 'month')) {
      setPickedDay(epochOf(selectedDay));
      if (r === 'month') setMonthOffset(monthsBetween(yearMonthOf(selectedDay), yearMonthOf(todayDate)));
      else {
        const weekEnd = addDays(todayDate, -7 * weekOffset);
        if (selectedDay > weekEnd || selectedDay < addDays(weekEnd, -6)) setWeekOffset(Math.floor(daysBetween(selectedDay, todayDate) / 7));
      }
    }
    setRange(r);
  };

  const info = metricInfo(metric);
  const total = formatMetric(metric, period.total);

  return (
    <SettingsFrame title={info.title} onBack={onBack} pane={pane}>
      <div role="radiogroup" aria-label="Range" className={cn('flex gap-0.5 pt-2', pane ? '' : 'px-4')}>
        {STAT_RANGES.map((r, i) => {
          const on = r.key === range;
          const startR = on || i === 0 ? 24 : 8;
          const endR = on || i === STAT_RANGES.length - 1 ? 24 : 8;
          return (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => chooseRange(r.key)}
              className={cn('state-layer h-12 flex-1 t-label-lg', on ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface')}
              style={{ borderRadius: `${startR}px ${endR}px ${endR}px ${startR}px`, transition: 'border-radius 250ms cubic-bezier(0.2,0,0,1), background-color 150ms linear' }}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {range === 'custom' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }} className="overflow-hidden">
            <div className={cn('grid grid-cols-2 gap-2 pt-3', pane ? '' : 'px-4')}>
              {(['From', 'To'] as const).map((label) => {
                const value = dateRangeShortText(label === 'From' ? period.start : period.end, null);
                return (
                  <button key={label} type="button" onClick={() => setShowPicker(true)} aria-label={`${label} date: ${value}`} className="state-layer flex h-12 items-center justify-between rounded-lg bg-surface-container-high px-4 text-left">
                    <span className="flex flex-col">
                      <span className="text-on-surface-variant t-body-sm">{label}</span>
                      <span className="text-on-surface t-label-lg">{value}</span>
                    </span>
                    <Icon name="calendar" size={20} className="text-on-surface-variant" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn('flex items-center pt-4', pane ? 'pl-2' : 'pr-4 pl-6')}>
        <h2 className="m-0 flex-1 text-on-surface t-title-lg" aria-live="polite">
          {period.title}
        </h2>
        {range !== 'all' && (
          <>
            <IconButton icon="chevronLeft" label="Previous period" disabled={!period.canGoBack} onClick={() => page(1)} className="text-on-surface" />
            <IconButton icon="chevronRight" label="Next period" disabled={!period.canGoForward} onClick={() => page(-1)} className="text-on-surface" />
          </>
        )}
      </div>

      <div className={cn('flex items-baseline gap-2 pt-2', pane ? 'px-2' : 'px-6')}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={total} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }} className={cn('text-on-surface', total.length > 9 ? 't-display-md' : 't-display-lg')}>
            {total}
          </motion.span>
        </AnimatePresence>
        <span className="text-on-surface-variant t-body-md">{inTotal(metric)}</span>
      </div>

      <div className={cn('flex flex-col gap-2 pt-6', pane ? 'pr-0 pl-2' : 'pr-4 pl-6')}>
        <div className="flex min-h-7 items-center justify-between pr-2">
          <span className="text-on-surface t-label-lg">{selectedBar?.label ?? ''}</span>
          <span className="text-on-surface t-title-md">{selectedBar ? formatMetricWithUnit(metric, selectedBar.value) : ''}</span>
        </div>
        <StatChart
          period={period}
          older={older}
          newer={newer}
          metric={metric}
          selected={selected}
          onSelect={(i) => (firstDay === null ? setPickedMonth(i) : setPickedDay(epochOf(firstDay) + i))}
          onPage={page}
        />
        <span className="flex items-center gap-1 text-on-surface-variant t-label-md">
          <svg width="14" height="2" aria-hidden="true">
            <line x1="0" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
          </svg>
          Average
        </span>
      </div>

      <div className={cn('flex flex-col gap-2 pt-6 pb-8', pane ? '' : 'px-4')}>
        <div className="flex justify-between px-2">
          <span className="text-on-surface t-title-md">{period.rowsTitle}</span>
          <span className="text-on-surface-variant t-body-md">{period.rowsColumn}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          {period.rows.map((row, i) => (
            <div key={`${row.title}-${i}`} className="flex min-h-16 items-center bg-surface-container-low px-5 py-2" style={{ borderRadius: connectedRadius(i, period.rows.length) }}>
              <span className="flex flex-1 flex-col">
                <span className="text-on-surface t-title-md">{row.title}</span>
                {row.sub && <span className="text-on-surface-variant t-body-sm">{row.sub}</span>}
              </span>
              <span className="text-on-surface t-title-lg">{formatMetric(metric, row.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <DateRangePicker
        open={showPicker}
        from={period.start}
        to={period.end}
        centered
        onChange={(from, to) => {
          setCustomFrom(from);
          setCustomTo(to);
          setCustomOffset(0);
        }}
        onDismiss={() => setShowPicker(false)}
      />
    </SettingsFrame>
  );
}

