import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import {
  RefreshCw,
  Calendar as CalendarIcon,
  AlertCircle,
} from 'lucide-react';
import { useAnalytics, type TimeRangeKey } from '../../hooks/useAnalytics';
import {
  RevenueCard,
  JobFlowCard,
  TurnaroundCard,
  TechnicianCard,
  InventoryCard,
  FleetCard,
  RetentionCard,
  WorkloadHeatmapCard,
  ServiceCategoriesCard,
  InvoiceTiersCard,
  VehicleHealthCard,
  ClientSpendCard,
} from './cards';
import type { CardKey } from './detail/types';
import { cn, formatCurrency } from '../../lib/utils';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.2, 0, 0, 1.0],
    },
  },
};

export function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const timeRange = (searchParams.get('range') as TimeRangeKey) || '30d';
  const customStartParam = searchParams.get('start');
  const customEndParam = searchParams.get('end');

  const [customStart, setCustomStart] = useState<Date | null>(
    customStartParam ? new Date(customStartParam) : null
  );
  const [customEnd, setCustomEnd] = useState<Date | null>(
    customEndParam ? new Date(customEndParam) : null
  );
  const [showCustomPicker, setShowCustomPicker] = useState(timeRange === 'custom');

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
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('range', id);
      if (id !== 'custom') {
        next.delete('start');
        next.delete('end');
      }
      return next;
    }, { replace: true });

    if (id === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
  };

  const handleCustomDateChange = (start: Date | null, end: Date | null) => {
    setCustomStart(start);
    setCustomEnd(end);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('range', 'custom');
      if (start) next.set('start', start.toISOString().slice(0, 10));
      if (end) next.set('end', end.toISOString().slice(0, 10));
      return next;
    }, { replace: true });
  };

  const handleCardClick = (cardKey: CardKey) => {
    navigate(`/analytics/${cardKey}${location.search}`);
  };

  return (
    <div className="space-y-3.5 sm:space-y-5 pb-24 font-google-sans">
      {/* 1. Page Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-workshop-text tracking-tight uppercase font-google-sans">
          Analytics
        </h1>

        {/* Time Window Selector Pills */}
        <div className="flex items-center gap-1 sm:gap-1.5 max-w-full overflow-x-auto no-scrollbar bg-workshop-surface border border-workshop-border/60 p-1 rounded-xl shadow-xs shrink-0">
          {timeRangeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTimeRange(tab.id)}
              className={cn(
                "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer select-none shrink-0",
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
            className="p-1 sm:p-1.5 ml-0.5 text-workshop-muted hover:text-workshop-text hover:bg-workshop-card/50 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Refresh analytics data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", analytics.loading && "animate-spin text-workshop-accent")} />
          </button>
        </div>
      </header>

      {/* Custom Date Interval Popover / Banner */}
      {showCustomPicker && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 sm:p-4 bg-workshop-surface border border-workshop-border/60 rounded-xl flex flex-wrap items-center gap-3 text-xs font-bold text-workshop-text"
        >
          <div className="flex items-center gap-2 text-workshop-muted">
            <CalendarIcon className="w-4 h-4 text-workshop-accent" />
            <span>Custom Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart ? customStart.toISOString().slice(0, 10) : ''}
              onChange={(e) => handleCustomDateChange(e.target.value ? new Date(e.target.value) : null, customEnd)}
              className="bg-workshop-card border border-workshop-border/60 px-2.5 py-1.5 rounded-lg text-xs font-mono text-workshop-text focus:outline-none focus:border-workshop-accent"
            />
            <span className="text-workshop-muted">to</span>
            <input
              type="date"
              value={customEnd ? customEnd.toISOString().slice(0, 10) : ''}
              onChange={(e) => handleCustomDateChange(customStart, e.target.value ? new Date(e.target.value) : null)}
              className="bg-workshop-card border border-workshop-border/60 px-2.5 py-1.5 rounded-lg text-xs font-mono text-workshop-text focus:outline-none focus:border-workshop-accent"
            />
          </div>
        </motion.div>
      )}

      {/* Error state */}
      {analytics.error && (
        <div className="p-3.5 rounded-xl bg-status-urgent/10 border border-status-urgent/30 flex items-center gap-3 text-status-urgent text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{analytics.error}</span>
        </div>
      )}

      {/* Executive Quick-Glance KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-workshop-surface border border-workshop-border/60 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-workshop-muted">
            Net Invoiced
          </p>
          <div className="flex items-baseline justify-between gap-1 mt-1">
            <span className="text-sm xs:text-base sm:text-xl font-black font-google-sans text-status-success truncate">
              {formatCurrency(analytics.revenue.totalRevenue)}
            </span>
            <span className={cn(
              "text-[8.5px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0",
              analytics.revenue.growth >= 0
                ? "bg-status-success/10 text-status-success border-status-success/20"
                : "bg-status-urgent/10 text-status-urgent border-status-urgent/20"
            )}>
              {analytics.revenue.growth >= 0 ? '+' : ''}{analytics.revenue.growth}%
            </span>
          </div>
        </div>

        <div className="bg-workshop-surface border border-workshop-border/60 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-workshop-muted">
            Bay WIP & Orders
          </p>
          <div className="flex items-baseline justify-between gap-1 mt-1">
            <span className="text-sm xs:text-base sm:text-xl font-black font-google-sans text-workshop-text truncate">
              {analytics.jobFlow.total} <span className="text-[10px] sm:text-xs font-normal text-workshop-muted">Jobs</span>
            </span>
            <span className="text-[8.5px] sm:text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full shrink-0">
              {analytics.jobFlow.activeJobs} Active
            </span>
          </div>
        </div>

        <div className="bg-workshop-surface border border-workshop-border/60 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-workshop-muted">
            Avg Repair Order
          </p>
          <div className="flex items-baseline justify-between gap-1 mt-1">
            <span className="text-sm xs:text-base sm:text-xl font-black font-google-sans text-workshop-text truncate">
              {formatCurrency(analytics.revenue.avgTicket)}
            </span>
            <span className="text-[8.5px] sm:text-[10px] font-bold text-workshop-muted bg-workshop-card border border-workshop-border/40 px-1.5 py-0.5 rounded-full shrink-0">
              {analytics.jobFlow.completionRate}% Done
            </span>
          </div>
        </div>

        <div className="bg-workshop-surface border border-workshop-border/60 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-workshop-muted">
            Turnaround Speed
          </p>
          <div className="flex items-baseline justify-between gap-1 mt-1">
            <span className="text-sm xs:text-base sm:text-xl font-black font-google-sans text-amber-400 truncate">
              {analytics.turnaround.avgDays} <span className="text-[10px] sm:text-xs font-normal text-workshop-muted">Days</span>
            </span>
            <span className="text-[8.5px] sm:text-[10px] font-bold text-status-success bg-status-success/10 border border-status-success/20 px-1.5 py-0.5 rounded-full shrink-0">
              {analytics.turnaround.onTimeRate}% On-Time
            </span>
          </div>
        </div>
      </div>

      {/* 2. Primary Screen: Clean 2x2 Square Cards Grid */}
      {analytics.loading && analytics.recordsCount === 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square min-h-0 bg-workshop-surface border border-workshop-border/30 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col justify-between animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-workshop-card/80" />
                <div className="w-10 sm:w-14 h-3.5 sm:h-4 rounded-full bg-workshop-card/80" />
              </div>
              <div className="space-y-1.5 sm:space-y-2 my-auto">
                <div className="w-16 sm:w-28 h-4 sm:h-7 rounded bg-workshop-card/80" />
                <div className="w-full h-10 sm:h-20 rounded bg-workshop-card/40" />
              </div>
              <div className="w-20 sm:w-40 h-2.5 sm:h-3.5 rounded bg-workshop-card/60" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-6"
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
              onClick={() => handleCardClick('revenue')}
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
              onClick={() => handleCardClick('jobFlow')}
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
              onClick={() => handleCardClick('turnaround')}
            />
          </motion.div>

          {/* Card 4: Technician Productivity */}
          <motion.div variants={cardItemVariants}>
            <TechnicianCard
              list={analytics.technicians.list}
              topTech={analytics.technicians.topTech}
              totalAdvisors={analytics.technicians.totalAdvisors}
              onClick={() => handleCardClick('technicians')}
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
              onClick={() => handleCardClick('inventory')}
            />
          </motion.div>

          {/* Card 6: Fleet & Brand Share */}
          <motion.div variants={cardItemVariants}>
            <FleetCard
              totalVehiclesServiced={analytics.fleet.totalVehiclesServiced}
              repeatRate={analytics.fleet.repeatRate}
              brands={analytics.fleet.brands}
              topBrand={analytics.fleet.topBrand}
              onClick={() => handleCardClick('fleet')}
            />
          </motion.div>

          {/* Card 7: Customer Retention */}
          <motion.div variants={cardItemVariants}>
            <RetentionCard
              uniqueCustomers={analytics.customers.uniqueCustomers}
              returningCustomers={analytics.customers.returningCustomers}
              newCustomers={analytics.customers.newCustomers}
              repeatPercent={analytics.customers.repeatPercent}
              onClick={() => handleCardClick('retention')}
            />
          </motion.div>

          {/* Card 8: Peak Arrival & Intake Schedule */}
          <motion.div variants={cardItemVariants}>
            <WorkloadHeatmapCard
              days={analytics.workload.days}
              counts={analytics.workload.counts}
              peakDay={analytics.workload.peakDay}
              weekendPercent={analytics.workload.weekendPercent}
              onClick={() => handleCardClick('workload')}
            />
          </motion.div>

          {/* Card 9: Service Categories & Demand */}
          <motion.div variants={cardItemVariants}>
            <ServiceCategoriesCard
              categories={analytics.categories.categories}
              topCategory={analytics.categories.topCategory}
              topRevenueCategory={analytics.categories.topRevenueCategory}
              totalCategorized={analytics.categories.totalCategorized}
              onClick={() => handleCardClick('categories')}
            />
          </motion.div>

          {/* Card 10: Invoice Value Tiers & Ticket Spread */}
          <motion.div variants={cardItemVariants}>
            <InvoiceTiersCard
              tiers={analytics.invoiceTiers.tiers}
              medianTicket={analytics.invoiceTiers.medianTicket}
              highestTicket={analytics.invoiceTiers.highestTicket}
              dominantTier={analytics.invoiceTiers.dominantTier}
              highValueShare={analytics.invoiceTiers.highValueShare}
              totalInvoices={analytics.invoiceTiers.totalInvoices}
              onClick={() => handleCardClick('ticketTiers')}
            />
          </motion.div>

          {/* Card 11: Vehicle Health, Mileage & Tow-in Rate */}
          <motion.div variants={cardItemVariants}>
            <VehicleHealthCard
              avgMileage={analytics.vehicleHealth.avgMileage}
              deadVehicleCount={analytics.vehicleHealth.deadVehicleCount}
              deadVehicleRate={analytics.vehicleHealth.deadVehicleRate}
              unknownMileageCount={analytics.vehicleHealth.unknownMileageCount}
              highMileageCount={analytics.vehicleHealth.highMileageCount}
              highMileageRate={analytics.vehicleHealth.highMileageRate}
              mileageBrackets={analytics.vehicleHealth.mileageBrackets}
              avgDeltaKm={analytics.vehicleHealth.avgDeltaKm}
              onClick={() => handleCardClick('vehicleHealth')}
            />
          </motion.div>

          {/* Card 12: VIP Clients & Customer Spend (LTV) */}
          <motion.div variants={cardItemVariants}>
            <ClientSpendCard
              topClients={analytics.topClients.topClients}
              topClient={analytics.topClients.topClient}
              avgCustomerSpend={analytics.topClients.avgCustomerSpend}
              top5Share={analytics.topClients.top5Share}
              vipCount={analytics.topClients.vipCount}
              totalTrackedSpend={analytics.topClients.totalTrackedSpend}
              onClick={() => handleCardClick('clientSpend')}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export { Analytics as AnalyticsView };
export default Analytics;
