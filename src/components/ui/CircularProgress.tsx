import React, { useEffect, useRef } from 'react';
import '@material/web/progress/circular-progress.js';

export interface CircularProgressProps extends React.HTMLAttributes<HTMLElement> {
  indeterminate?: boolean;
  value?: number;
  max?: number;
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Type-safe React wrapper around Google Material Design 3 Web Circular Progress.
 */
export function CircularProgress({
  indeterminate = true,
  value,
  max,
  size,
  color,
  strokeWidth,
  style,
  className,
  ...rest
}: CircularProgressProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (indeterminate) {
      el.setAttribute('indeterminate', '');
    } else {
      el.removeAttribute('indeterminate');
      if (value !== undefined) el.setAttribute('value', String(value));
      if (max !== undefined) el.setAttribute('max', String(max));
    }
  }, [indeterminate, value, max]);

  const customStyle: React.CSSProperties = {
    ...style,
    ...(size ? { '--md-circular-progress-size': typeof size === 'number' ? `${size}px` : size } : {}),
    ...(color ? { '--md-circular-progress-active-indicator-color': color } : {}),
    ...(strokeWidth ? { '--md-circular-progress-active-indicator-width': typeof strokeWidth === 'number' ? `${strokeWidth}px` : strokeWidth } : {}),
  } as React.CSSProperties;

  return React.createElement('md-circular-progress', {
    ref,
    class: className,
    style: customStyle,
    ...rest,
  });
}
