import { useState } from 'react';
import { motion, type Variants } from 'motion/react';
import {
  TrendingUp,
  RefreshCw,
  Calendar as CalendarIcon,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useAnalytics, type TimeRangeKey } from '../hooks/useAnalytics';
import {
  RevenueCard,
  JobFlowCard,
  TurnaroundCard,
  TechnicianCard,
  InventoryCard,
  FleetCard,
  RetentionCard,
  WorkloadHeatmapCard,
} from './analytics/cards';
import { AnalyticsDetailDrawer, type CardKey } from './analytics/detail/AnalyticsDetailDrawer';
import { cn } from '../lib/utils';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.2, 0, 0, 1.0],
    },
  },
};

export function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('30d');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Active card for drill-down drawer
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);

  const analytics = useAnalytics(timeRange, customStart, customEnd);

  const timeRangeTabs: Array<{ id: TimeRangeKey; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'thisYear', label: 'This Year' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom' },
  ];

  const handleSelectTimeRange = (id: TimeRangeKey) => {
    if (id === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
    setTimeRange(id);
  };

  return (
    <div className="space-y-6 pb-24 font-google-sans">
      {/* 1. Page Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-workshop-accent text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              monitoring
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-workshop-accent">
              Business Intelligence
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-workshop-text tracking-tighter uppercase font-google-sans">
            Statistics
          </h1>
          <p className="text-xs text-workshop-muted font-medium mt-1">
            Executive workshop throughput, financials & advisor productivity
          </p>
        </div>

        {/* Time Window Selector Pills */}
        <div className="flex items-center flex-wrap gap-1.5 bg-workshop-surface border border-workshop-border/60 p-1.5 rounded-xl shadow-xs">
          {timeRangeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTimeRange(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer select-none",
                timeRange === tab.id
                  ? "bg-workshop-accent text-workshop-bg shadow-sm"
                  : "text-workshop-muted hover:text-workshop-text hover:bg-workshop-card/50"
              )}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => analytics.refresh()}
            className="p-1.5 ml-1 text-workshop-muted hover:text-workshop-text hover:bg-workshop-card/50 rounded-lg transition-colors cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={cn("w-4 h-4", analytics.loading && "animate-spin text-workshop-accent")} />
          </button>
        </div>
      </header>

      {/* Custom Date Interval Popover / Banner */}
      {showCustomPicker && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-workshop-surface border border-workshop-border rounded-xl flex flex-wrap items-center gap-4 text-xs font-bold text-workshop-text"
        >
          <div className="flex items-center gap-2 text-workshop-muted">
            <CalendarIcon className="w-4 h-4 text-workshop-accent" />
            <span>Custom Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart ? customStart.toISOString().slice(0, 10) : ''}
              onChange={(e) => setCustomStart(e.target.value ? new Date(e.target.value) : null)}
              className="bg-workshop-card border border-workshop-border px-2.5 py-1.5 rounded-lg text-xs font-mono text-workshop-text focus:outline-none focus:border-workshop-accent"
            />
            <span className="text-workshop-muted">to</span>
            <input
              type="date"
              value={customEnd ? customEnd.toISOString().slice(0, 10) : ''}
              onChange={(e) => setCustomEnd(e.target.value ? new Date(e.target.value) : null)}
              className="bg-workshop-card border border-workshop-border px-2.5 py-1.5 rounded-lg text-xs font-mono text-workshop-text focus:outline-none focus:border-workshop-accent"
            />
          </div>
        </motion.div>
      )}

      {/* Error state */}
      {analytics.error && (
        <div className="p-4 rounded-xl bg-status-urgent/10 border border-status-urgent/30 flex items-center gap-3 text-status-urgent text-xs font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{analytics.error}</span>
        </div>
      )}

      {/* 2. Primary Screen: Square Cards 2-per-row Grid */}
      {analytics.loading && analytics.recordsCount === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square min-h-[250px] bg-workshop-surface border border-workshop-border/30 rounded-2xl p-6 flex flex-col justify-between animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-workshop-card/80" />
                <div className="w-16 h-5 rounded-full bg-workshop-card/80" />
              </div>
              <div className="space-y-3 my-auto">
                <div className="w-32 h-8 rounded-lg bg-workshop-card/80" />
                <div className="w-full h-24 rounded-lg bg-workshop-card/40" />
              </div>
              <div className="w-48 h-4 rounded bg-workshop-card/60" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6"
        >
          {/* Card 1: Revenue & Invoicing */}
          <motion.div variants={cardItemVariants}>
            <RevenueCard
              totalRevenue={analytics.revenue.totalRevenue}
              laborRevenue={analytics.revenue.laborRevenue}
              partsRevenue={analytics.revenue.partsRevenue}
              avgTicket={analytics.revenue.avgTicket}
              growth={analytics.revenue.growth}
              timeline={analytics.revenue.timeline}
              onClick={() => setActiveCard('revenue')}
            />
          </motion.div>

          {/* Card 2: Job Flow & Work Orders */}
          <motion.div variants={cardItemVariants}>
            <JobFlowCard
              total={analytics.jobFlow.total}
              completed={analytics.jobFlow.completed}
              activeJobs={analytics.jobFlow.activeJobs}
              completionRate={analytics.jobFlow.completionRate}
              overdueCount={analytics.jobFlow.overdueCount}
              statusDonut={analytics.jobFlow.statusDonut}
              onClick={() => setActiveCard('jobFlow')}
            />
          </motion.div>

          {/* Card 3: Turnaround Velocity */}
          <motion.div variants={cardItemVariants}>
            <TurnaroundCard
              avgDays={analytics.turnaround.avgDays}
              avgHours={analytics.turnaround.avgHours}
              onTimeRate={analytics.turnaround.onTimeRate}
              expressCount={analytics.turnaround.expressCount}
              longStayCount={analytics.turnaround.longStayCount}
              onClick={() => setActiveCard('turnaround')}
            />
          </motion.div>

          {/* Card 4: Technician Productivity */}
          <motion.div variants={cardItemVariants}>
            <TechnicianCard
              list={analytics.technicians.list}
              topTech={analytics.technicians.topTech}
              totalAdvisors={analytics.technicians.totalAdvisors}
              onClick={() => setActiveCard('technicians')}
            />
          </motion.div>

          {/* Card 5: Parts & Inventory Velocity */}
          <motion.div variants={cardItemVariants}>
            <InventoryCard
              totalBilled={analytics.inventory.totalBilled}
              totalItemsDispatched={analytics.inventory.totalItemsDispatched}
              lowStockCount={analytics.inventory.lowStockCount}
              topParts={analytics.inventory.topParts}
              categoryBreakdown={analytics.inventory.categoryBreakdown}
              onClick={() => setActiveCard('inventory')}
            />
          </motion.div>

          {/* Card 6: Fleet & Brand Share */}
          <motion.div variants={cardItemVariants}>
            <FleetCard
              totalVehiclesServiced={analytics.fleet.totalVehiclesServiced}
              repeatRate={analytics.fleet.repeatRate}
              brands={analytics.fleet.brands}
              topBrand={analytics.fleet.topBrand}
              onClick={() => setActiveCard('fleet')}
            />
          </motion.div>

          {/* Card 7: Customer Retention */}
          <motion.div variants={cardItemVariants}>
            <RetentionCard
              uniqueCustomers={analytics.customers.uniqueCustomers}
              returningCustomers={analytics.customers.returningCustomers}
              newCustomers={analytics.customers.newCustomers}
              repeatPercent={analytics.customers.repeatPercent}
              onClick={() => setActiveCard('retention')}
            />
          </motion.div>

          {/* Card 8: Peak Arrival & Intake Schedule */}
          <motion.div variants={cardItemVariants}>
            <WorkloadHeatmapCard
              days={analytics.workload.days}
              counts={analytics.workload.counts}
              peakDay={analytics.workload.peakDay}
              weekendPercent={analytics.workload.weekendPercent}
              onClick={() => setActiveCard('workload')}
            />
          </motion.div>
        </motion.div>
      )}

      {/* 3. Detail Slide-Over Drawer on Card Click */}
      <AnalyticsDetailDrawer
        activeCard={activeCard}
        onClose={() => setActiveCard(null)}
        analyticsData={analytics}
      />
    </div>
  );
}
export default Analytics;
