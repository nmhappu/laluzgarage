import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../core/format';
import { Icon } from './icons';

/**
 * Text fields from the artboards (LaluzComponents.kt, IntakeScreen.kt). Rings are inset box
 * shadows so focus never shifts the layout.
 */

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>;

interface FilledFieldProps extends InputProps {
  label: string;
  value: string;
  onValue: (value: string) => void;
  isError?: boolean;
  /** Supporting text under the box (error-coloured with [isError]). */
  supporting?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Chips and the like, 12dp under the box. */
  below?: ReactNode;
  /** Multi-line: grows from [minRows] with 12dp vertical padding. */
  multiline?: boolean;
  minRows?: number;
  textClass?: string;
  onBlurField?: () => void;
  className?: string;
}

/**
 * Filled field: label above, a 56dp surfaceContainerHigh box with a 16dp radius and a 2dp primary
 * ring on focus; error switches the ring (and supporting text) to the error role.
 */
export const FilledField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FilledFieldProps>(function FilledField(
  { label, value, onValue, isError, supporting, leading, trailing, below, multiline, minRows = 4, textClass = 't-body-lg', disabled, onBlurField, className, id, placeholder, ...rest },
  ref
) {
  const auto = useId();
  const inputId = id ?? auto;
  const supportId = `${inputId}-support`;
  const ring = isError ? 'shadow-[inset_0_0_0_2px_var(--color-error)]' : 'focus-within:shadow-[inset_0_0_0_2px_var(--color-primary)]';
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className={cn('t-label-lg', isError ? 'text-error' : 'text-on-surface-variant')}>
        {label}
      </label>
      <div
        className={cn(
          'flex w-full items-center rounded-lg bg-surface-container-high px-4 transition-shadow',
          multiline ? 'items-start py-3' : 'h-14',
          leading ? 'gap-3' : 'gap-2',
          trailing && !multiline ? 'pr-1' : '',
          ring
        )}
      >
        {leading}
        {multiline ? (
          <textarea
            id={inputId}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            value={value}
            rows={minRows}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={isError || undefined}
            aria-describedby={supporting ? supportId : undefined}
            onChange={(e) => onValue(e.target.value)}
            onBlur={onBlurField}
            className={cn('w-full min-w-0 flex-1 resize-none border-0 bg-transparent p-0 outline-none placeholder:text-on-surface-variant', textClass, disabled ? 'text-on-surface/38' : 'text-on-surface')}
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
        ) : (
          <input
            id={inputId}
            ref={ref as React.Ref<HTMLInputElement>}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={isError || undefined}
            aria-describedby={supporting ? supportId : undefined}
            onChange={(e) => onValue(e.target.value)}
            onBlur={onBlurField}
            {...rest}
            className={cn('h-full w-full min-w-0 flex-1 border-0 bg-transparent p-0 outline-none placeholder:text-on-surface-variant', textClass, disabled ? 'text-on-surface/38' : 'text-on-surface')}
          />
        )}
        {trailing}
      </div>
      {supporting && (
        <div id={supportId} className={cn('px-4 t-body-sm', isError ? 'text-error' : 'text-on-surface-variant')} aria-live="polite">
          {supporting}
        </div>
      )}
      {below && <div className="pt-1.5">{below}</div>}
    </div>
  );
});

interface OutlinedFieldProps extends InputProps {
  value: string;
  onValue: (value: string) => void;
  /** Accessible name when there is no visible label. */
  label: string;
  emphasized?: boolean;
  /** Borderless: surfaceContainerHigh fill, primary ring only while focused. */
  filled?: boolean;
  isError?: boolean;
  prefix?: string;
  suffix?: string;
  multiline?: boolean;
  minRows?: number;
  textClass?: string;
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Outlined field from the job card: 12dp radius, 1dp outline at rest, 2dp primary when focused or
 * [emphasized]. Optional prefix and suffix text.
 */
export function OutlinedField({
  value,
  onValue,
  label,
  emphasized,
  filled,
  isError,
  prefix,
  suffix,
  multiline,
  minRows = 3,
  textClass = 't-body-lg',
  align = 'left',
  className,
  placeholder,
  ...rest
}: OutlinedFieldProps) {
  const ring = isError
    ? 'shadow-[inset_0_0_0_2px_var(--color-error)]'
    : filled
      ? 'bg-surface-container-high focus-within:shadow-[inset_0_0_0_2px_var(--color-primary)]'
      : emphasized
        ? 'shadow-[inset_0_0_0_2px_var(--color-primary)]'
        : 'shadow-[inset_0_0_0_1px_var(--color-outline)] focus-within:shadow-[inset_0_0_0_2px_var(--color-primary)]';
  const inputClass = cn('w-full min-w-0 flex-1 border-0 bg-transparent p-0 text-on-surface outline-none placeholder:text-on-surface-variant', textClass, align === 'right' && 'text-right');
  return (
    <div className={cn('flex w-full rounded-md px-4 transition-shadow', multiline ? 'items-start py-3' : 'h-14 items-center', prefix ? 'gap-1' : 'gap-2', ring, className)}>
      {prefix && <span className="text-on-surface-variant t-body-lg">{prefix}</span>}
      {multiline ? (
        <textarea
          aria-label={label}
          value={value}
          rows={minRows}
          placeholder={placeholder}
          onChange={(e) => onValue(e.target.value)}
          className={cn(inputClass, 'resize-none')}
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
      ) : (
        <input aria-label={label} value={value} placeholder={placeholder} onChange={(e) => onValue(e.target.value)} {...rest} className={cn(inputClass, 'h-full')} />
      )}
      {suffix && <span className="text-on-surface-variant t-body-md">{suffix}</span>}
    </div>
  );
}

/** Full-pill search field on surfaceContainerHigh with a leading 24dp search icon. 56dp, 48dp in a top bar. */
export const SearchField = forwardRef<
  HTMLInputElement,
  { value: string; onValue: (v: string) => void; placeholder: string; label: string; height?: number; className?: string; autoFocus?: boolean }
>(function SearchField({ value, onValue, placeholder, label, height = 56, className, autoFocus }, ref) {
  return (
    <div
      className={cn('flex w-full items-center gap-4 rounded-full bg-surface-container-high pl-4 focus-within:shadow-[inset_0_0_0_2px_var(--color-primary)]', value ? 'pr-1' : 'pr-4', className)}
      style={{ height }}
    >
      <Icon name="search" className="text-on-surface-variant" />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onValue(e.target.value)}
        enterKeyHint="search"
        className="h-full w-full min-w-0 flex-1 border-0 bg-transparent p-0 text-on-surface outline-none t-body-lg placeholder:text-on-surface-variant [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" aria-label="Clear search" title="Clear search" onClick={() => onValue('')} className="state-layer flex size-12 items-center justify-center rounded-full text-on-surface-variant">
          <Icon name="close" />
        </button>
      )}
    </div>
  );
});

/** Date field: label above a 56dp surfaceContainerHigh button with the date and a calendar icon. */
export function DateButton({ label, value, onClick, locked = false }: { label: string; value: string | null; onClick?: () => void; locked?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-on-surface-variant t-label-lg">{label}</span>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}, ${value ?? 'not set'}`}
        className="state-layer flex h-14 w-full items-center gap-2 rounded-lg bg-surface-container-high px-4 text-left text-on-surface"
      >
        <span className={cn('flex-1 t-body-lg', value ? 'text-on-surface' : 'text-on-surface-variant')}>{value ?? 'Select date'}</span>
        <Icon name={locked ? 'lock' : 'calendar'} className="text-on-surface-variant" />
      </button>
    </div>
  );
}
