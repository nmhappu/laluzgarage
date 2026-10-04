import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { TotalServicesCard } from './dashboard/TotalServicesCard';
import { PendingJobsCard } from './dashboard/PendingJobsCard';
import { CompletedJobsCard } from './dashboard/CompletedJobsCard';
import { DashboardOverviewStrip } from './dashboard/DashboardOverviewStrip';
import { DashboardRecentActivity } from './dashboard/DashboardRecentActivity';
import { useDashboard } from '../hooks/useDashboard';

export function Dashboard() {
  const navigate = useNavigate();
  const { pendingQueue, metrics, loading } = useDashboard();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
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
        duration: 0.35,
        ease: [0.2, 0, 0, 1.0],
      },
    },
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 font-google-sans">
      {/* Primary KPI Grid: Total Services (1x2 / Rectangular) + Pending (1x1) & Completed (1x1) together */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 accelerate-gpu will-change-transform-opacity"
      >
        <TotalServicesCard
          totalServices={metrics.totalServices}
          trend={metrics.history.services}
          loading={loading}
          onClick={() => navigate('/services', { state: { activeTab: 'all' } })}
          variants={itemVariants}
        />

        <PendingJobsCard
          pendingCount={metrics.pendingWorks}
          trend={metrics.history.pending}
          loading={loading}
          onClick={() => navigate('/services', { state: { activeTab: 'pending' } })}
          variants={itemVariants}
        />

        <CompletedJobsCard
          completedCount={metrics.completedWorks}
          totalServices={metrics.totalServices}
          trend={metrics.history.completed}
          loading={loading}
          onClick={() => navigate('/services', { state: { activeTab: 'completed' } })}
          variants={itemVariants}
        />
      </motion.div>

      {/* Secondary Workshop Telemetry Strip */}
      <DashboardOverviewStrip
        totalVehicles={metrics.totalVehicles}
        totalCustomers={metrics.totalCustomers}
        issuesAttended={metrics.issuesAttended}
        loading={loading}
        variants={itemVariants}
      />

      {/* Recent Activities List */}
      <DashboardRecentActivity
        activities={pendingQueue}
        loading={loading}
        onSelectActivity={(job) => navigate('/services', { state: { openRecordId: job.id } })}
        onViewAll={() => navigate('/services')}
        containerVariants={containerVariants}
        itemVariants={itemVariants}
      />
    </div>
  );
}
