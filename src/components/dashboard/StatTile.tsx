import { useMemo } from 'react';
import { type LucideIcon } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
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

function generateSparklinePath(data: number[], width = 100, height = 36, padding = 4): string {
  if (!data || data.length === 0) return '';
  if (data.length === 1) return `M 0,${height / 2} L ${width},${height / 2}`;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const usableHeight = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return [x, y];
  });

  let path = `M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return path;
}

export function StatTile({
  label,
  value,
  icon: Icon,
  color,
  trend = [],
  onClick,
  variants,
}: StatTileProps) {
  const sparklinePath = useMemo(() => {
    if (!trend || trend.length === 0) return '';
    const values = trend.map((t) => t.value);
    return generateSparklinePath(values);
  }, [trend]);

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
        className="relative w-24 md:w-32 lg:w-40 h-10 min-w-[96px] overflow-hidden opacity-50 group-hover:opacity-100 transition-opacity shrink-0 pointer-events-none flex items-center"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
        }}
      >
        {sparklinePath && (
          <svg
            viewBox="0 0 100 36"
            className="w-full h-8 overflow-visible"
            preserveAspectRatio="none"
          >
            <path
              d={sparklinePath}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={color}
            />
          </svg>
        )}
      </div>
    </motion.div>
  );
}
