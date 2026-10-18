import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn, highResPhotoUrl, initialsOf } from '../core/format';
import { SYNC_LABEL, type SyncState } from '../data/store';
import { Spinner } from './components';
import { Icon } from './icons';

/** Phone-first layouts are capped at this width and centred on wide windows. */
export const MAX_CONTENT_WIDTH = 640;

/** The account photo over the initials; draws nothing until it loads (or if it fails). */
export function ProfilePhoto({ url }: { url: string | null | undefined }) {
  const src = highResPhotoUrl(url);
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(false), [src]);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onLoad={() => setOk(true)}
      onError={() => setOk(false)}
      className="absolute inset-0 size-full rounded-full object-cover transition-opacity duration-200"
      style={{ opacity: ok ? 1 : 0 }}
    />
  );
}

export interface Account {
  name: string;
  photoUrl: string | null;
  isAdmin: boolean;
  onOpenSettings: () => void;
}

/**
 * 48dp avatar action: a 40dp avatar with a 2dp role ring (error for admins, tertiary for everyone
 * else): the account photo, or initials on tertiaryContainer. Opens Settings.
 */
export function OperatorAvatarButton({ account }: { account: Account }) {
  return (
    <button
      type="button"
      onClick={account.onOpenSettings}
      aria-label={`${account.name}: open settings`}
      title="Settings"
      className="flex size-12 shrink-0 items-center justify-center rounded-full"
    >
      <span className={cn('flex size-10 rounded-full border-2 p-[2px]', account.isAdmin ? 'border-error' : 'border-tertiary')}>
        <span className="relative flex flex-1 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container t-label-tiny">
          {initialsOf(account.name)}
          <ProfilePhoto url={account.photoUrl} />
        </span>
      </span>
    </button>
  );
}

/** Small top app bar: 64dp row (16dp start / 8dp end padding), on the surface colour. */
export function TopBar({ children, className, transparent = false, startPadding = 16 }: { children: ReactNode; className?: string; transparent?: boolean; startPadding?: number }) {
  return (
    <header
      className={cn('flex h-16 w-full shrink-0 items-center gap-2 pr-2', transparent ? 'bg-transparent' : 'bg-surface', className)}
      style={{ paddingLeft: startPadding }}
    >
      {children}
    </header>
  );
}

/** Detail top bar: 48dp back arrow, 20/28 title, optional actions. */
export function DetailTopBar({ title, backLabel, onBack, actions, transparent }: { title: string; backLabel: string | null; onBack: () => void; actions?: ReactNode; transparent?: boolean }) {
  return (
    <TopBar startPadding={backLabel ? 4 : 24} transparent={transparent}>
      {backLabel && (
        <button type="button" onClick={onBack} aria-label={backLabel} title={backLabel} className="state-layer flex size-12 items-center justify-center rounded-full text-on-surface">
          <Icon name="arrowBackShort" />
        </button>
      )}
      <h1 className="m-0 flex-1 truncate text-on-surface t-title-lg">{title}</h1>
      {actions}
    </TopBar>
  );
}

/** The line creeps toward this while a sync is running, leaving the last stretch to the real finish. */
const CREEP_CEILING = 0.92;

/**
 * Sync chrome for a top bar: a status pill centred in the bar and a progress line in a 16dp strip
 * under it (LaluzSyncTopBar). Wrap the bar's own row with this.
 */
export function SyncTopBar({ sync, children }: { sync: SyncState; children: ReactNode }) {
  const visible = sync.phase !== 'idle';
  const active = sync.phase === 'syncing' || sync.phase === 'loading';
  const [creep, setCreep] = useState(0);
  const creepRef = useRef(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      creepRef.current += (CREEP_CEILING - creepRef.current) * 0.03;
      setCreep(creepRef.current);
    }, 120);
    return () => clearInterval(t);
  }, [active]);
  useEffect(() => {
    if (sync.phase === 'idle') {
      creepRef.current = 0;
      setCreep(0);
    }
  }, [sync.phase]);
  const progress = active ? Math.max(sync.progress, creep) : sync.progress;
  const done = sync.phase === 'done';
  return (
    <div className="w-full shrink-0">
      <div className="relative">
        {children}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <AnimatePresence>
            {visible && (
              <motion.div
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                className={cn(
                  'flex h-9 items-center gap-2 rounded-full pr-4 pl-2 t-label-lg transition-colors duration-200',
                  done ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'
                )}
              >
                <span className="flex size-6 items-center justify-center">
                  {active && <Spinner size={20} />}
                  {done && <Icon name="checkBold" size={18} />}
                  {sync.phase === 'offline' && <Icon name="warning" size={16} />}
                </span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={sync.phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                    {SYNC_LABEL[sync.phase]}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex items-center overflow-hidden px-4 transition-[height] duration-300 ease-emphasized" style={{ height: visible ? 16 : 0 }} aria-hidden="true">
        <div className="relative h-1 w-full rounded-full bg-secondary-container">
          <div
            className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-500', sync.phase === 'offline' ? 'bg-outline' : 'bg-primary')}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/** Title alpha for a bar using SyncTopBar: hidden while the pill is up. */
export function syncTitleStyle(sync: SyncState) {
  return { opacity: sync.phase === 'idle' ? 1 : 0, transition: 'opacity 200ms linear' };
}

/** "Vehicles" / "Inventory" header: 36/44 title over a 14/20 summary, 24dp gutters, 16dp below. */
export function ScreenHeader({ title, summary, className }: { title: string; summary: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1 px-6 pb-4', className)}>
      <h1 className="m-0 text-on-surface t-display-sm">{title}</h1>
      <p className="m-0 text-on-surface-variant t-body-md">{summary}</p>
    </div>
  );
}
