import { cn } from '../../lib/utils';
import type { ServiceRecord } from '../../types';
import { getServiceStatusDetail } from '../../lib/constants';

export interface ServiceStatusBadgeProps {
  status: ServiceRecord['status'] | string;
  className?: string;
  showDot?: boolean;
}

export function ServiceStatusBadge({
  status,
  className,
  showDot = true,
}: ServiceStatusBadgeProps) {
  const detail = getServiceStatusDetail(status);

  return (
    <span
      className={cn(
        "text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5 select-none font-sans",
        detail.textColor,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            detail.dotColor,
            detail.dotShadow
          )}
        />
      )}
      <span>{status}</span>
    </span>
  );
}
