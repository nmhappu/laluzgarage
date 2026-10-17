import { useState, useMemo } from 'react';
import { motion, type Variants } from 'motion/react';
import {
  RefreshCw,
  Calendar as CalendarIcon,
  AlertCircle,
  TrendingUp,
  Clock,
  ClipboardList,
  DollarSign,
  Filter,
  type LucideIcon,
} from 'lucide-react';
import { useAnalytics, type TimeRangeKey } from '../../../hooks/useAnalytics';
import { cn, formatCurrency } from '../../../lib/utils';
import type { CardKey } from '../detail/types';
import { METRIC_METAS, DOMAIN_FILTERS, type MetricDomain } from '../detail/detailUtils';
import { DesktopBentoCard } from './DesktopBentoCard';
import { DesktopBentoExpansionPane } from './DesktopBentoExpansionPane';
import { EChartsReact } from '../EChartsReact';

interface CardConfigItem {
  key: CardKey;
  domain: MetricDomain;
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  primaryValue: string | number;
  badgeText?: string;
  badgeType?: 'success' | 'urgent' | 'neutral' | 'info';
  secondaryContext?: React.ReactNode;
  chartNode?: React.ReactNode;
  isHero?: boolean;
}

interface DesktopAnalyticsBentoProps {
  analytics: ReturnType<typeof useAnalytics>;
  timeRange: TimeRangeKey;
  onSelectTimeRange: (range: TimeRangeKey) => void;
  customStart: Date | null;
  customEnd: Date | null;
  onCustomDateChange: (start: Date | null, end: Date | null) => void;
  showCustomPicker: boolean;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
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

export function DesktopAnalyticsBento({
  analytics,
  timeRange,
  onSelectTimeRange,
  customStart,
  customEnd,
  onCustomDateChange,
  showCustomPicker,
}: DesktopAnalyticsBentoProps) {
  const [activeDomain, setActiveDomain] = useState<MetricDomain | 'all'>('all');
  const [expandedCard, setExpandedCard] = useState<CardKey | null>(null);

  const timeRangeTabs: Array<{ id: TimeRangeKey; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'thisYear', label: 'This Year' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom' },
  ];

  const handleToggleCard = (cardKey: CardKey) => {
    setExpandedCard((prev) => (prev === cardKey ? null : cardKey));
  };

  // Mini Chart Options for Bento Preview
  const revenueMiniChart = useMemo(() => {
    const dates = analytics.revenue.timeline.map((t) => t.label);
    const totals = analytics.revenue.timeline.map((t) => t.total);
    return {
      grid: { top: 4, right: 0, bottom: 4, left: 0, containLabel: false },
      xAxis: { type: 'category', data: dates.length > 0 ? dates : ['No Data'], show: false },
      yAxis: { type: 'value', show: false },
      series: [
        {
          type: 'line',
          smooth: 0.35,
          smoothMonotone: 'x',
          data: totals.length > 0 ? totals : [0],
          symbol: 'none',
          lineStyle: { color: '#10B981', width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.0)' },
              ],
            },
          },
        },
      ],
    };
  }, [analytics.revenue.timeline]);

  const jobFlowMiniChart = useMemo(() => {
    const data = analytics.jobFlow.statusDonut.length > 0
      ? analytics.jobFlow.statusDonut
      : [{ name: 'None', value: 1, itemStyle: { color: 'rgba(255,255,255,0.08)' } }];
    return {
      tooltip: { show: true, trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [
        {
          type: 'pie',
          radius: ['55%', '82%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderColor: '#07080A', borderWidth: 2 },
          label: { show: false },
          data,
        },
      ],
    };
  }, [analytics.jobFlow.statusDonut]);

  const turnaroundMiniChart = useMemo(() => {
    const normalizedVal = Math.min(5, Math.max(0.2, analytics.turnaround.avgDays));
    return {
      series: [
        {
          type: 'gauge',
          center: ['50%', '82%'],
          radius: '90%',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 5,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 6,
              color: [
                [0.3, '#10B981'],
                [0.7, '#FBBF24'],
                [1, '#F43F5E'],
              ],
            },
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '52%',
            width: 3.5,
            offsetCenter: [0, '-10%'],
            itemStyle: { color: '#F8FAFC' },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: { show: false },
          detail: { show: false },
          data: [{ value: normalizedVal }],
        },
      ],
    };
  }, [analytics.turnaround.avgDays]);

  const techMiniChart = useMemo(() => {
    const top3 = analytics.technicians.list.slice(0, 3).reverse();
    const names = top3.map((t) => t.name.split(' ')[0].slice(0, 7));
    const values = top3.map((t) => t.completed);
    return {
      grid: { top: 2, right: 4, bottom: 2, left: 40, containLabel: false },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        data: names.length > 0 ? names : ['None'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94A3B8', fontSize: 9 },
      },
      series: [
        {
          type: 'bar',
          data: values.length > 0 ? values : [0],
          barWidth: 6,
          itemStyle: { color: '#3B82F6', borderRadius: [0, 3, 3, 0] },
          showBackground: true,
          backgroundStyle: { color: 'rgba(255, 255, 255, 0.04)', borderRadius: [0, 3, 3, 0] },
        },
      ],
    };
  }, [analytics.technicians.list]);

  const inventoryMiniChart = useMemo(() => {
    const top3 = analytics.inventory.topParts.slice(0, 3).reverse();
    const names = top3.map((p) => (p.name.length > 8 ? p.name.slice(0, 7) + '…' : p.name));
    const values = top3.map((p) => p.value);
    return {
      grid: { top: 2, right: 4, bottom: 2, left: 44, containLabel: false },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        data: names.length > 0 ? names : ['None'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94A3B8', fontSize: 9 },
      },
      series: [
        {
          type: 'bar',
          data: values.length > 0 ? values : [0],
          barWidth: 6,
          itemStyle: { color: '#F59E0B', borderRadius: [0, 3, 3, 0] },
        },
      ],
    };
  }, [analytics.inventory.topParts]);

  const fleetMiniChart = useMemo(() => {
    const top4 = analytics.fleet.brands.slice(0, 4);
    const data = top4.map((b) => ({ name: b.name, value: b.count }));
    return {
      series: [
        {
          type: 'pie',
          radius: ['20%', '80%'],
          center: ['50%', '50%'],
          roseType: 'area',
          itemStyle: { borderRadius: 3, borderColor: '#07080A', borderWidth: 1.5 },
          label: { show: false },
          data: data.length > 0 ? data : [{ name: 'None', value: 1 }],
        },
      ],
    };
  }, [analytics.fleet.brands]);

  const retentionMiniChart = useMemo(() => {
    return {
      series: [
        {
          type: 'pie',
          radius: ['52%', '80%'],
          center: ['50%', '50%'],
          itemStyle: { borderRadius: 3, borderColor: '#07080A', borderWidth: 1.5 },
          label: { show: false },
          data: [
            { name: 'Repeat', value: analytics.customers.returningCustomers, itemStyle: { color: '#8B5CF6' } },
            { name: 'New', value: analytics.customers.newCustomers, itemStyle: { color: '#06B6D4' } },
          ],
        },
      ],
    };
  }, [analytics.customers.returningCustomers, analytics.customers.newCustomers]);

  const workloadMiniChart = useMemo(() => {
    return {
      grid: { top: 4, right: 2, bottom: 14, left: 2, containLabel: false },
      xAxis: {
        type: 'category',
        data: analytics.workload.days,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748B',
          fontSize: 8.5,
          formatter: (val: string) => val.slice(0, 1),
        },
      },
      yAxis: { type: 'value', show: false },
      series: [
        {
          type: 'bar',
          data: analytics.workload.counts.map((c, i) => ({
            value: c,
            itemStyle: {
              color: analytics.workload.days[i] === analytics.workload.peakDay ? '#F43F5E' : '#06B6D4',
              borderRadius: [2, 2, 0, 0],
            },
          })),
          barWidth: 7,
        },
      ],
    };
  }, [analytics.workload.days, analytics.workload.counts, analytics.workload.peakDay]);

  const categoriesMiniChart = useMemo(() => {
    const top4 = analytics.categories.categories.slice(0, 4);
    return {
      series: [
        {
          type: 'pie',
          radius: ['45%', '80%'],
          center: ['50%', '50%'],
          itemStyle: { borderRadius: 3, borderColor: '#07080A', borderWidth: 1.5 },
          label: { show: false },
          data: top4.map((c) => ({ name: c.name, value: c.count })),
        },
      ],
    };
  }, [analytics.categories.categories]);

  const ticketTiersMiniChart = useMemo(() => {
    return {
      grid: { top: 4, right: 2, bottom: 4, left: 2, containLabel: false },
      xAxis: { type: 'category', data: analytics.invoiceTiers.tiers.map((t) => t.label), show: false },
      yAxis: { type: 'value', show: false },
      series: [
        {
          type: 'bar',
          data: analytics.invoiceTiers.tiers.map((t) => ({
            value: t.count,
            itemStyle: { color: t.color, borderRadius: [2, 2, 0, 0] },
          })),
          barWidth: 8,
        },
      ],
    };
  }, [analytics.invoiceTiers.tiers]);

  const vehicleHealthMiniChart = useMemo(() => {
    const colors = ['#38BDF8', '#34D399', '#FBBF24', '#F43F5E'];
    return {
      series: [
        {
          type: 'pie',
          radius: ['45%', '80%'],
          center: ['50%', '50%'],
          itemStyle: { borderRadius: 3, borderColor: '#07080A', borderWidth: 1.5 },
          label: { show: false },
          data: analytics.vehicleHealth.mileageBrackets.map((b, i) => ({
            name: b.bracket,
            value: b.count,
            itemStyle: { color: colors[i % colors.length] },
          })),
        },
      ],
    };
  }, [analytics.vehicleHealth.mileageBrackets]);

  const clientSpendMiniChart = useMemo(() => {
    const top3 = analytics.topClients.topClients.slice(0, 3).reverse();
    const names = top3.map((c) => (c.name.length > 8 ? c.name.slice(0, 7) + '…' : c.name));
    return {
      grid: { top: 2, right: 4, bottom: 2, left: 44, containLabel: false },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        data: names.length > 0 ? names : ['None'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94A3B8', fontSize: 9 },
      },
      series: [
        {
          type: 'bar',
          data: top3.map((c) => c.totalSpent),
          barWidth: 6,
          itemStyle: { color: '#F43F5E', borderRadius: [0, 3, 3, 0] },
        },
      ],
    };
  }, [analytics.topClients.topClients]);

  // Card list definition
  const cardsConfig: CardConfigItem[] = [
    {
      key: 'revenue' as CardKey,
      domain: 'financial' as MetricDomain,
      title: 'Revenue & Invoicing',
      icon: DollarSign,
      iconColor: 'text-status-success',
      primaryValue: formatCurrency(analytics.revenue.totalRevenue),
      badgeText: `${analytics.revenue.growth >= 0 ? '+' : ''}${analytics.revenue.growth}%`,
      badgeType: (analytics.revenue.growth >= 0 ? 'success' : 'urgent') as 'success' | 'urgent',
      secondaryContext: `Avg ticket: ${formatCurrency(analytics.revenue.avgTicket)} • Labor: ${formatCurrency(analytics.revenue.laborRevenue)}`,
      chartNode: <EChartsReact option={revenueMiniChart} className="w-full h-full min-h-0" />,
      isHero: true,
    },
    {
      key: 'jobFlow' as CardKey,
      domain: 'operations' as MetricDomain,
      title: 'Job Flow & Bay WIP',
      icon: ClipboardList,
      iconColor: 'text-cyan-400',
      primaryValue: `${analytics.jobFlow.total} Orders`,
      badgeText: analytics.jobFlow.overdueCount > 0 ? `${analytics.jobFlow.overdueCount} Overdue` : `${analytics.jobFlow.activeJobs} Active`,
      badgeType: (analytics.jobFlow.overdueCount > 0 ? 'urgent' : 'info') as 'urgent' | 'info',
      secondaryContext: `${analytics.jobFlow.completed} Completed (${analytics.jobFlow.completionRate}%) • ${analytics.jobFlow.activeJobs} in Bay`,
      chartNode: <EChartsReact option={jobFlowMiniChart} className="w-full h-full min-h-0" />,
      isHero: true,
    },
    {
      key: 'turnaround' as CardKey,
      domain: 'operations' as MetricDomain,
      title: 'Turnaround Velocity',
      icon: Clock,
      iconColor: 'text-amber-400',
      primaryValue: `${analytics.turnaround.avgDays} Days`,
      badgeText: `${analytics.turnaround.onTimeRate}% On-Time`,
      badgeType: 'success' as const,
      secondaryContext: `${analytics.turnaround.avgHours} hrs avg • ${analytics.turnaround.expressCount} express turnarounds`,
      chartNode: <EChartsReact option={turnaroundMiniChart} className="w-full h-full min-h-0" />,
    },
    {
      key: 'technicians' as CardKey,
      domain: 'operations' as MetricDomain,
      title: 'Tech & Advisor Output',
      icon: METRIC_METAS.technicians.icon,
      iconColor: 'text-blue-400',
      primaryValue: analytics.technicians.topTech ? `${analytics.technicians.topTech.name.split(' ')[0]} (${analytics.technicians.topTech.completed})` : `${analytics.technicians.totalAdvisors} Advisors`,
      badgeText: 'Leaderboard',
      badgeType: 'neutral' as const,
      secondaryContext: `Top advisor: ${analytics.technicians.topTech ? analytics.technicians.topTech.name : 'N/A'} • ${analytics.technicians.totalAdvisors} active`,
      chartNode: <EChartsReact option={techMiniChart} className="w-full h-full min-h-0" />,
    },
    {
      key: 'inventory' as CardKey,
      domain: 'inventory' as MetricDomain,
      title: 'Parts & Stock Velocity',
      icon: METRIC_METAS.inventory.icon,
      iconColor: 'text-amber-500',
      primaryValue: formatCurrency(analytics.inventory.totalBilled),
      badgeText: analytics.inventory.lowStockCount > 0 ? `${analytics.inventory.lowStockCount} Low` : undefined,
      badgeType: 'urgent' as const,
      secondaryContext: `${analytics.inventory.totalItemsDispatched} parts billed • Top: ${analytics.inventory.topParts[0]?.name || 'N/A'}`,
      chartNode: <EChartsReact option={inventoryMiniChart} className="w-full h-full min-h-0" />,
    },
    {
      key: 'fleet' as CardKey,
      domain: 'fleet_clients' as MetricDomain,
      title: 'Fleet & Brand Share',
      icon: METRIC_METAS.fleet.icon,
      iconColor: 'text-indigo-400',
      primaryValue: analytics.fleet.topBrand.name !== 'None' ? `${analytics.fleet.topBrand.name} (${analytics.fleet.topBrand.percentage}%)` : `${analytics.fleet.totalVehiclesServiced} Cars`,
      badgeText: `${analytics.fleet.repeatRate}% Repeat`,
      badgeType: 'info' as const,
      secondaryContext: `${analytics.fleet.totalVehiclesServiced} vehicles serviced across ${analytics.fleet.brands.length} makes`,
      chartNode: <EChartsReact option={fleetMiniChart} className="w-full h-full min-h-0" />,
    },
    {
      key: 'retention' as CardKey,
      domain: 'fleet_clients' as MetricDomain,
      title: 'Customer Retention',
      icon: METRIC_METAS.retention.icon,
      iconColor: 'text-purple-400',
      primaryValue: `${analytics.customers.repeatPercent}% Repeat`,
      badgeText: `${analytics.customers.uniqueCustomers} Total`,
      badgeType: 'neutral' as const,
      secondaryContext: `${analytics.customers.returningCustomers} loyal returnees • ${analytics.customers.newCustomers} newly acquired`,
      chartNode: <EChartsReact option={retentionMiniChart} className="w-full h-full min-h-0" />,
    },
    {
      key: 'workload' as CardKey,
      domain: 'operations' as MetricDomain,
      title: 'Intake Schedule',
      icon: METRIC_METAS.workload.icon,
      iconColor: 'text-rose-400',
      primaryValue: `Peak: ${analytics.workload.peakDay || '—'}`,
      badgeText: `${analytics.workload.weekendPercent}% Weekend`,
      badgeType: 'neutral' as const,
      secondaryContext: `Peak load on ${analytics.workload.peakDay} • ${analytics.workload.weekendPercent}% weekend intake share`,
      chartNode: <EChartsReact option={workloadMiniChart} className="w-full h-full min-h-0" />,
    },
    {
      key: 'categories' as CardKey,
      domain: 'operations' as MetricDomain,
      title: 'Service Categories',
      icon: METRIC_METAS.categories.icon,
      iconColor: 'text-teal-400',
      primaryValue: analytics.categories.topCategory.name,
      badgeText: `${analytics.categories.totalCategorized} Jobs`,
      badgeType: 'neutral' as const,
      secondaryContext: `Top: ${analytics.categories.topCategory.name} (${analytics.categories.topCategory.percentage}%) • ${analytics.categories.categories.length} job types`,
      chartNode: <EChartsReact option={categoriesMiniChart} className="w-full h-full min-h-0" />,
    },
    {
      key: 'ticketTiers' as CardKey,
      domain: 'financial' as MetricDomain,
      title: 'Invoice Value Tiers',
      icon: METRIC_METAS.ticketTiers.icon,
      iconColor: 'text-emerald-400',
      primaryValue: formatCurrency(analytics.invoiceTiers.medianTicket),
      badgeText: `${analytics.invoiceTiers.highValueShare}% High`,
      badgeType: 'success' as const,
      secondaryContext: `Median ticket: ${formatCurrency(analytics.invoiceTiers.medianTicket)} • Max: ${formatCurrency(analytics.invoiceTiers.highestTicket)}`,
      chartNode: <EChartsReact option={ticketTiersMiniChart} className="w-full h-full min-h-0" />,
    },
    {
      key: 'vehicleHealth' as CardKey,
      domain: 'fleet_clients' as MetricDomain,
      title: 'Vehicle Health & Mileage',
      icon: METRIC_METAS.vehicleHealth.icon,
      iconColor: 'text-sky-400',
      primaryValue: analytics.vehicleHealth.avgMileage > 0 ? `${analytics.vehicleHealth.avgMileage.toLocaleString()} km` : '—',
      badgeText: analytics.vehicleHealth.deadVehicleCount > 0 ? `${analytics.vehicleHealth.deadVehicleCount} Tow-in` : 'Healthy',
      badgeType: analytics.vehicleHealth.deadVehicleCount > 0 ? 'urgent' : 'success',
      secondaryContext: `Breakdown rate: ${analytics.vehicleHealth.deadVehicleRate}% • High mileage: ${analytics.vehicleHealth.highMileageRate}%`,
      chartNode: <EChartsReact option={vehicleHealthMiniChart} className="w-full h-full min-h-0" />,
    },
    {
      key: 'clientSpend' as CardKey,
      domain: 'fleet_clients' as MetricDomain,
      title: 'VIP Clients & Spend',
      icon: METRIC_METAS.clientSpend.icon,
      iconColor: 'text-rose-400',
      primaryValue: analytics.topClients.topClient ? formatCurrency(analytics.topClients.topClient.totalSpent) : '—',
      badgeText: `${analytics.topClients.vipCount} VIPs`,
      badgeType: 'info' as const,
      secondaryContext: `Top 5 share: ${analytics.topClients.top5Share}% • Avg client spend: ${formatCurrency(analytics.topClients.avgCustomerSpend)}`,
      chartNode: <EChartsReact option={clientSpendMiniChart} className="w-full h-full min-h-0" />,
    },
  ];

  // Filter cards by selected domain
  const filteredCards = useMemo(() => {
    if (activeDomain === 'all') return cardsConfig;
    return cardsConfig.filter((c) => c.domain === activeDomain);
  }, [cardsConfig, activeDomain]);

  return (
    <div className="space-y-6 pb-20 font-google-sans">
      {/* 1. Desktop Executive Command Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-workshop-surface/60 border border-workshop-border/60 p-4 lg:p-5 rounded-2xl backdrop-blur-md shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-black text-workshop-text tracking-tight uppercase font-google-sans">
              Analytics Intelligence
            </h1>
            <span className="hidden xl:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-workshop-accent/10 text-workshop-accent border border-workshop-accent/25">
              <span className="w-1.5 h-1.5 rounded-full bg-workshop-accent animate-pulse" />
              Executive Bento
            </span>
          </div>
          <p className="text-xs text-workshop-muted font-medium mt-1">
            Real-time telemetry, workshop financial throughput, and operational efficiency
          </p>
        </div>

        {/* Time Window Selector Pills & Refresh */}
        <div className="flex items-center gap-1.5 bg-workshop-card/80 border border-workshop-border/60 p-1.5 rounded-xl shadow-xs shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
          {timeRangeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTimeRange(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer select-none shrink-0",
                timeRange === tab.id
                  ? "bg-workshop-accent text-workshop-bg shadow-sm font-black"
                  : "text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface/80"
              )}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => analytics.refresh()}
            className="p-1.5 ml-1 text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface/80 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Refresh analytics telemetry"
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
          className="p-4 bg-workshop-surface border border-workshop-border/60 rounded-xl flex items-center justify-between gap-4 text-xs font-bold text-workshop-text shadow-xs"
        >
          <div className="flex items-center gap-2.5 text-workshop-muted">
            <CalendarIcon className="w-4 h-4 text-workshop-accent" />
            <span>Custom Date Range Filter:</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={customStart ? customStart.toISOString().slice(0, 10) : ''}
              onChange={(e) => onCustomDateChange(e.target.value ? new Date(e.target.value) : null, customEnd)}
              className="bg-workshop-card border border-workshop-border/60 px-3 py-1.5 rounded-lg text-xs font-mono text-workshop-text focus:outline-none focus:border-workshop-accent"
            />
            <span className="text-workshop-muted">to</span>
            <input
              type="date"
              value={customEnd ? customEnd.toISOString().slice(0, 10) : ''}
              onChange={(e) => onCustomDateChange(customStart, e.target.value ? new Date(e.target.value) : null)}
              className="bg-workshop-card border border-workshop-border/60 px-3 py-1.5 rounded-lg text-xs font-mono text-workshop-text focus:outline-none focus:border-workshop-accent"
            />
          </div>
        </motion.div>
      )}

      {/* Error state */}
      {analytics.error && (
        <div className="p-4 rounded-xl bg-status-urgent/10 border border-status-urgent/30 flex items-center gap-3 text-status-urgent text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{analytics.error}</span>
        </div>
      )}

      {/* 2. Executive Quick-Glance KPI Ribbon (Desktop Enhanced) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Net Invoiced */}
        <div className="bg-workshop-surface border border-workshop-border/60 rounded-2xl p-4 lg:p-5 flex flex-col justify-between shadow-xs hover:border-workshop-border transition-colors">
          <div className="flex items-center justify-between text-workshop-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Net Invoiced</span>
            <TrendingUp className="w-4 h-4 text-status-success" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl lg:text-3xl font-black font-google-sans text-status-success truncate">
              {formatCurrency(analytics.revenue.totalRevenue)}
            </span>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
              analytics.revenue.growth >= 0
                ? "bg-status-success/15 text-status-success border-status-success/30"
                : "bg-status-urgent/15 text-status-urgent border-status-urgent/30"
            )}>
              {analytics.revenue.growth >= 0 ? '+' : ''}{analytics.revenue.growth}%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-workshop-muted font-medium truncate">
            Labor: {formatCurrency(analytics.revenue.laborRevenue)} • Parts: {formatCurrency(analytics.revenue.partsRevenue)}
          </div>
        </div>

        {/* Bay WIP & Orders */}
        <div className="bg-workshop-surface border border-workshop-border/60 rounded-2xl p-4 lg:p-5 flex flex-col justify-between shadow-xs hover:border-workshop-border transition-colors">
          <div className="flex items-center justify-between text-workshop-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bay WIP & Orders</span>
            <ClipboardList className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl lg:text-3xl font-black font-google-sans text-workshop-text truncate">
              {analytics.jobFlow.total} <span className="text-sm font-normal text-workshop-muted">Jobs</span>
            </span>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full shrink-0">
              {analytics.jobFlow.activeJobs} Active WIP
            </span>
          </div>
          <div className="mt-2 text-[11px] text-workshop-muted font-medium truncate">
            {analytics.jobFlow.completed} completed ({analytics.jobFlow.completionRate}%)
          </div>
        </div>

        {/* Avg Repair Order */}
        <div className="bg-workshop-surface border border-workshop-border/60 rounded-2xl p-4 lg:p-5 flex flex-col justify-between shadow-xs hover:border-workshop-border transition-colors">
          <div className="flex items-center justify-between text-workshop-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Repair Order</span>
            <DollarSign className="w-4 h-4 text-workshop-accent" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl lg:text-3xl font-black font-google-sans text-workshop-text truncate">
              {formatCurrency(analytics.revenue.avgTicket)}
            </span>
            <span className="text-[10px] font-bold text-workshop-muted bg-workshop-card border border-workshop-border/50 px-2 py-0.5 rounded-full shrink-0">
              Per Ticket
            </span>
          </div>
          <div className="mt-2 text-[11px] text-workshop-muted font-medium truncate">
            Dominant tier: {analytics.invoiceTiers.dominantTier.name}
          </div>
        </div>

        {/* Turnaround Velocity */}
        <div className="bg-workshop-surface border border-workshop-border/60 rounded-2xl p-4 lg:p-5 flex flex-col justify-between shadow-xs hover:border-workshop-border transition-colors">
          <div className="flex items-center justify-between text-workshop-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Turnaround Velocity</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl lg:text-3xl font-black font-google-sans text-amber-400 truncate">
              {analytics.turnaround.avgDays} <span className="text-sm font-normal text-workshop-muted">Days</span>
            </span>
            <span className="text-[10px] font-bold text-status-success bg-status-success/15 border border-status-success/30 px-2 py-0.5 rounded-full shrink-0">
              {analytics.turnaround.onTimeRate}% On-Time
            </span>
          </div>
          <div className="mt-2 text-[11px] text-workshop-muted font-medium truncate">
            {analytics.turnaround.avgHours} hrs avg • {analytics.turnaround.expressCount} express
          </div>
        </div>
      </div>

      {/* 3. Domain Filter Navigation Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-workshop-border/40 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-xs text-workshop-muted font-bold mr-2 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-workshop-accent" />
            <span>Filter:</span>
          </div>
          {DOMAIN_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveDomain(filter.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none shrink-0 flex items-center gap-1.5",
                activeDomain === filter.id
                  ? "bg-workshop-text text-workshop-bg font-black shadow-xs"
                  : "bg-workshop-surface border border-workshop-border/60 text-workshop-muted hover:text-workshop-text hover:bg-workshop-card/60"
              )}
            >
              <span>{filter.label}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                activeDomain === filter.id
                  ? "bg-workshop-bg/20 text-workshop-bg"
                  : "bg-workshop-card text-workshop-muted"
              )}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>

        {expandedCard && (
          <button
            type="button"
            onClick={() => setExpandedCard(null)}
            className="text-xs font-bold text-workshop-accent hover:underline cursor-pointer shrink-0"
          >
            Collapse Active Deep-Dive
          </button>
        )}
      </div>

      {/* 4. Desktop Executive Bento Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5"
      >
        {/* Render inline expansion pane if active and hero */}
        {expandedCard && (
          <DesktopBentoExpansionPane
            activeCard={expandedCard}
            analyticsData={analytics}
            onClose={() => setExpandedCard(null)}
          />
        )}

        {filteredCards.map((card) => {
          const isExpanded = expandedCard === card.key;
          const meta = METRIC_METAS[card.key];

          return (
            <motion.div
              key={card.key}
              variants={cardItemVariants}
              className={card.isHero && activeDomain === 'all' ? 'col-span-1 md:col-span-2' : 'col-span-1'}
            >
              <DesktopBentoCard
                metricKey={card.key}
                title={card.title}
                domainLabel={meta.categoryLabel}
                icon={card.icon}
                iconColor={card.iconColor}
                primaryValue={card.primaryValue}
                badgeText={card.badgeText}
                badgeType={card.badgeType}
                secondaryContext={card.secondaryContext}
                chartNode={card.chartNode}
                isHero={card.isHero && activeDomain === 'all'}
                isExpanded={isExpanded}
                onToggleExpand={() => handleToggleCard(card.key)}
              />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
export default DesktopAnalyticsBento;
