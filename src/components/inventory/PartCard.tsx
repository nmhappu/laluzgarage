import { memo } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { Part } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';

export interface PartCardProps {
  part: Part;
  onClick: () => void;
}

export const PartCard = memo(function PartCard({ part, onClick }: PartCardProps) {
  const isLowStock = part.stockQuantity <= (part.minStockLevel ?? 5);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12, scale: 0.98 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.3,
            ease: [0.2, 0, 0, 1.0],
          },
        },
      }}
      exit={{
        opacity: 0,
        scale: 0.98,
        y: 8,
        transition: { duration: 0.2, ease: [0.2, 0, 0, 1.0] },
      }}
      className="flex items-center justify-between px-4 md:px-8 lg:px-10 py-5 md:py-6 hover:bg-workshop-surface transition-colors cursor-pointer group accelerate-gpu will-change-transform-opacity"
      onClick={onClick}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-[15px] font-bold text-workshop-text tracking-tight uppercase group-hover:text-workshop-accent transition-colors flex items-center gap-2">
            {part.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-workshop-muted font-bold uppercase tracking-widest opacity-60">
              {part.category || 'General'}
            </span>

            {isLowStock && (
              <span className="flex items-center gap-1 text-[8px] bg-status-urgent/10 text-status-urgent px-1.5 py-0.5 rounded border border-status-urgent/20 animate-pulse">
                <AlertCircle className="w-2 h-2" />
                LOW STOCK
              </span>
            )}

            {part.location && (
              <>
                <span className="w-1 h-1 bg-workshop-border rounded-full" />
                <span className="text-[10px] text-secondary font-bold uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {part.location}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end text-right">
        <p className="text-[15px] md:text-lg font-black text-workshop-text tracking-tight tabular-nums">
          {formatCurrency(part.price)}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={cn(
              'text-[10px] md:text-sm font-black tabular-nums',
              isLowStock ? 'text-status-urgent' : 'text-status-success'
            )}
          >
            Stock: {part.stockQuantity}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
