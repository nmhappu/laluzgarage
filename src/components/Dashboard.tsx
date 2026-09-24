import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { StatTile } from './dashboard/StatTile';
import { DashboardRecentActivity } from './dashboard/DashboardRecentActivity';
import { useDashboard } from '../hooks/useDashboard';

export function Dashboard() {
  const navigate = useNavigate();
  const { pendingQueue, isMounted, stats } = useDashboard();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
      },
    },
  };

  const itemVariants: Variants = {
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
  };

  return (
    <div className="space-y-8 pb-20 font-google-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-2xl md:text-4xl font-black text-workshop-text tracking-tighter uppercase font-google-sans">
            Dashboard
          </h1>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-workshop-accent/20 blur-xl rounded group-hover:bg-workshop-accent/40 transition-all duration-500" />
          <button
            onClick={() => navigate('/intake')}
            className="relative flex items-center gap-2 px-6 py-4 bg-workshop-accent text-workshop-bg text-xs font-black uppercase tracking-widest rounded hover:brightness-110 transition-all active:scale-95 cursor-pointer font-google-sans"
          >
            <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            Vehicle Intake
          </button>
        </motion.div>
      </header>

      {/* Dashboard Watchlist Style */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col -mx-4 md:-mx-8 lg:-mx-10 accelerate-gpu will-change-transform-opacity"
      >
        {stats.map((stat) => (
          <StatTile
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            trend={stat.trend}
            isMounted={isMounted}
            variants={itemVariants}
            onClick={
              stat.target
                ? () => navigate(stat.target, { state: stat.state })
                : undefined
            }
          />
        ))}
      </motion.div>

      {/* Recent Activities List */}
      <DashboardRecentActivity
        activities={pendingQueue}
        onSelectActivity={(job) => navigate('/services', { state: { openRecordId: job.id } })}
        containerVariants={containerVariants}
        itemVariants={itemVariants}
      />
    </div>
  );
}
