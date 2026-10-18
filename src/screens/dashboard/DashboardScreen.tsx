import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { computeDashboard, greeting, SERVICE_RANGES, sparklinePaths, type DashboardStats, type ServiceRange } from '../../core/dashboard';
import { longLabel, today } from '../../core/dates';
import { cn } from '../../core/format';
import { useData } from '../../data/store';
import { useDashboardView } from '../../data/viewState';
import { useLayout } from '../../app/layout';
import { useOpeners } from '../../app/openers';
import { useShell, useToolbarScroll } from '../../app/shellContext';
import { connectedRadius, ConnectedSegments, CookieBadge, IconButton, IconTile, Spinner, StatusChip, TextButton } from '../../ui/components';
import { OperatorAvatarButton, SyncTopBar, syncTitleStyle, TopBar } from '../../ui/chrome';
import { Icon, type IconName } from '../../ui/icons';
import { useCountUp } from '../../ui/motion';

const DECELERATE = [0.05, 0.7, 0.1, 1] as const;

/** The first-load entrance plays once per page load (rememberSaveable `entered`). */
let entered = false;

/** Section [index] of the first-load entrance: rises 24px and fades in, 50ms after the previous. */
function Enter({ index, children, className }: { index: number; children: ReactNode; className?: string }) {
  const [play] = useState(() => !entered);
  return (
    <motion.div
      className={className}
      initial={play ? { opacity: 0, y: 24 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: DECELERATE }}
      onAnimationComplete={() => {
        entered = true;
      }}
    >
      {children}
    </motion.div>
  );
}

export function DashboardScreen({ active }: { active: boolean }) {
  const { records, vehicles, customers, parts, isLoading, sync, isOnline, refresh } = useData();
  const view = useDashboardView();
  const { account } = useShell();
  const layout = useLayout();
  const navigate = useNavigate();
  const { openJob } = useOpeners();
  const scrollRef = useRef<HTMLDivElement>(null);
  useToolbarScroll(scrollRef, active && layout.isCompact);

  const stats = useMemo(() => computeDashboard(records, vehicles, customers, parts, view.dashboardRange), [records, vehicles, customers, parts, view.dashboardRange]);
  const todayDate = today();
  const firstName = account.name.split(' ')[0];
  const hello = `${greeting()}, ${firstName}`;

  const toServices = (filter: 'all' | 'pending' | 'completed') => {
    view.setStatusFilter(filter);
    navigate('/services');
  };
  const onSearch = () => {
    view.setFocusServicesSearch(true);
    navigate('/services');
  };

  const pull = usePullToRefresh(scrollRef, layout.isCompact, refresh);

  const hero = <HeroCard stats={stats} range={view.dashboardRange} onRange={view.setDashboardRange} />;
  const tiles = <StatusTiles stats={stats} onPending={() => toServices('pending')} onCompleted={() => toServices('completed')} />;
  const attention = stats.attention.length > 0 ? <NeedsAttention stats={stats} layout={layout.twoPane ? 'list' : layout.isCompact ? 'scroll' : 'grid'} onOpen={openJob} /> : null;
  const totals = <WorkshopTotals stats={stats} columns={layout.windowClass === 'medium' ? 4 : 2} onVehicles={() => navigate('/vehicles')} onInventory={() => navigate('/inventory')} />;
  const recent = <RecentActivity stats={stats} isLoading={isLoading} onOpen={openJob} onViewAll={() => toServices('all')} rowHeight={layout.twoPane ? 64 : 72} />;

  return (
    <div className="flex h-full flex-col bg-surface">
      {layout.isCompact ? (
        <SyncTopBar sync={sync}>
          <TopBar>
            <h1 className="m-0 flex-1 text-on-surface t-title-lg" style={syncTitleStyle(sync)}>
              LaluZ Garage
            </h1>
            <IconButton icon="search" label="Search" onClick={onSearch} className="text-on-surface-variant" />
            <OperatorAvatarButton account={account} />
          </TopBar>
        </SyncTopBar>
      ) : (
        <SyncTopBar sync={sync}>
          <header className="flex min-h-20 items-center gap-2 pr-4 pl-6">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5" style={syncTitleStyle(sync)}>
              <span className="text-on-surface-variant t-body-md">{longLabel(todayDate)}</span>
              <h1 className="m-0 truncate text-on-surface t-headline-md" style={{ letterSpacing: '-0.25px' }}>
                {hello}
              </h1>
            </div>
            <IconButton icon="search" label="Search" onClick={onSearch} className="text-on-surface-variant" />
            <OperatorAvatarButton account={account} />
          </header>
        </SyncTopBar>
      )}
      <OfflineBanner visible={!isOnline} />
      <div ref={scrollRef} className={cn('relative min-h-0 flex-1 overflow-y-auto', !layout.isCompact && 'sheet-inset')} {...pull.handlers}>
        {pull.indicator}
        <div style={{ transform: pull.offset ? `translateY(${pull.offset}px)` : undefined, transition: pull.dragging ? undefined : 'transform 300ms cubic-bezier(0.2,0,0,1)' }}>
          {layout.isCompact ? (
            <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 pt-2 pb-[168px]">
              <Enter index={0}>
                <div className="flex flex-col gap-1 px-2">
                  <span className="text-on-surface-variant t-body-md">{longLabel(todayDate)}</span>
                  <h1 className="m-0 text-on-surface t-headline-md" style={{ letterSpacing: '-0.25px' }}>
                    {hello}
                  </h1>
                </div>
              </Enter>
              <Enter index={1}>{hero}</Enter>
              <Enter index={2}>{tiles}</Enter>
              {attention && <Enter index={3}>{attention}</Enter>}
              <Enter index={4}>{totals}</Enter>
              <Enter index={5}>{recent}</Enter>
            </div>
          ) : layout.twoPane ? (
            <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 px-6 pb-6">
              <div className="flex min-w-0 flex-col gap-4">
                <Enter index={0}>{hero}</Enter>
                <Enter index={3}>{recent}</Enter>
              </div>
              <div className="flex min-w-0 flex-col gap-4">
                <Enter index={1}>{tiles}</Enter>
                {attention && <Enter index={2}>{attention}</Enter>}
                <Enter index={3}>{totals}</Enter>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-4 px-6 pb-6">
              <Enter index={0}>{hero}</Enter>
              <Enter index={1}>{tiles}</Enter>
              {attention && <Enter index={2}>{attention}</Enter>}
              <Enter index={3}>{totals}</Enter>
              <Enter index={4}>{recent}</Enter>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Touch pull-to-refresh at the top of the list (phones): the content follows the finger. */
function usePullToRefresh(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean, onRefresh: () => void) {
  const start = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const threshold = 80;
  const handlers = enabled
    ? {
        onTouchStart: (e: React.TouchEvent) => {
          if ((ref.current?.scrollTop ?? 0) <= 0) {
            start.current = e.touches[0].clientY;
            setDragging(true);
          }
        },
        onTouchMove: (e: React.TouchEvent) => {
          if (start.current === null) return;
          const dy = e.touches[0].clientY - start.current;
          setOffset(dy > 0 ? Math.min(threshold * 1.4, dy * 0.5) : 0);
        },
        onTouchEnd: () => {
          if (start.current !== null && offset >= threshold * 0.9) onRefresh();
          start.current = null;
          setDragging(false);
          setOffset(0);
        },
      }
    : {};
  const indicator =
    offset > 1 ? (
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center text-primary" style={{ transform: `translateY(${offset - 32}px)`, opacity: Math.min(1, offset / threshold) }} aria-hidden="true">
        <span className="flex size-10 items-center justify-center rounded-full bg-surface-container-high">
          <Spinner size={22} />
        </span>
      </div>
    ) : null;
  return { handlers, indicator, offset, dragging };
}

/** Pinned under the top bar while there's no internet; the dashboard keeps showing cached data. */
function OfflineBanner({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }} className="shrink-0 overflow-hidden">
          <div className="mx-auto w-full max-w-[640px] px-4 pb-2">
            <div className="flex items-center gap-3 rounded-xl bg-error-container px-4 py-3 text-on-error-container" role="status" aria-live="polite">
              <Icon name="warning" size={20} />
              <div className="flex flex-col gap-1">
                <span className="t-title-sm">You're offline</span>
                <span className="t-body-sm">Showing saved data. Changes will sync when you reconnect.</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HeroCard({ stats, range, onRange }: { stats: DashboardStats; range: ServiceRange; onRange: (r: ServiceRange) => void }) {
  const total = useCountUp(stats.total);
  const paths = sparklinePaths(stats.daily);
  const gradientId = useId().replace(/:/g, '');
  return (
    <section aria-label="Total services" className="flex flex-col gap-4 rounded-2xl px-6 pt-6 pb-4 text-on-hero" style={{ backgroundImage: 'linear-gradient(180deg, var(--color-hero-top) 0%, var(--color-hero-bottom) 100%)' }}>
      <div className="flex items-center">
        <span className="flex-1 t-label-lg">Total services</span>
        <ConnectedSegments
          options={SERVICE_RANGES.map((r) => r.key)}
          selected={range}
          onSelect={onRange}
          label={(k) => SERVICE_RANGES.find((r) => r.key === k)!.label}
          style={() => ({ selected: 'bg-on-hero text-hero-bottom', idle: 'bg-on-hero/14 text-on-hero' })}
          ariaLabel="Range"
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={range}
          className="flex flex-col gap-4"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.21, delay: 0.09 } }}
          exit={{ opacity: 0, transition: { duration: 0.09 } }}
        >
          <div className="flex items-end gap-3">
            <span className="t-display-lg">{total}</span>
            <span className="mb-3 flex h-8 items-center gap-1 rounded-full bg-on-hero px-3 text-hero-bottom">
              <Icon name="arrowUpRight" size={16} style={{ transform: stats.deltaUp ? undefined : 'rotate(90deg)' }} />
              <span className="font-bold t-label-lg">{stats.deltaText}</span>
            </span>
          </div>
          <svg viewBox="0 0 300 72" preserveAspectRatio="none" className="block h-[88px] w-full text-hero-line" role="img" aria-label={`Services per day, ${stats.caption}`}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {paths && (
              <>
                <path d={paths.area} fill={`url(#${gradientId})`} />
                <path d={paths.line} fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>
          <span className="opacity-80 t-body-sm">{stats.caption}</span>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function StatTile({ value, label, onClick, badge, children }: { value: string; label: string; onClick: () => void; badge: ReactNode; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="state-layer flex min-w-0 flex-col gap-4 rounded-xl bg-surface-container-low p-4 text-left text-on-surface">
      {badge}
      <span className="flex flex-col">
        <span className="t-display-sm">{value}</span>
        <span className="text-on-surface-variant t-label-lg">{label}</span>
      </span>
      {children}
    </button>
  );
}

function StatusTiles({ stats, onPending, onCompleted }: { stats: DashboardStats; onPending: () => void; onCompleted: () => void }) {
  const open = useCountUp(stats.pending + stats.inProgress);
  const delivered = useCountUp(stats.completedInRange);
  const p = Math.max(0, stats.pending);
  const ip = Math.max(0, stats.inProgress);
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatTile value={String(open)} label="Open jobs" onClick={onPending} badge={<CookieBadge icon="clock" size={48} iconSize={24} spin={false} containerClass="text-warning-container" contentClass="text-on-warning-container" />}>
        <span className="flex flex-col gap-2" role="img" aria-label={`${stats.pending} pending, ${stats.inProgress} in progress`}>
          <span className="flex h-2 w-full gap-0.5">
            {p === 0 && ip === 0 ? (
              <span className="flex-1 rounded-xs bg-surface-container-highest" />
            ) : (
              <>
                {p > 0 && <span className="bg-warning transition-[flex-grow] duration-500" style={{ flexGrow: p, borderRadius: ip > 0 ? '4px 2px 2px 4px' : 4 }} />}
                {ip > 0 && <span className="bg-tertiary transition-[flex-grow] duration-500" style={{ flexGrow: ip, borderRadius: p > 0 ? '2px 4px 4px 2px' : 4 }} />}
              </>
            )}
          </span>
          <span className="flex text-on-surface-variant t-body-sm">
            <span className="flex-1">{stats.pending} pending</span>
            <span>{stats.inProgress} in bay</span>
          </span>
        </span>
      </StatTile>
      <StatTile
        value={String(delivered)}
        label="Delivered"
        onClick={onCompleted}
        badge={
          <span className="flex size-12 items-center justify-center" aria-hidden="true">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Icon name="check" />
            </span>
          </span>
        }
      >
        <span className="flex flex-col gap-2">
          <span className="block h-2 w-full overflow-hidden rounded-xs bg-surface-container-highest" aria-hidden="true">
            <span className="block h-full rounded-xs bg-primary transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, stats.completedShare))}%` }} />
          </span>
          <span className="text-on-surface-variant t-body-sm">{stats.completedShare}% of jobs this period</span>
        </span>
      </StatTile>
    </div>
  );
}

function SectionHeader({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-center px-2">
      <h2 className="m-0 flex-1 text-on-surface t-title-lg">{title}</h2>
      {trailing}
    </div>
  );
}

function NeedsAttention({ stats, layout, onOpen }: { stats: DashboardStats; layout: 'scroll' | 'grid' | 'list'; onOpen: (id: string, el: HTMLElement) => void }) {
  return (
    <section aria-label="Needs attention" className="flex flex-col gap-2">
      <SectionHeader title="Needs attention" trailing={stats.overdueCount > 0 ? <StatusChip text={`${stats.overdueCount} overdue`} tone="overdue" /> : null} />
      <div className={cn(layout === 'scroll' ? 'no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1' : layout === 'grid' ? 'grid grid-cols-3 gap-2' : 'flex flex-col gap-2')}>
        {stats.attention.map((a) => (
          <button
            key={a.record.id}
            type="button"
            onClick={(e) => onOpen(a.record.id, e.currentTarget)}
            className={cn('state-layer flex flex-col gap-3 rounded-xl bg-surface-container-low p-4 text-left text-on-surface', layout === 'scroll' && 'w-60 shrink-0')}
          >
            <span className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate t-plate-sm">{a.plate}</span>
              <StatusChip text={a.flag} tone={a.overdue ? 'overdue' : 'pending'} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate t-title-md">{a.vehicle}</span>
              <span className="truncate text-on-surface-variant t-body-md">
                {a.customer} · {a.total}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function TotalCell({ icon, value, label, tileClass, valueClass, onClick }: { icon: IconName; value: string; label: string; tileClass: string; valueClass?: string; onClick?: () => void }) {
  const inner = (
    <>
      <IconTile icon={icon} className={tileClass} />
      <span className="flex flex-col">
        <span className={cn('t-title-lg', valueClass ?? 'text-on-surface')}>{value}</span>
        <span className="text-on-surface-variant t-body-sm">{label}</span>
      </span>
    </>
  );
  const cls = 'flex min-h-[72px] items-center gap-3 bg-surface-container-low px-4 py-3 text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={cn('state-layer', cls)}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function WorkshopTotals({ stats, columns, onVehicles, onInventory }: { stats: DashboardStats; columns: 2 | 4; onVehicles: () => void; onInventory: () => void }) {
  const vehicles = useCountUp(stats.vehicles);
  const customers = useCountUp(stats.customers);
  const fitted = useCountUp(stats.partsFitted);
  const low = useCountUp(stats.lowStock);
  return (
    <section aria-label="Workshop totals" className={cn('grid gap-0.5 overflow-hidden rounded-xl', columns === 4 ? 'grid-cols-4' : 'grid-cols-2')}>
      <TotalCell icon="carSimple" value={String(vehicles)} label="Vehicles" tileClass="bg-surface-container-high text-on-surface-variant" onClick={onVehicles} />
      <TotalCell icon="users" value={String(customers)} label="Customers" tileClass="bg-surface-container-high text-on-surface-variant" />
      <TotalCell icon="wrench" value={String(fitted)} label="Parts fitted" tileClass="bg-surface-container-high text-on-surface-variant" />
      <TotalCell
        icon="warning"
        value={`${low} ${stats.lowStock === 1 ? 'part' : 'parts'}`}
        label="Low stock"
        tileClass="bg-warning-container text-on-warning-container"
        valueClass={stats.lowStock > 0 ? 'text-warning' : undefined}
        onClick={onInventory}
      />
    </section>
  );
}

function RecentActivity({ stats, isLoading, onOpen, onViewAll, rowHeight }: { stats: DashboardStats; isLoading: boolean; onOpen: (id: string, el: HTMLElement) => void; onViewAll: () => void; rowHeight: number }) {
  return (
    <section aria-label="Recent activity" className="flex flex-col gap-2">
      <SectionHeader title="Recent activity" trailing={<TextButton text="View all" aria-label="View all recent activity" onClick={onViewAll} className="-mr-3" />} />
      {stats.recent.length === 0 && <p className="m-0 px-2 py-4 text-on-surface-variant t-body-md">{isLoading ? 'Loading jobs…' : 'No jobs yet. Tap + to add a new intake.'}</p>}
      <div className="flex flex-col gap-0.5">
        {stats.recent.map((r, i) => (
          <button
            key={r.record.id}
            type="button"
            onClick={(e) => onOpen(r.record.id, e.currentTarget)}
            className="state-layer flex w-full items-center gap-4 bg-surface-container-low px-4 py-2 text-left text-on-surface"
            style={{ minHeight: rowHeight, borderRadius: connectedRadius(i, stats.recent.length) }}
          >
            <IconTile icon="car" iconSize={24} className="bg-surface-container-high text-on-surface-variant" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate t-title-md">{r.vehicle}</span>
              <span className="truncate text-on-surface-variant t-body-md">
                <span className="font-mono font-bold">{r.plate}</span> · {r.customer}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <StatusChip text={r.status.label} tone={r.status.tone} />
              <span className="text-on-surface-variant t-body-sm">{r.date}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
