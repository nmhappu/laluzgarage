import { useNavigate } from 'react-router-dom';
import { Car, Users, Wrench, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'motion/react';

export interface DashboardOverviewStripProps {
  totalVehicles: number;
  totalCustomers: number;
  issuesAttended: number;
  loading?: boolean;
  variants?: Variants;
}

export function DashboardOverviewStrip({
  totalVehicles,
  totalCustomers,
  issuesAttended,
  loading = false,
  variants,
}: DashboardOverviewStripProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={variants}
      className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-2 rounded-2xl bg-workshop-surface/30 border border-workshop-border/40 accelerate-gpu will-change-transform-opacity"
    >
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="contents select-none"
          >
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-workshop-surface skeleton-element-m3 shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="w-14 h-2.5 rounded bg-workshop-surface skeleton-element-m3" />
                  <div className="w-10 h-3.5 rounded bg-workshop-surface skeleton-element-m3" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="contents"
          >
            {/* Vehicles Stat Pill */}
      <button
        type="button"
        onClick={() => navigate('/vehicles')}
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-workshop-surface/60 border border-transparent hover:border-workshop-border/30 transition-all cursor-pointer group text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-workshop-surface flex items-center justify-center text-workshop-muted group-hover:text-secondary transition-colors shrink-0">
          <Car className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-workshop-muted block font-google-sans">
            Vehicles
          </span>
          <span className="text-sm font-black text-workshop-text tracking-tight font-google-sans truncate block">
            {totalVehicles}
          </span>
        </div>
      </button>

      {/* Customers Stat Pill */}
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left">
        <div className="w-8 h-8 rounded-lg bg-workshop-surface flex items-center justify-center text-workshop-muted shrink-0">
          <Users className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-workshop-muted block font-google-sans">
            Customers
          </span>
          <span className="text-sm font-black text-workshop-text tracking-tight font-google-sans truncate block">
            {totalCustomers}
          </span>
        </div>
      </div>

      {/* Issues / Parts Attended Pill */}
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left">
        <div className="w-8 h-8 rounded-lg bg-workshop-surface flex items-center justify-center text-workshop-muted shrink-0">
          <Wrench className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-workshop-muted block font-google-sans">
            Parts Fixed
          </span>
          <span className="text-sm font-black text-workshop-text tracking-tight font-google-sans truncate block">
            {issuesAttended}
          </span>
        </div>
      </div>

      {/* Workshop Status Pill */}
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left">
        <div className="w-8 h-8 rounded-lg bg-workshop-accent/10 flex items-center justify-center text-workshop-accent shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-workshop-muted block font-google-sans">
            Status
          </span>
          <span className="text-xs font-black text-workshop-accent tracking-wider uppercase font-google-sans truncate block">
            Operational
          </span>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
</motion.div>
);
}
