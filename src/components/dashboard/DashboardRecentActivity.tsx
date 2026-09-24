import { motion, type Variants } from 'motion/react';
import { Car, Clock, Package } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { getServiceStatusDetail } from '../../lib/constants';
import type { EnrichedActivity } from '../../hooks/useDashboard';

export interface DashboardRecentActivityProps {
  activities: EnrichedActivity[];
  onSelectActivity: (activity: EnrichedActivity) => void;
  containerVariants: Variants;
  itemVariants: Variants;
}

export function DashboardRecentActivity({
  activities,
  onSelectActivity,
  containerVariants,
  itemVariants,
}: DashboardRecentActivityProps) {
  return (
    <div className="space-y-6 pt-8">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xl font-black text-workshop-text uppercase tracking-tighter font-google-sans"
      >
        Recent Activities
      </motion.h2>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col -mx-4 md:-mx-8 lg:-mx-10"
      >
        {activities.length > 0 ? (
          <>
            {activities.slice(0, 5).map((job) => {
              const statusDetail = getServiceStatusDetail(job.status);
              return (
                <motion.div
                  key={job.id}
                  variants={itemVariants}
                  onClick={() => onSelectActivity(job)}
                  className="flex items-center justify-between px-4 md:px-8 lg:px-10 py-6 hover:bg-workshop-surface transition-colors group border-b border-workshop-border/30 cursor-pointer active:scale-[0.99] select-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center text-workshop-muted group-hover:text-workshop-accent transition-colors">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-workshop-text uppercase tracking-tight mb-1 font-google-sans">
                        {job.make} {job.model}
                      </p>
                      <p className="text-[10px] text-workshop-muted font-bold tracking-widest uppercase opacity-70 font-google-sans">
                        <span className="font-plate font-bold text-secondary">{job.plateNumber}</span> • {job.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={cn("flex items-center justify-end gap-2 mb-1", statusDetail.textColor)}>
                        <Clock className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-right font-google-sans">
                          {statusDetail.label}
                        </span>
                      </div>
                      <p className="text-[9px] text-workshop-muted font-bold opacity-40 uppercase font-google-sans">
                        {job.expectedDeliveryDate ? format(new Date(job.expectedDeliveryDate), 'dd MMM') : 'No Date'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 opacity-20"
          >
            <Package className="w-16 h-16 mb-4" />
            <p className="font-black uppercase tracking-widest text-xs font-google-sans">No pending activities</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
