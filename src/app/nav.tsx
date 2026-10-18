import { motion } from 'motion/react';
import { cn } from '../core/format';
import { Icon, type IconName } from '../ui/icons';

export type TabKey = 'dashboard' | 'vehicles' | 'inventory' | 'services' | 'settings';

export interface Destination {
  key: TabKey;
  path: string;
  label: string;
  icon: IconName;
}

/** Toolbar and rail order (Destinations.kt). Settings is not a destination: the avatar opens it. */
export const DESTINATIONS: Destination[] = [
  { key: 'dashboard', path: '/', label: 'Dashboard', icon: 'grid' },
  { key: 'vehicles', path: '/vehicles', label: 'Vehicles', icon: 'carSimple' },
  { key: 'inventory', path: '/inventory', label: 'Inventory', icon: 'inventory' },
  { key: 'services', path: '/services', label: 'Services', icon: 'wrench' },
];


const EMPHASIZED = [0.2, 0, 0, 1] as const;

/**
 * M3 Expressive floating toolbar with a FAB, as drawn on the phone artboards: a 64dp full-shape
 * toolbar on surfaceContainer with a level-3 shadow, 16dp side margins, 24dp above the bottom edge.
 * The current item is a 56×48dp secondaryContainer pill. Collapsed, only the FAB stays.
 */
export function FloatingNavToolbar({
  current,
  onSelect,
  fabLabel,
  onFab,
  expanded,
}: {
  current: TabKey;
  onSelect: (d: Destination) => void;
  fabLabel: string;
  onFab: (e: React.MouseEvent<HTMLButtonElement>) => void;
  expanded: boolean;
}) {
  return (
    <nav aria-label="Main" className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <div className="flex w-full max-w-[640px] items-center justify-end gap-2">
        <motion.div
          className="pointer-events-auto flex h-16 min-w-0 flex-1 items-center justify-between overflow-hidden rounded-full bg-surface-container px-3 shadow-level3"
          initial={false}
          animate={{ opacity: expanded ? 1 : 0, scaleX: expanded ? 1 : 0.2 }}
          style={{ transformOrigin: 'right center', pointerEvents: expanded ? 'auto' : 'none' }}
          transition={{ duration: 0.35, ease: EMPHASIZED }}
          aria-hidden={!expanded}
        >
          {DESTINATIONS.map((d) => {
            const active = d.key === current;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => onSelect(d)}
                aria-label={d.label}
                aria-current={active ? 'page' : undefined}
                title={d.label}
                tabIndex={expanded ? 0 : -1}
                className={cn(
                  'state-layer flex h-12 items-center justify-center rounded-full transition-[width,background-color] duration-200 ease-emphasized',
                  active ? 'w-14 bg-secondary-container text-on-secondary-container' : 'w-12 text-on-surface-variant'
                )}
              >
                <Icon name={d.icon} />
              </button>
            );
          })}
        </motion.div>
        <button
          type="button"
          onClick={onFab}
          aria-label={fabLabel}
          title={fabLabel}
          data-fab
          className="state-layer pointer-events-auto flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary shadow-level3"
        >
          <Icon name="plus" />
        </button>
      </div>
    </nav>
  );
}

/**
 * Navigation rail from the tablet spec: collapsed (96px, 80×64 targets with a 56×32 pill and a
 * label below) or expanded (220px, 56px rows with the label beside the icon, extended FAB).
 * surfaceContainerLow, 24px top and bottom padding. Active: secondaryContainer.
 */
export function NavRail({
  current,
  onSelect,
  expanded,
  onToggle,
  fabLabel,
  onFab,
}: {
  current: TabKey;
  onSelect: (d: Destination) => void;
  expanded: boolean;
  onToggle: () => void;
  fabLabel: string;
  onFab: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const items = DESTINATIONS;
  return (
    <nav
      aria-label="Main"
      className={cn('flex h-full shrink-0 flex-col overflow-hidden bg-surface-container-low py-6 transition-[width] duration-250 ease-emphasized', expanded ? 'w-[220px] items-stretch gap-1 px-3' : 'w-24 items-center gap-3')}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse navigation rail' : 'Expand navigation rail'}
        title={expanded ? 'Collapse navigation rail' : 'Expand navigation rail'}
        className={cn('state-layer flex size-12 shrink-0 items-center justify-center rounded-full text-on-surface', expanded ? 'mb-2 ml-1 self-start' : 'mb-2')}
      >
        <Icon name={expanded ? 'menuOpen' : 'menu'} />
      </button>
      <button
        type="button"
        onClick={onFab}
        aria-label={expanded ? undefined : fabLabel}
        title={fabLabel}
        data-fab
        className={cn(
          'state-layer flex h-14 shrink-0 items-center rounded-lg bg-primary text-on-primary shadow-level3',
          expanded ? 'mb-4 gap-3 self-start pr-5 pl-4' : 'mb-5 w-14 justify-center'
        )}
      >
        <Icon name="plus" />
        {expanded && <span className="t-label-strong">{fabLabel}</span>}
      </button>
      {items.map((d) => {
        const active = d.key === current;
        if (expanded) {
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onSelect(d)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'state-layer flex h-14 w-full items-center gap-3 rounded-full px-4 text-left t-label-lg transition-colors duration-150',
                active ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'
              )}
            >
              <Icon name={d.icon} />
              {d.label}
            </button>
          );
        }
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onSelect(d)}
            aria-current={active ? 'page' : undefined}
            className={cn('group flex min-h-16 w-20 flex-col items-center gap-1', active ? 'text-on-surface' : 'text-on-surface-variant')}
          >
            <span
              className={cn(
                'state-layer flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150',
                active ? 'bg-secondary-container text-on-secondary-container' : ''
              )}
            >
              <Icon name={d.icon} />
            </span>
            <span className="t-label-md">{d.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
