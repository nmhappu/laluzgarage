import { useMemo, useId } from 'react';
import { ClipboardList, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { generateSparkline, type StatTrendItem } from './sparkline';

export interface TotalServicesCardProps {
  totalServices: number;
  completedCount?: number;
  pendingCount?: number;
  issuesAttended?: number;
  trend?: StatTrendItem[];
  loading?: boolean;
  onClick?: () => void;
  variants?: Variants;
}

export function TotalServicesCard({
  totalServices,
  trend = [],
  loading = false,
  onClick,
  variants,
}: TotalServicesCardProps) {
  const gradientId = useId();

  const { linePath, areaPath } = useMemo(() => {
    if (!trend || trend.length === 0) return { linePath: '', areaPath: '' };
    const values = trend.map((t) => t.value);
    return generateSparkline(values, 180, 48, 6, { smooth: true });
  }, [trend]);

  const recentPeriodTotal = useMemo(() => {
    if (!trend || trend.length === 0) return 0;
    return trend.reduce((sum, item) => sum + item.value, 0);
  }, [trend]);

  return (
    <motion.div
      variants={variants}
      onClick={!loading ? onClick : undefined}
      className="col-span-2 group relative overflow-hidden rounded-2xl border border-workshop-border/50 hover:border-secondary/50 bg-[#0B0D12]/90 hover:bg-[#0E121B] [html[data-theme=light]_&]:bg-white [html[data-theme=light]_&]:hover:bg-slate-50/95 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-secondary/5 cursor-pointer active:scale-[0.995] select-none p-5 sm:p-6 flex flex-col justify-between min-h-[175px] sm:min-h-[195px] accelerate-gpu will-change-transform-opacity"
    >
      {/* Top luminous accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent pointer-events-none z-10 opacity-40 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Ambient background glow */}
      <div className="absolute -right-16 -top-16 w-52 h-52 rounded-full bg-secondary/10 blur-3xl pointer-events-none group-hover:bg-secondary/15 transition-all duration-500" />

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
            {/* Header Skeleton */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-workshop-surface skeleton-element-m3 shrink-0" />
                <div className="w-24 sm:w-28 h-3.5 rounded bg-workshop-surface skeleton-element-m3" />
              </div>
              <div className="w-6 h-6 rounded-lg bg-workshop-surface skeleton-element-m3" />
            </div>

            {/* Body Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-4">
              <div className="flex items-baseline gap-2.5 sm:gap-3 flex-wrap shrink-0">
                <div className="w-28 sm:w-36 h-10 sm:h-12 rounded-xl bg-workshop-surface skeleton-element-m3" />
                <div className="w-24 sm:w-28 h-3.5 rounded bg-workshop-surface skeleton-element-m3" />
              </div>
              <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs md:max-w-sm h-11 rounded-xl bg-workshop-surface skeleton-element-m3 opacity-40 shrink-0" />
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
            {/* Card Header */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-secondary shrink-0 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-workshop-muted group-hover:text-secondary transition-colors font-google-sans truncate">
                  Total Services
                </span>
              </div>

              <div className="flex items-center justify-center p-1.5 rounded-lg bg-workshop-surface/60 border border-workshop-border/30 text-workshop-muted group-hover:text-secondary group-hover:border-secondary/30 transition-all">
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            {/* Card Body: Big Metric + Telemetry Sparkline */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-4">
              <div className="flex items-baseline gap-2.5 sm:gap-3 flex-wrap shrink-0">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-workshop-text tracking-tighter font-google-sans leading-none">
                  {totalServices}
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-workshop-muted tracking-wide font-google-sans">
                  {recentPeriodTotal > 0 ? (
                    <>
                      <span className="text-secondary font-black">+{recentPeriodTotal}</span> past {trend.length} days
                    </>
                  ) : (
                    `${trend.length || 45}-Day Telemetry`
                  )}
                </span>
              </div>

              {/* 45-Day Activity Sparkline */}
              <div className="flex flex-col items-start sm:items-end w-full sm:w-auto sm:flex-1 sm:max-w-xs md:max-w-sm shrink-0 min-w-[140px] sm:min-w-[180px]">
                <div className="relative w-full h-11 overflow-hidden pointer-events-none flex items-end">
                  {linePath ? (
                    <motion.div
                      initial={{ clipPath: 'inset(0% 100% 0% 0%)' }}
                      animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
                      transition={{
                        duration: 1.4,
                        ease: [0.16, 1, 0.3, 1],
                        delay: 0.12,
                      }}
                      className="w-full h-full"
                    >
                      <svg
                        viewBox="0 0 180 48"
                        className="w-full h-full overflow-visible"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {areaPath && (
                          <path d={areaPath} fill={`url(#${gradientId})`} />
                        )}
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth={2.5}
                          vectorEffect="non-scaling-stroke"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </motion.div>
                  ) : (
                    <div className="w-full h-0.5 bg-workshop-border/30 rounded" />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
