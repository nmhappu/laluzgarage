import { cn } from '../../lib/utils';
import type { ServiceRecord } from '../../types';

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
  const normalizedStatus = status?.toLowerCase() || 'pending';

  return (
    <span
      className={cn(
        "text-xs font-black uppercase tracking-widest inline-flex items-center gap-1.5 select-none font-sans",
        normalizedStatus === "completed"
          ? "text-status-success"
          : normalizedStatus === "in-progress"
            ? "text-status-pending"
            : normalizedStatus === "cancelled"
              ? "text-workshop-muted"
              : "text-status-urgent",
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            normalizedStatus === "completed"
              ? "bg-status-success shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              : normalizedStatus === "in-progress"
                ? "bg-status-pending shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                : normalizedStatus === "cancelled"
                  ? "bg-workshop-muted"
                  : "bg-status-urgent shadow-[0_0_8px_rgba(244,63,94,0.5)]"
          )}
        />
      )}
      <span>{status}</span>
    </span>
  );
}
