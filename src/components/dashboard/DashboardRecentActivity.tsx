import { motion, AnimatePresence, type Variants } from 'motion/react';
import { Car, Clock, Package, ArrowRight, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { ServiceStatusBadge } from '../shared/ServiceStatusBadge';
import type { EnrichedActivity } from '../../hooks/useDashboard';

export interface DashboardRecentActivityProps {
  activities: EnrichedActivity[];
  onSelectActivity: (activity: EnrichedActivity) => void;
  onViewAll?: () => void;
  loading?: boolean;
  containerVariants: Variants;
  itemVariants: Variants;
}

export function DashboardRecentActivity({
  activities,
  onSelectActivity,
  onViewAll,
  loading = false,
  containerVariants,
}: DashboardRecentActivityProps) {
  return (
    <div className="space-y-4 pt-4">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <motion.h2
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg sm:text-xl font-black text-workshop-text uppercase tracking-tight font-google-sans"
          >
            Recent Activities
          </motion.h2>
          {!loading && activities.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-workshop-surface border border-workshop-border/40 text-workshop-muted font-google-sans">
              {Math.min(activities.length, 5)} Latest
            </span>
          )}
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-bold text-workshop-muted hover:text-workshop-accent uppercase tracking-wider transition-colors cursor-pointer group font-google-sans"
          >
            <span>View All Records</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Activities Container */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="rounded-2xl border border-workshop-border/50 bg-[#0B0D12]/90 [html[data-theme=light]_&]:bg-white overflow-hidden shadow-sm accelerate-gpu will-change-transform-opacity"
      >
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="divide-y divide-workshop-border/20"
            >
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 sm:px-6 py-4 gap-4 select-none">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-workshop-surface skeleton-element-m3 shrink-0" />
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="w-36 sm:w-48 h-3.5 rounded bg-workshop-surface skeleton-element-m3" />
                      <div className="w-24 sm:w-32 h-2.5 rounded bg-workshop-surface skeleton-element-m3" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="space-y-1.5 flex flex-col items-end">
                      <div className="w-20 h-5 rounded-full bg-workshop-surface skeleton-element-m3" />
                      <div className="w-12 h-2.5 rounded bg-workshop-surface skeleton-element-m3" />
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : activities.length > 0 ? (
            <motion.div
              key="activities"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="divide-y divide-workshop-border/20"
            >
              {activities.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  onClick={() => onSelectActivity(job)}
                  className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-workshop-surface/60 transition-colors group cursor-pointer active:scale-[0.998] select-none gap-4"
                >
                  {/* Left Identity Column */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-workshop-surface/80 border border-workshop-border/40 flex items-center justify-center text-workshop-muted group-hover:text-secondary group-hover:border-secondary/30 transition-all shrink-0">
                      <Car className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-workshop-text uppercase tracking-tight truncate font-google-sans group-hover:text-secondary transition-colors">
                        {job.make} {job.model}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-workshop-muted font-bold tracking-wider uppercase font-google-sans truncate">
                        <span className="font-plate text-workshop-text px-1.5 py-0.5 bg-workshop-surface/80 rounded border border-workshop-border/40 text-[10px]">
                          {job.plateNumber}
                        </span>
                        <span className="truncate opacity-75">{job.customerName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Status & Date Column */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <div className="text-right">
                      <div className="mb-0.5">
                        <ServiceStatusBadge status={job.status} />
                      </div>
                      <p className="text-[10px] text-workshop-muted font-bold opacity-60 uppercase font-google-sans flex items-center justify-end gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>
                          {job.expectedDeliveryDate
                            ? format(new Date(job.expectedDeliveryDate), 'dd MMM')
                            : 'No Target'}
                        </span>
                      </p>
                    </div>
                    <div className="hidden sm:flex w-7 h-7 rounded-lg bg-workshop-surface/60 items-center justify-center text-workshop-muted group-hover:text-workshop-text group-hover:bg-workshop-surface transition-colors">
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center py-16 text-center opacity-40 px-4"
            >
              <Package className="w-12 h-12 mb-3 text-workshop-muted" />
              <p className="font-black uppercase tracking-widest text-xs font-google-sans text-workshop-muted">
                No recent service activities
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
