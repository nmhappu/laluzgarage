import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { dateRangeShortText } from '../../core/dates';
import { cn } from '../../core/format';
import { groupByArrivalDay, ServicesListIndex, type JobCardModel, type StatusFilter } from '../../core/servicesList';
import { deleteServiceRecord, errorText } from '../../data/repository';
import { useData } from '../../data/store';
import { useServicesView } from '../../data/viewState';
import { useLayout } from '../../app/layout';
import { useOpeners } from '../../app/openers';
import { useShell, useToolbarScroll } from '../../app/shellContext';
import { DetailField, FilterChip, PinBadge, StatusChip, TextButton, type FilterChipTone } from '../../ui/components';
import { OperatorAvatarButton, ScreenHeader, SyncTopBar, syncTitleStyle, TopBar } from '../../ui/chrome';
import { DateRangePicker } from '../../ui/datePickers';
import { SearchField } from '../../ui/fields';
import { Icon, type IconName } from '../../ui/icons';
import { EmptyText, PinnedBand, Reflow, TopBarTitleSearch, useListPages, useScrolledAway } from '../../ui/listChrome';
import { useSheetSelection } from '../../app/sheet';
import { ConfirmDialog } from '../../ui/overlays';
import { BatteryBadge } from '../../ui/battery';

const FILTERS: { key: StatusFilter; label: string; tone: FilterChipTone }[] = [
  { key: 'all', label: 'All', tone: 'secondary' },
  { key: 'pending', label: 'Pending', tone: 'pending' },
  { key: 'in-progress', label: 'In progress', tone: 'in-progress' },
  { key: 'completed', label: 'Delivered', tone: 'completed' },
];

const SEARCH_PLACEHOLDER = 'Search plate, customer or phone';
const BOARD_COLUMNS = ['pending', 'in-progress', 'completed'] as const;

export function ServicesScreen({ active }: { active: boolean }) {
  const { records, vehicles, customers, isLoading, sync, showMessage } = useData();
  const view = useServicesView();
  const { account } = useShell();
  const layout = useLayout();
  const { openJob, editJob } = useOpeners();
  // Rail layouts open a job in the side sheet; its card stays selected while it is open.
  const openId = useSheetSelection().job;

  const index = useMemo(() => new ServicesListIndex(records, vehicles, customers), [records, vehicles, customers]);
  const { statusFilter, newestFirst, dateFrom, dateTo, setFocusServicesSearch } = view;
  // The field echoes every keystroke at once; the list catches up in the background.
  const servicesSearch = useDeferredValue(view.servicesSearch);
  // The board shows every status in its own column, so it ignores the status chips.
  const cards = useMemo(
    () => index.select({ statusFilter: layout.board ? 'all' : statusFilter, search: servicesSearch, newestFirst, dateFrom, dateTo }),
    [index, layout.board, statusFilter, servicesSearch, newestFirst, dateFrom, dateTo]
  );
  const columns = useMemo(
    () => (layout.board ? BOARD_COLUMNS.map((status) => cards.filter((c) => c.status.value === status)) : null),
    [layout.board, cards]
  );
  // Cards are drawn a page at a time (per column on the board); counts and search cover them all.
  const { limit, sentinel } = useListPages(
    columns ? Math.max(...columns.map((c) => c.length)) : cards.length,
    [layout.board, statusFilter, servicesSearch, newestFirst, dateFrom, dateTo].join('|')
  );
  const groups = useMemo(() => groupByArrivalDay(cards.slice(0, limit)), [cards, limit]);

  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [toDelete, setToDelete] = useState<JobCardModel | null>(null);
  const [showDates, setShowDates] = useState(false);
  const dateButton = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useToolbarScroll(scrollRef, active && layout.isCompact);
  const headerGone = useScrolledAway(headerRef, scrollRef);

  useEffect(() => {
    if (active && view.focusServicesSearch) {
      scrollRef.current?.scrollTo({ top: 0 });
      searchRef.current?.focus();
      setFocusServicesSearch(false);
    }
  }, [active, view.focusServicesSearch, setFocusServicesSearch]);

  const toggleTasks = useCallback(
    (id: string) =>
      setOpenIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    []
  );

  const confirmDelete = async () => {
    const card = toDelete;
    setToDelete(null);
    if (!card) return;
    try {
      await deleteServiceRecord(card.record.id);
      showMessage('Job card deleted');
    } catch (e) {
      showMessage(`Couldn't delete the job card. ${errorText(e)}`);
    }
  };

  const emptyText = isLoading
    ? 'Loading jobs…'
    : servicesSearch.trim()
      ? `No jobs match “${servicesSearch.trim()}”.`
      : view.dateFrom
        ? 'No jobs arrived in this date range.'
        : 'No jobs with this status.';

  const renderCard = (card: JobCardModel) => {
    const job = (
      <JobCard
        card={card}
        compact={view.compactCards}
        tasksOpen={openIds.has(card.record.id)}
        selected={openId === card.record.id}
        onToggleTasks={toggleTasks}
        onOpen={openJob}
        onEdit={editJob}
        onDelete={setToDelete}
      />
    );
    // On rail layouts the cards slide to their new places when the side sheet or the rail changes the width.
    return layout.isCompact ? <div key={card.record.id}>{job}</div> : <Reflow key={card.record.id}>{job}</Reflow>;
  };

  const chips = (
    <div role="group" aria-label="Filter by status" className="no-scrollbar flex gap-2 overflow-x-auto">
      {FILTERS.map((f) => (
        <FilterChip key={f.key} label={f.label} tone={f.tone} count={index.counts[f.key]} selected={view.statusFilter === f.key} onClick={() => view.setStatusFilter(f.key)} />
      ))}
    </div>
  );

  const dateChip = view.dateFrom ? (
    <button
      type="button"
      onClick={() => view.setDateRange(null, null)}
      aria-label={`Clear date filter: ${dateRangeShortText(view.dateFrom, view.dateTo)}`}
      className="state-layer inline-flex h-8 items-center gap-2 rounded-full bg-secondary-container pr-2.5 pl-3 text-on-secondary-container t-label-md"
    >
      {dateRangeShortText(view.dateFrom, view.dateTo)}
      <Icon name="close" size={16} />
    </button>
  ) : null;

  const calendarButton = (
    <ToolbarIconButton
      ref={dateButton}
      icon="calendar"
      label="Filter by arrival date"
      active={showDates || view.dateFrom !== null}
      onClick={() => setShowDates((v) => !v)}
    />
  );
  const sortButton = (
    <ToolbarIconButton
      icon={view.newestFirst ? 'arrowDown' : 'arrowUp'}
      label={view.newestFirst ? 'Sorted newest first by arrival. Switch to oldest first' : 'Sorted oldest first by arrival. Switch to newest first'}
      active={false}
      onClick={() => view.setNewestFirst((v) => !v)}
    />
  );
  const compactToggle = (
    <TextButton
      text={view.compactCards ? 'Compact' : 'Detailed'}
      aria-label={view.compactCards ? 'Showing compact cards. Switch to detailed cards' : 'Showing detailed cards. Switch to compact cards'}
      onClick={() => view.setCompactCards((v) => !v)}
    />
  );

  return (
    <div className="flex h-full flex-col bg-surface">
      {layout.isCompact ? (
        <SyncTopBar sync={sync}>
          <TopBar>
            <TopBarTitleSearch
              title="Services"
              summary={index.summary}
              headerGone={headerGone}
              query={view.servicesSearch}
              onQuery={view.setServicesSearch}
              placeholder={SEARCH_PLACEHOLDER}
              label="Search services"
              titleStyle={syncTitleStyle(sync)}
            />
            <OperatorAvatarButton account={account} />
          </TopBar>
        </SyncTopBar>
      ) : (
        <SyncTopBar sync={sync}>
          <header className="flex min-h-24 items-center gap-2 pr-4 pl-6">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5" style={syncTitleStyle(sync)}>
              <h1 className="m-0 text-on-surface t-display-sm">Services</h1>
              <span className="truncate text-on-surface-variant t-body-md">{index.summary}</span>
            </div>
            <SearchField ref={searchRef} value={view.servicesSearch} onValue={view.setServicesSearch} placeholder={SEARCH_PLACEHOLDER} label="Search services" className={cn('mr-2', layout.railExpanded ? 'w-[360px]' : 'w-60')} />
            {calendarButton}
            {sortButton}
            <OperatorAvatarButton account={account} />
          </header>
        </SyncTopBar>
      )}

      <div className={cn('flex min-h-0 flex-1 flex-col', !layout.isCompact && 'sheet-inset px-6 pb-6')}>
      <div ref={scrollRef} className={cn('min-h-0 flex-1 overflow-y-auto', !layout.isCompact && 'items-tone rounded-[28px] bg-surface-container-low')}>
        {layout.isCompact ? (
          <div className="pb-[168px]">
            <div ref={headerRef} className="mx-auto w-full max-w-[640px]">
              <ScreenHeader title="Services" summary={index.summary} />
            </div>
            <div className="mx-auto w-full max-w-[640px] px-4">
              <SearchField ref={searchRef} value={view.servicesSearch} onValue={view.setServicesSearch} placeholder={SEARCH_PLACEHOLDER} label="Search services" />
            </div>
            <PinnedBand>
              <div className="px-4 pt-4">{chips}</div>
              <div className="flex items-center pt-2 pr-2 pl-6">
                <div className="flex-1">{dateChip}</div>
                {compactToggle}
                {calendarButton}
                {sortButton}
              </div>
            </PinnedBand>
            <div className="mx-auto w-full max-w-[640px]">
              {groups.map((g) => (
                <section key={g.key} aria-label={g.label}>
                  <DayHeader label={g.label} emphasized={view.compactCards} />
                  <div className="flex flex-col gap-2 px-4">{g.cards.map(renderCard)}</div>
                </section>
              ))}
              {sentinel}
              {cards.length === 0 && <EmptyText>{emptyText}</EmptyText>}
            </div>
          </div>
        ) : columns ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">{dateChip}</div>
              {compactToggle}
            </div>
            <div className="grid grid-cols-[repeat(3,minmax(240px,1fr))] gap-4">
              {BOARD_COLUMNS.map((status, i) => {
                const col = columns[i];
                const def = FILTERS.find((f) => f.key === status)!;
                return (
                  <section key={status} aria-label={def.label} className="flex min-w-0 flex-col gap-2">
                    <div className="flex h-10 items-center justify-between rounded-full bg-surface-container-high pr-3 pl-4">
                      <span className="text-on-surface t-title-md font-bold">{def.label}</span>
                      <StatusChip text={String(col.length)} tone={status === 'completed' ? 'completed' : status} className="min-w-6 justify-center t-label-tiny" />
                    </div>
                    {col.slice(0, limit).map(renderCard)}
                    {col.length === 0 && <p className="m-0 px-4 py-6 text-center text-on-surface-variant t-body-md">{isLoading ? 'Loading jobs…' : 'No jobs here.'}</p>}
                  </section>
                );
              })}
            </div>
            {sentinel}
          </div>
        ) : (
          <div className="flex flex-col pb-6">
            <div className="sticky top-0 z-10 bg-surface-container-low px-4 pt-4 pb-2">
              {chips}
              <div className="flex items-center pt-2">
                <div className="flex-1">{dateChip}</div>
                {compactToggle}
              </div>
            </div>
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label} className="px-2">
                <DayHeader label={g.label} emphasized={view.compactCards} />
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-2 px-4">{g.cards.map(renderCard)}</div>
              </section>
            ))}
            {sentinel}
            {cards.length === 0 && <EmptyText>{emptyText}</EmptyText>}
          </div>
        )}
      </div>
      </div>

      <DateRangePicker
        open={showDates}
        from={view.dateFrom}
        to={view.dateTo}
        arrivalDays={index.arrivalDays}
        anchor={dateButton.current}
        onChange={view.setDateRange}
        onDismiss={() => setShowDates(false)}
      />
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete job card?"
        lead={
          toDelete && (
            <p className="m-0 text-on-surface-variant t-body-md">
              <span className="font-plate font-bold tracking-[1px] text-on-surface">{toDelete.plate}</span> · {toDelete.customer}
            </p>
          )
        }
        body="This job card and its tasks are permanently deleted. This can’t be undone."
        confirmText="Delete"
        dismissText="Cancel"
        onConfirm={() => void confirmDelete()}
        onDismiss={() => setToDelete(null)}
      />
    </div>
  );
}

/** Day header: label on the left, then a 2dp outline rule filling the row, both ends fading out. */
function DayHeader({ label, emphasized }: { label: string; emphasized: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-4 pb-2">
      <h2 className={cn('m-0 shrink-0 t-label-lg', emphasized ? 'text-on-surface' : 'text-on-surface-variant')}>{label}</h2>
      <span
        aria-hidden="true"
        className="h-0.5 flex-1"
        style={{ backgroundImage: 'linear-gradient(to right, transparent 0%, var(--color-outline) 15%, var(--color-outline) 85%, transparent 100%)' }}
      />
    </div>
  );
}

/** 48dp round icon button for the toolbar (date filter, sort); [active] tints the container. */
const ToolbarIconButton = ({ icon, label, active, onClick, ref }: { icon: IconName; label: string; active: boolean; onClick: () => void; ref?: React.Ref<HTMLButtonElement> }) => (
  <button
    ref={ref}
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={active}
    onClick={onClick}
    className={cn('state-layer flex size-12 shrink-0 items-center justify-center rounded-full text-primary', active ? 'bg-surface-container-high' : 'bg-transparent')}
  >
    <Icon name={icon} />
  </button>
);

/**
 * Job card. Detailed: plate, vehicle and status, customer and security, a View problems / Edit /
 * Delete row, the expandable problem list and the progress footer. Compact: plate, model and status
 * over the full problem list.
 */
export const JobCard = memo(function JobCard({
  card,
  compact,
  tasksOpen,
  selected = false,
  onToggleTasks,
  onOpen,
  onEdit,
  onDelete,
}: {
  card: JobCardModel;
  compact: boolean;
  tasksOpen: boolean;
  /** Rail layouts: this job is open in the side sheet. */
  selected?: boolean;
  onToggleTasks: (id: string) => void;
  onOpen: (id: string, el: HTMLElement) => void;
  onEdit: (id: string) => void;
  onDelete: (card: JobCardModel) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const id = card.record.id;
  const status = card.status.value;
  const fraction = card.tasksTotal === 0 ? 0 : card.tasksDone / card.tasksTotal;
  return (
    <div ref={root} className={cn('relative flex flex-col gap-3 rounded-xl p-4 transition-colors duration-150', selected ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-low text-on-surface')}>
      {/* The whole card opens the job; the inner buttons sit above this layer. */}
      <button type="button" aria-label={`Open job card ${card.plate}, ${card.customer}`} onClick={() => root.current && onOpen(id, root.current)} className="state-layer absolute inset-0 rounded-xl" />
      <div className="pointer-events-none relative flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="t-plate-card">{card.plate}</span>
            <span className="truncate text-on-surface-variant t-body-lg">{compact ? card.vehicleModel : card.vehicle}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusChip text={card.status.label} tone={card.status.tone} />
            {card.lateLabel && <StatusChip text={card.lateLabel} tone="overdue" />}
            <BatteryBadge percent={card.battery} />
          </div>
        </div>
        {!compact && (
          <div className="flex flex-col gap-3">
            <DetailField label="Customer" value={card.customer} truncate />
            <DetailField label="Security">
              {card.security.kind === 'pin' ? (
                <PinBadge pin={card.security.value} />
              ) : card.security.kind === 'key' ? (
                <span className="t-title-md">Physical key</span>
              ) : (
                <span className="text-on-surface-variant t-title-md">Not recorded</span>
              )}
            </DetailField>
          </div>
        )}
      </div>

      {compact ? (
        <ProblemList tasks={card.tasks} showTitle={false} className="pointer-events-none relative" />
      ) : (
        <div className="relative flex flex-col">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleTasks(id)}
              aria-expanded={tasksOpen}
              className={cn('state-layer h-12 flex-1 rounded-full text-on-surface t-label-lg', tasksOpen ? 'bg-surface-container-highest' : 'bg-surface-container-high')}
            >
              {tasksOpen ? 'Hide problems' : 'View problems'}
            </button>
            <CardIconButton icon="edit" label={`Edit job card ${card.plate}`} className="text-on-surface" onClick={() => onEdit(id)} />
            <CardIconButton icon="trash" label={`Delete job card ${card.plate}`} className="text-error" onClick={() => onDelete(card)} />
          </div>
          <AnimatePresence initial={false}>
            {tasksOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }} className="pointer-events-none overflow-hidden">
                <ProblemList tasks={card.tasks} className="pt-3" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!compact && (
        <div className="pointer-events-none relative flex flex-col">
          <div className="h-px bg-outline-variant" />
          <div className="flex items-center gap-3 pt-3">
            {status === 'completed' || status === 'cancelled' ? (
              <span className="flex-1 text-on-surface-variant t-body-sm">{status === 'completed' ? card.deliveredText : 'Cancelled'}</span>
            ) : (
              <span className="flex flex-1 items-center gap-2" role="img" aria-label={`${card.tasksDone} of ${card.tasksTotal} tasks done`}>
                <span className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-surface-container-highest">
                  <span className={cn('block h-full rounded-[3px]', status === 'pending' ? 'bg-warning' : 'bg-tertiary')} style={{ width: `${fraction * 100}%` }} />
                </span>
                <span className="whitespace-nowrap text-on-surface-variant t-body-sm">
                  {card.tasksDone} of {card.tasksTotal} tasks
                </span>
              </span>
            )}
            <span className="flex items-end gap-1">
              {card.totalLabel && <span className="pb-0.5 text-on-surface-variant t-body-sm">{card.totalLabel}</span>}
              <span className="font-bold t-title-md">{card.total}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

function CardIconButton({ icon, label, className, onClick }: { icon: IconName; label: string; className: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cn('state-layer flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high', className)}>
      <Icon name={icon} />
    </button>
  );
}

/** Problems & requests as a bulleted list. */
function ProblemList({ tasks, showTitle = true, className }: { tasks: string[]; showTitle?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-col', className)} aria-label="Problems and requests">
      {showTitle && <span className="pb-1 text-on-surface-variant t-body-sm">Problems &amp; requests</span>}
      {tasks.length === 0 && <span className="py-1 text-on-surface-variant t-body-md">No problems recorded.</span>}
      {tasks.map((t, i) => (
        <span key={i} className="flex items-center gap-3 py-1">
          <span aria-hidden="true" className="mx-1 size-[5px] shrink-0 rounded-full bg-on-surface-variant" />
          <span className="text-on-surface t-body-md">{t}</span>
        </span>
      ))}
    </div>
  );
}
