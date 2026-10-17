import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface MonthNavigatorProps {
  monthAnchor: Date;
  isCurrentMonth: boolean;
  onShift: (delta: number) => void;
  children?: ReactNode;
  className?: string;
  /** When false (any range other than This Month) renders only the children. */
  enabled?: boolean;
}

const SWIPE_DISTANCE = 60;

/** Prev/next month arrows; children can be swiped left/right to change month. */
export function MonthNavigator({
  monthAnchor,
  isCurrentMonth,
  onShift,
  children,
  className,
  enabled = true,
}: MonthNavigatorProps) {
  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => onShift(-1)}
          aria-label="Previous month"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-workshop-muted hover:text-workshop-text hover:bg-workshop-card/60 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="min-w-28 text-center text-xs font-bold uppercase tracking-wider text-workshop-text">
          {format(monthAnchor, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => onShift(1)}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center text-workshop-muted',
            isCurrentMonth
              ? 'opacity-30 cursor-default'
              : 'hover:text-workshop-text hover:bg-workshop-card/60 cursor-pointer'
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {children && (
        <motion.div
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          className={className}
          style={{ touchAction: 'pan-y' }}
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_DISTANCE) onShift(-1);
            else if (info.offset.x < -SWIPE_DISTANCE) onShift(1);
          }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
