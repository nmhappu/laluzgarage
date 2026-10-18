import { useId, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { cn } from '../core/format';
import type { ChipTone } from '../core/jobs';
import { Icon, type IconName } from './icons';

// ---------------------------------------------------------------------------
// Status chip (LaluzComponents.kt)
// ---------------------------------------------------------------------------

/** Status maps to a container / on-container role pair, never a raw hue. */
export const CHIP_TONE_CLASS: Record<ChipTone, string> = {
  pending: 'bg-warning-container text-on-warning-container',
  'in-progress': 'bg-tertiary-container text-on-tertiary-container',
  completed: 'bg-primary-container text-on-primary-container',
  overdue: 'bg-error-container text-on-error-container',
  delivered: 'bg-primary text-on-primary',
  neutral: 'bg-surface-container-highest text-on-surface',
};

/** 24dp status chip: 8dp padding, Small shape, labelMedium. */
export function StatusChip({ text, tone, className }: { text: string; tone: ChipTone; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-sm px-2 t-label-md', CHIP_TONE_CLASS[tone], className)}>{text}</span>
  );
}

/** Security PIN badge: secondaryContainer chip with the mono digits split 3/3, read digit by digit. */
export function PinBadge({ pin }: { pin: string }) {
  const shown = pin.length === 6 ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin;
  return (
    <span
      role="img"
      aria-label={`PIN ${pin.split('').join(' ')}`}
      className="mt-0.5 inline-flex h-7 w-fit items-center self-start rounded-sm bg-secondary-container px-2 text-on-secondary-container t-pin"
    >
      {shown}
    </span>
  );
}

/** A dt/dd pair: 12px label over a 16px semibold value. */
export function DetailField({
  label,
  value,
  valueClassName,
  children,
  className,
  truncate = false,
}: {
  label: string;
  value?: string;
  valueClassName?: string;
  children?: ReactNode;
  className?: string;
  truncate?: boolean;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <span className="text-on-surface-variant t-body-sm">{label}</span>
      {children ?? <span className={cn('text-on-surface t-title-md', truncate && 'truncate', valueClassName)}>{value}</span>}
    </div>
  );
}

/** Two equal columns with 16dp gaps (dl with grid-template-columns: 1fr 1fr). */
export function DetailRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-4', className)}>{children}</div>;
}

/** Card section on surfaceContainerLow: 20dp radius and padding, 14px bold heading in onSurfaceVariant. */
export function SectionCard({
  title,
  trailing,
  children,
  className,
  padding = 'p-5',
  gap = 'gap-4',
}: {
  title?: string | null;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: string;
  gap?: string;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={title ? headingId : undefined} className={cn('flex w-full flex-col rounded-xl bg-surface-container-low', padding, gap, className)}>
      {title && (
        <div className="flex items-center">
          <h2 id={headingId} className="m-0 flex-1 text-on-surface-variant t-title-sm">
            {title}
          </h2>
          {trailing}
        </div>
      )}
      {children}
    </section>
  );
}

/** 40dp tonal icon tile, 12dp shape, 20dp icon. */
export function IconTile({ icon, className, iconSize = 20, style }: { icon: IconName; className?: string; iconSize?: number; style?: CSSProperties }) {
  return (
    <span aria-hidden="true" className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', className)} style={style}>
      <Icon name={icon} size={iconSize} />
    </span>
  );
}

/**
 * Contact row for the customer / owner: caption, name and number on the left, round 48dp Call and
 * WhatsApp links on the right (disabled without a number).
 */
export function ContactRow({ label, name, phone, callHref, whatsAppHref }: { label: string; name: string; phone: string; callHref: string | null; whatsAppHref: string | null }) {
  const link = (href: string | null, aria: string, cls: string, children: ReactNode) =>
    href ? (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" aria-label={aria} title={aria} className={cn('state-layer flex size-12 shrink-0 items-center justify-center rounded-full', cls)}>
        {children}
      </a>
    ) : (
      <span role="img" aria-label={`${aria} (no number)`} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-on-surface/12 text-on-surface/38">
        {children}
      </span>
    );
  return (
    <div className="flex w-full items-center gap-3 py-3 pr-3 pl-5">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-on-surface-variant t-body-sm">{label}</span>
        <span className="truncate text-on-surface t-title-md">{name}</span>
        {phone && <span className="text-on-surface-variant t-body-md">{phone}</span>}
      </div>
      {link(callHref, `Call ${name}`, 'bg-surface-container-highest text-on-surface', <Icon name="phone" size={20} />)}
      {link(whatsAppHref, `WhatsApp ${name}`, 'bg-whatsapp text-on-whatsapp', <Icon name="whatsApp" size={22} />)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cookie shape
// ---------------------------------------------------------------------------

/** M3 Expressive "cookie" from the artboards (48-unit grid, includes its own inset). */
export const COOKIE_PATH =
  'M24.0 3.1 L25.4 3.4 L26.6 4.0 L27.8 4.9 L28.9 5.8 L29.9 6.7 L30.9 7.2 L32.1 7.6 L33.4 7.7 L34.8 7.8 L36.3 8.0 L37.6 8.5 L38.8 9.2 L39.5 10.4 L40.0 11.7 L40.2 13.2 L40.3 14.6 L40.4 15.9 L40.8 17.1 L41.3 18.1 L42.2 19.1 L43.1 20.2 L44.0 21.4 L44.6 22.6 L44.9 24.0 L44.6 25.4 L44.0 26.6 L43.1 27.8 L42.2 28.9 L41.3 29.9 L40.8 30.9 L40.4 32.1 L40.3 33.4 L40.2 34.8 L40.0 36.3 L39.5 37.6 L38.8 38.8 L37.6 39.5 L36.3 40.0 L34.8 40.2 L33.4 40.3 L32.1 40.4 L30.9 40.8 L29.9 41.3 L28.9 42.2 L27.8 43.1 L26.6 44.0 L25.4 44.6 L24.0 44.9 L22.6 44.6 L21.4 44.0 L20.2 43.1 L19.1 42.2 L18.1 41.3 L17.1 40.8 L15.9 40.4 L14.6 40.3 L13.2 40.2 L11.7 40.0 L10.4 39.5 L9.2 38.8 L8.5 37.6 L8.0 36.3 L7.8 34.8 L7.7 33.4 L7.6 32.1 L7.2 30.9 L6.7 29.9 L5.8 28.9 L4.9 27.8 L4.0 26.6 L3.4 25.4 L3.1 24.0 L3.4 22.6 L4.0 21.4 L4.9 20.2 L5.8 19.1 L6.7 18.1 L7.2 17.1 L7.6 15.9 L7.7 14.6 L7.8 13.2 L8.0 11.7 L8.5 10.4 L9.2 9.2 L10.4 8.5 L11.7 8.0 L13.2 7.8 L14.6 7.7 L15.9 7.6 L17.1 7.2 L18.1 6.7 L19.1 5.8 L20.2 4.9 L21.4 4.0 L22.6 3.4 Z';

/**
 * A cookie in [containerClass] (a text-colour class: the shape fills with currentColor) behind an
 * upright icon at 40% of [size] (or [iconSize]). [spin] turns it once per 20s.
 */
export function CookieBadge({
  icon,
  size = 120,
  iconSize,
  containerClass,
  contentClass,
  spin = true,
  className,
}: {
  icon: IconName;
  size?: number;
  iconSize?: number;
  containerClass: string;
  contentClass: string;
  spin?: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={cn('relative flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={cn('absolute inset-0', containerClass)}
        style={spin ? { animation: 'lz-spin 20s linear infinite' } : undefined}
      >
        <path d={COOKIE_PATH} fill="currentColor" style={{ transition: 'fill 150ms linear' }} />
      </svg>
      <span className={cn('relative', contentClass)}>
        <Icon name={icon} size={iconSize ?? Math.round(size * 0.4)} />
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Connected segmented selector (M3 Expressive button group)
// ---------------------------------------------------------------------------

export interface SegmentStyle {
  selected: string;
  idle: string;
}

/**
 * Connected button group: full outer ends, 8dp inner corners, 2dp gaps. The checked segment
 * morphs to a full pill (250ms emphasized). Single-select radio group.
 */
export function ConnectedSegments<T extends string>({
  options,
  selected,
  onSelect,
  label,
  style,
  ariaLabel,
  height = 40,
  fill = false,
  className,
  textClass = 't-label-strong',
}: {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  label: (value: T) => string;
  style: (value: T) => SegmentStyle;
  ariaLabel: string;
  height?: number;
  fill?: boolean;
  className?: string;
  textClass?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('flex gap-0.5', className)}>
      {options.map((o, i) => {
        const on = o === selected;
        const first = i === 0;
        const last = i === options.length - 1;
        const full = 999;
        const radius = on ? `${full}px` : `${first ? full : 8}px ${last ? full : 8}px ${last ? full : 8}px ${first ? full : 8}px`;
        const s = style(o);
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(o)}
            className={cn('state-layer flex items-center justify-center whitespace-nowrap', fill ? 'flex-1 px-0' : 'min-w-12 px-3', textClass, on ? s.selected : s.idle)}
            style={{
              height,
              borderRadius: radius,
              transition: 'border-radius 250ms cubic-bezier(0.2, 0, 0, 1), background-color 150ms linear, color 150ms linear',
            }}
          >
            {label(o)}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className} style={{ animation: 'lz-spin 1s linear infinite' }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="42 100" />
    </svg>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const DISABLED = 'disabled:bg-on-surface/12 disabled:text-on-surface/38';

/** Full-width 48dp tonal pill on surfaceContainerHigh with a left-aligned label (Login, Sign out). */
export function TonalRowButton({ text, leading, loading, className, disabled, ...rest }: ButtonProps & { text: string; leading?: ReactNode; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn('state-layer flex h-12 w-full items-center gap-3 rounded-full bg-surface-container-high px-4 text-left text-on-surface', DISABLED, className)}
    >
      {leading}
      <span className="flex-1 t-label-lg">{text}</span>
      {loading && <Spinner />}
    </button>
  );
}

/** Centred 48dp pill with an optional 20dp leading icon; 14px bold label. Colours come from [className]. */
export function PillButton({ text, icon, loading, className, disabled, ...rest }: ButtonProps & { text: string; icon?: IconName; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn('state-layer inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 t-label-strong', DISABLED, className)}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {icon && <Icon name={icon} size={20} />}
          {text}
        </>
      )}
    </button>
  );
}

/** 48dp outlined pill: 1dp border ([borderClass], outline by default), primary label by default. */
export function OutlinedPillButton({ text, className, borderClass = 'border-outline', ...rest }: ButtonProps & { text: string; borderClass?: string }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'state-layer inline-flex h-12 items-center justify-center rounded-full border px-6 t-label-strong disabled:border-on-surface/12 disabled:text-on-surface/38',
        borderClass,
        className ?? 'text-primary'
      )}
    >
      {text}
    </button>
  );
}

/** 48dp-tall text button in primary (View all, Edit, sort). */
export function TextButton({ text, icon, className, textClass = 't-label-lg', ...rest }: ButtonProps & { text: string; icon?: IconName; textClass?: string }) {
  return (
    <button type="button" {...rest} className={cn('state-layer inline-flex h-12 items-center gap-2 rounded-full px-3 text-primary', textClass, className)}>
      {icon && <Icon name={icon} size={18} />}
      {text}
    </button>
  );
}

/** 48dp round icon button. [label] is its accessible name and tooltip. */
export function IconButton({ icon, label, className, iconSize = 24, ...rest }: ButtonProps & { icon: IconName; label: string; iconSize?: number }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={cn('state-layer flex size-12 shrink-0 items-center justify-center rounded-full disabled:text-on-surface/38', className)}>
      <Icon name={icon} size={iconSize} />
    </button>
  );
}

/** 48dp text button in a dialog's action row. */
export function DialogTextButton({ text, className, ...rest }: ButtonProps & { text: string }) {
  return (
    <button type="button" {...rest} className={cn('state-layer h-12 rounded-full px-4 t-label-strong', className)}>
      {text}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Filter chips (LaluzScreenParts.kt)
// ---------------------------------------------------------------------------

export type FilterChipTone = 'secondary' | 'error' | 'warning' | 'pending' | 'in-progress' | 'completed';

const FILTER_SELECTED: Record<FilterChipTone, string> = {
  secondary: 'bg-secondary-container text-on-secondary-container border-secondary-container',
  error: 'bg-error-container text-on-error-container border-error-container',
  warning: 'bg-warning/16 text-warning border-warning',
  pending: 'bg-warning-container text-on-warning-container border-warning-container',
  'in-progress': 'bg-tertiary-container text-on-tertiary-container border-tertiary-container',
  completed: 'bg-primary-container text-on-primary-container border-primary-container',
};

/**
 * Filter chip: 40dp, full shape, 14/20 label. Selected = tone container with an 18dp check and 12dp
 * leading padding; unselected = 1dp outline on transparent. Optional count at 80% opacity.
 */
export function FilterChip({
  label,
  selected,
  onClick,
  count,
  tone = 'secondary',
  className,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  count?: number;
  tone?: FilterChipTone;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'state-layer inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border pr-4 t-label-lg',
        selected ? cn('pl-3', FILTER_SELECTED[tone]) : 'border-outline bg-transparent pl-4 text-on-surface-variant',
        className
      )}
    >
      {selected && <Icon name="checkBold" size={18} />}
      {label}
      {count !== undefined && <span className="opacity-80 t-label-tiny">{count}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Connected list rows
// ---------------------------------------------------------------------------

/** Connected list group: 20dp outer corners, 4dp inner corners, 2dp gaps between rows. */
export function connectedRadius(index: number, count: number): string {
  if (count <= 1) return '20px';
  if (index === 0) return '20px 20px 4px 4px';
  if (index === count - 1) return '4px 4px 20px 20px';
  return '4px';
}

// ---------------------------------------------------------------------------
// Wavy divider and day rule
// ---------------------------------------------------------------------------

/** The artboard's squiggle divider: 20 quadratic half-waves, 12dp tall, 1.5dp round stroke. */
export function WavyDivider({ className }: { className?: string }) {
  let d = 'M0 6';
  for (let i = 0; i < 20; i++) d += ` Q${i * 10 + 5} ${i % 2 === 0 ? 0 : 12} ${i * 10 + 10} 6`;
  return (
    <svg aria-hidden="true" viewBox="0 0 200 12" preserveAspectRatio="none" className={cn('block h-3 w-full', className)}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('h-px w-full bg-outline-variant', className)} />;
}

// ---------------------------------------------------------------------------
// Pinned bottom action bar
// ---------------------------------------------------------------------------

/** Pinned bar on surfaceContainer: 12dp top, 16dp sides, 20dp bottom, 8dp between rows. */
export function BottomActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('w-full shrink-0 bg-surface-container', className)} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-2 px-4 pt-3 pb-5">{children}</div>
    </div>
  );
}

/** Delete / Edit pair used by the vehicle and part detail screens. */
export function DeleteEditBar({ deleteLabel, editLabel, onDelete, onEdit }: { deleteLabel: string; editLabel: string; onDelete: () => void; onEdit: () => void }) {
  return (
    <BottomActionBar>
      <div className="flex gap-2">
        <OutlinedPillButton text={deleteLabel} onClick={onDelete} className="flex-1 text-error" borderClass="border-error" />
        <PillButton text={editLabel} onClick={onEdit} className="flex-1 bg-primary text-on-primary" />
      </div>
    </BottomActionBar>
  );
}
