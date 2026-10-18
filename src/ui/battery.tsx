import { useId } from 'react';
import { cn } from '../core/format';

/** Battery level is recorded in 5% steps; null ("~") means it wasn't checked (BatteryUi.kt). */
const STOPS = 21; // slider positions 0..21: 0 = "~", 1..21 = 0%..100% in 5% steps

const stopOf = (percent: number | null) => (percent === null ? 0 : Math.round(percent / 5) + 1);
const percentOf = (stop: number) => (stop <= 0 ? null : (stop - 1) * 5);

/** Error at 20% or less, warning at 50% or less, otherwise primary; "~" stays neutral. */
export function batteryColorClass(percent: number | null): string {
  if (percent === null) return 'text-on-surface-variant';
  if (percent <= 20) return 'text-error';
  if (percent <= 50) return 'text-warning';
  return 'text-primary';
}

export const batteryLabel = (percent: number | null) => (percent === null ? '~' : `${percent}%`);
const batterySpoken = (percent: number | null) => (percent === null ? 'Battery not recorded' : `Battery ${percent} percent`);

/** Outlined battery with the charge drawn as a fill; 24 unit design box. */
export function BatteryGlyph({ percent, size }: { percent: number | null; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
      <rect x="3" y="7" width="16" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="22" y1="11" x2="22" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {percent !== null && percent > 0 && <rect x="5" y="9" width={12 * (percent / 100)} height="6" rx="1" fill="currentColor" />}
    </svg>
  );
}

/** 24dp badge for job cards and the job header: glyph plus "60%" or "~". */
export function BatteryBadge({ percent, className }: { percent: number | null; className?: string }) {
  return (
    <span role="img" aria-label={batterySpoken(percent)} className={cn('inline-flex h-6 items-center gap-1 rounded-sm bg-surface-container-high px-2 t-label-md', batteryColorClass(percent), className)}>
      <BatteryGlyph percent={percent} size={16} />
      {batteryLabel(percent)}
    </span>
  );
}

/**
 * Battery level field: label with a live value chip, a slim discrete slider (~, 0, 5 … 100) with a
 * 2dp gap around the 4dp handle and a cut mark after "~", then scale labels.
 */
export function BatteryField({ percent, onChange }: { percent: number | null; onChange: (p: number | null) => void }) {
  const id = useId();
  const stop = stopOf(percent);
  const color = batteryColorClass(percent);
  const at = (s: number) => `calc(2px + (100% - 4px) * ${s / STOPS})`;
  const handle = at(stop);
  const cut = at(1);
  // Clear gaps in the track: 2dp either side of the 4dp handle, and a 2dp cut between "~" and 0.
  const gaps: [string, string][] = [[`calc(${handle} - 4px)`, `calc(${handle} + 4px)`]];
  if (stop !== 1) gaps.push([`calc(${cut} - 1px)`, `calc(${cut} + 1px)`]);
  if (stop > 1) gaps.reverse();
  const mask =
    'linear-gradient(to right, ' +
    gaps.map(([a, b]) => `#000 ${a}, transparent ${a}, transparent ${b}, #000 ${b}`).join(', ') +
    ')';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center">
        <label htmlFor={id} className="flex-1 text-on-surface-variant t-title-sm">
          Battery level
        </label>
        <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-sm bg-surface-container-high px-2.5 t-title-sm', color)} aria-hidden="true">
          <BatteryGlyph percent={percent} size={20} />
          {batteryLabel(percent)}
        </span>
      </div>
      <div className={cn('relative h-11', color)}>
        {/* Track: inactive bar, hatched "~" zone, active fill, gaps around the handle and the cut mark. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-4 -translate-y-1/2">
          <div className="absolute inset-0 overflow-hidden rounded-full bg-secondary-container" style={{ WebkitMaskImage: mask, maskImage: mask }}>
            {stop === 0 && (
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: cut, backgroundImage: 'repeating-linear-gradient(-45deg, color-mix(in srgb, var(--color-outline) 50%, transparent) 0 1px, transparent 1px 4px)' }}
              />
            )}
            {stop > 0 && <div className="absolute inset-y-0 left-0 bg-current" style={{ width: handle }} />}
          </div>
        </div>
        <div aria-hidden="true" className="absolute top-0 h-11 w-1 -translate-x-1/2 rounded-[2px] bg-primary" style={{ left: handle }} />
        <input
          id={id}
          type="range"
          min={0}
          max={STOPS}
          step={1}
          value={stop}
          aria-valuetext={percent === null ? 'Not recorded' : `${percent} percent`}
          onChange={(e) => onChange(percentOf(Number(e.target.value)))}
          className="absolute inset-0 h-11 w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="relative h-4 text-on-surface-variant t-body-sm" aria-hidden="true">
        <span className="absolute left-0">~</span>
        <span className="absolute w-6 -translate-x-1/2 text-center" style={{ left: at(1) }}>
          0
        </span>
        <span className="absolute w-6 -translate-x-1/2 text-center" style={{ left: at(11) }}>
          50
        </span>
        <span className="absolute right-0">100</span>
      </div>
    </div>
  );
}
