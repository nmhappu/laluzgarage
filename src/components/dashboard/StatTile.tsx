import { type LucideIcon } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils';

export interface StatTrendItem {
  date: string;
  value: number;
}

export interface StatTileProps {
  key?: string | number;
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  trend?: StatTrendItem[];
  isMounted?: boolean;
  onClick?: () => void;
  variants?: Variants;
}

export function StatTile({
  label,
  value,
  icon: Icon,
  color,
  trend = [],
  isMounted = true,
  onClick,
  variants,
}: StatTileProps) {
  return (
    <motion.div
      variants={variants}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-4 md:px-8 lg:px-10 py-6 md:py-8 hover:bg-workshop-surface transition-colors group border-b border-workshop-border/30 accelerate-gpu will-change-transform-opacity",
        onClick && "cursor-pointer active:scale-[0.99] select-none"
      )}
    >
      <div className="flex-1 flex items-center gap-4">
        <div className={cn("w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-110", color)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-workshop-text mb-1 font-google-sans">
            {label}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-workshop-text tracking-tighter font-google-sans">
              {value}
            </span>
          </div>
        </div>
      </div>

      <div
        className="relative w-24 md:w-32 lg:w-40 h-10 min-w-[96px] overflow-hidden opacity-50 group-hover:opacity-100 transition-opacity shrink-0 pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
        }}
      >
        {isMounted && trend.length > 0 && (
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={trend}>
              <Area
                type="monotone"
                dataKey="value"
                stroke="currentColor"
                strokeWidth={2}
                fill="transparent"
                className={color}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
