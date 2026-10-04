import { useMemo, useId } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { generateSparkline, type StatTrendItem } from './sparkline';

export interface CompletedJobsCardProps {
  completedCount: number;
  totalServices?: number;
  trend?: StatTrendItem[];
  loading?: boolean;
  onClick?: () => void;
  variants?: Variants;
}

export function CompletedJobsCard({
  completedCount,
  trend = [],
  loading = false,
  onClick,
  variants,
}: CompletedJobsCardProps) {
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
      className="col-span-1 group relative overflow-hidden rounded-2xl border border-workshop-border/50 hover:border-workshop-accent/50 bg-[#0B0D12]/90 hover:bg-[#0E1513] [html[data-theme=light]_&]:bg-white [html[data-theme=light]_&]:hover:bg-emerald-50/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-workshop-accent/5 cursor-pointer active:scale-[0.99] select-none p-4 sm:p-5 flex flex-col justify-between aspect-square sm:aspect-auto sm:min-h-[195px] accelerate-gpu will-change-transform-opacity"
    >
      {/* Top luminous accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[2px] bg-gradient-to-r from-transparent via-workshop-accent to-transparent pointer-events-none z-10 opacity-40 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Ambient background glow */}
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-workshop-accent/10 blur-3xl pointer-events-none group-hover:bg-workshop-accent/15 transition-all duration-500" />

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
              <div className="w-24 sm:w-28 h-3 rounded-md bg-workshop-surface skeleton-element-m3" />
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
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-workshop-accent shrink-0 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-workshop-muted group-hover:text-workshop-accent transition-colors font-google-sans truncate">
                Completed Jobs
              </span>
            </div>

            {/* Card Body */}
            <div className="relative z-10 my-auto py-2">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-workshop-accent tracking-tighter font-google-sans leading-none">
                {completedCount}
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
                      delay: 0.32,
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
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#10B981"
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
