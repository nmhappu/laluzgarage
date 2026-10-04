import { useMemo, useId } from 'react';
import { Clock } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { generateSparkline, type StatTrendItem } from './sparkline';

export interface PendingJobsCardProps {
  pendingCount: number;
  trend?: StatTrendItem[];
  loading?: boolean;
  onClick?: () => void;
  variants?: Variants;
}

export function PendingJobsCard({
  pendingCount,
  trend = [],
  loading = false,
  onClick,
  variants,
}: PendingJobsCardProps) {
  const gradientId = useId();

  const { linePath, areaPath } = useMemo(() => {
    if (!trend || trend.length === 0) return { linePath: '', areaPath: '' };
    const values = trend.map((t) => t.value);
    return generateSparkline(values, 100, 32, 4, { smooth: true });
  }, [trend]);

  return (
    <motion.div
      variants={variants}
      onClick={!loading ? onClick : undefined}
      className="col-span-1 group relative overflow-hidden rounded-2xl border border-workshop-border/50 hover:border-status-urgent/50 bg-[#0B0D12]/90 hover:bg-[#120E12] [html[data-theme=light]_&]:bg-white [html[data-theme=light]_&]:hover:bg-rose-50/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-status-urgent/5 cursor-pointer active:scale-[0.99] select-none p-4 sm:p-5 flex flex-col justify-between aspect-square sm:aspect-auto sm:min-h-[195px] accelerate-gpu will-change-transform-opacity"
    >
      {/* Top luminous accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[2px] bg-gradient-to-r from-transparent via-status-urgent to-transparent pointer-events-none z-10 opacity-40 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Ambient background glow */}
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-status-urgent/10 blur-3xl pointer-events-none group-hover:bg-status-urgent/15 transition-all duration-500" />

      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col justify-between h-full w-full"
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-workshop-surface skeleton-element-m3 shrink-0" />
              <div className="w-20 sm:w-24 h-3 rounded-md bg-workshop-surface skeleton-element-m3" />
            </div>

            <div className="my-auto py-2">
              <div className="w-16 sm:w-20 h-8 sm:h-10 rounded-xl bg-workshop-surface skeleton-element-m3" />
            </div>

            <div className="pt-2 border-t border-workshop-border/20">
              <div className="w-full h-8 sm:h-9 rounded-lg bg-workshop-surface skeleton-element-m3 opacity-40" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col justify-between h-full w-full"
          >
            {/* Card Header: Icon + Title */}
            <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-status-urgent shrink-0 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-workshop-muted group-hover:text-status-urgent transition-colors font-google-sans truncate">
                Pending Jobs
              </span>
            </div>

            {/* Card Body */}
            <div className="relative z-10 my-auto py-2">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-status-urgent tracking-tighter font-google-sans leading-none">
                {pendingCount}
              </div>
            </div>

            {/* Card Footer: Full-Width Sparkline Graph */}
            <div className="relative z-10 pt-2 border-t border-workshop-border/20">
              <div className="w-full h-8 sm:h-9 overflow-hidden pointer-events-none">
                {linePath ? (
                  <motion.div
                    initial={{ clipPath: 'inset(0% 100% 0% 0%)' }}
                    animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
                    transition={{
                      duration: 1.4,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.22,
                    }}
                    className="w-full h-full"
                  >
                    <svg
                      viewBox="0 0 100 32"
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#F43F5E"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                ) : (
                  <div className="w-full h-0.5 bg-workshop-border/30 rounded mt-4" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
