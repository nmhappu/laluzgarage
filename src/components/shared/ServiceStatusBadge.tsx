import { cn } from '../../lib/utils';
import type { ServiceRecord } from '../../types';

export interface ServiceStatusBadgeProps {
  status: ServiceRecord['status'] | string;
  className?: string;
}

export function ServiceStatusBadge({ status, className }: ServiceStatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase() || 'pending';

  return (
    <span
      className={cn(
        "px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border inline-flex items-center justify-center select-none font-sans",
        normalizedStatus === "completed"
          ? "bg-status-success/10 text-status-success border-status-success/20"
          : normalizedStatus === "in-progress"
            ? "bg-status-pending/10 text-status-pending border-status-pending/20"
            : normalizedStatus === "cancelled"
              ? "bg-workshop-muted/10 text-workshop-muted border-workshop-border/30"
              : "bg-status-urgent/10 text-status-urgent border-status-urgent/20",
        className
      )}
    >
      {status}
    </span>
  );
}
