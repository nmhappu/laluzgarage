import { useEffect, useMemo } from 'react';
import { X, Download, TrendingUp, DollarSign, ClipboardList, Clock, Wrench, Package, Car, Users, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EChartsReact } from '../EChartsReact';
import { useBackHandler } from '../../../contexts/UIContext';
import { formatCurrency, cn } from '../../../lib/utils';
import type { useAnalytics } from '../../../hooks/useAnalytics';

export type CardKey =
  | 'revenue'
  | 'jobFlow'
  | 'turnaround'
  | 'technicians'
  | 'inventory'
  | 'fleet'
  | 'retention'
  | 'workload';

interface AnalyticsDetailDrawerProps {
  activeCard: CardKey | null;
  onClose: () => void;
  analyticsData: ReturnType<typeof useAnalytics>;
}

export function AnalyticsDetailDrawer({
  activeCard,
  onClose,
  analyticsData,
}: AnalyticsDetailDrawerProps) {
  const isOpen = Boolean(activeCard);

  // Native & system back button integration
  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen, 85);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // CSV Exporter for each card view
  const handleExportCSV = () => {
    if (!activeCard) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    const filename = `laluz_analytics_${activeCard}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeCard === 'revenue') {
      csvContent += 'Date,Labor Revenue (INR),Parts Revenue (INR),Total Revenue (INR),Jobs Count\n';
      analyticsData.revenue.timeline.forEach((t) => {
        csvContent += `"${t.date}",${t.labor},${t.parts},${t.total},${t.jobsCount}\n`;
      });
    } else if (activeCard === 'technicians') {
      csvContent += 'Advisor Name,Completed Jobs,Active Jobs,Total Jobs,Labor Revenue (INR),Total Revenue (INR),Completion Rate (%)\n';
      analyticsData.technicians.list.forEach((t) => {
        csvContent += `"${t.name}",${t.completed},${t.active},${t.total},${t.laborRevenue},${t.totalRevenue},${t.completionRate}\n`;
      });
    } else if (activeCard === 'inventory') {
      csvContent += 'Part Name,Quantity Used,Total Billed Value (INR)\n';
      analyticsData.inventory.topParts.forEach((p) => {
        csvContent += `"${p.name}",${p.quantity},${p.value}\n`;
      });
    } else if (activeCard === 'fleet') {
      csvContent += 'Vehicle Brand,Vehicle Count,Share (%)\n';
      analyticsData.fleet.brands.forEach((b) => {
        csvContent += `"${b.name}",${b.count},${b.percentage}\n`;
      });
    } else {
      csvContent += 'Metric,Value\n';
      csvContent += `"Total Invoiced",${analyticsData.revenue.totalRevenue}\n`;
      csvContent += `"Total Work Orders",${analyticsData.jobFlow.total}\n`;
      csvContent += `"Completed Jobs",${analyticsData.jobFlow.completed}\n`;
      csvContent += `"Average Turnaround Days",${analyticsData.turnaround.avgDays}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ECharts Configurations for the expanded views
  const detailChartOption = useMemo(() => {
    if (!activeCard) return {};

    switch (activeCard) {
      case 'revenue': {
        const dates = analyticsData.revenue.timeline.map((t) => t.label);
        const labor = analyticsData.revenue.timeline.map((t) => t.labor);
        const parts = analyticsData.revenue.timeline.map((t) => t.parts);

        return {
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
          },
          legend: {
            data: ['Labor Revenue', 'Parts Revenue'],
            top: 4,
          },
          grid: { top: 40, right: 16, bottom: 65, left: 16, containLabel: true },
          dataZoom: [
            { type: 'inside', start: 0, end: 100 },
            { type: 'slider', bottom: 10, height: 20 },
          ],
          xAxis: {
            type: 'category',
            data: dates,
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`,
            },
          },
          series: [
            {
              name: 'Labor Revenue',
              type: 'bar',
              stack: 'total',
              data: labor,
              itemStyle: { color: '#3B82F6', borderRadius: [0, 0, 0, 0] },
            },
            {
              name: 'Parts Revenue',
              type: 'bar',
              stack: 'total',
              data: parts,
              itemStyle: { color: '#10B981', borderRadius: [4, 4, 0, 0] },
            },
          ],
        };
      }

      case 'jobFlow': {
        return {
          tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} orders ({d}%)',
          },
          legend: {
            orient: 'horizontal',
            bottom: 10,
          },
          series: [
            {
              name: 'Job Status',
              type: 'pie',
              radius: ['45%', '70%'],
              center: ['50%', '45%'],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 8,
                borderColor: '#07080A',
                borderWidth: 3,
              },
              label: {
                show: true,
                formatter: '{b}\n{c} ({d}%)',
                color: '#94A3B8',
                fontSize: 11,
              },
              data: analyticsData.jobFlow.statusDonut,
            },
          ],
        };
      }

      case 'turnaround': {
        return {
          tooltip: {
            formatter: '{a} <br/>{b} : {c} Days',
          },
          series: [
            {
              name: 'Cycle Speed',
              type: 'gauge',
              center: ['50%', '55%'],
              radius: '85%',
              min: 0,
              max: 6,
              splitNumber: 6,
              axisLine: {
                lineStyle: {
                  width: 16,
                  color: [
                    [0.25, '#10B981'],
                    [0.6, '#FBBF24'],
                    [1, '#F43F5E'],
                  ],
                },
              },
              pointer: {
                itemStyle: { color: '#F8FAFC' },
                width: 6,
                length: '60%',
              },
              axisTick: { distance: -16, length: 6, lineStyle: { color: '#fff', width: 1 } },
              splitLine: { distance: -20, length: 12, lineStyle: { color: '#fff', width: 2 } },
              axisLabel: { color: '#94A3B8', distance: 22, fontSize: 11 },
              detail: {
                valueAnimation: true,
                formatter: '{value} Days',
                color: '#F8FAFC',
                fontSize: 22,
                offsetCenter: [0, '60%'],
              },
              data: [{ value: analyticsData.turnaround.avgDays, name: 'Avg Duration' }],
            },
          ],
        };
      }

      case 'technicians': {
        const list = analyticsData.technicians.list.slice(0, 6);
        const names = list.map((t) => t.name.split(' ')[0]);
        const completed = list.map((t) => t.completed);
        const labor = list.map((t) => t.laborRevenue);

        return {
          tooltip: { trigger: 'axis' },
          legend: { data: ['Jobs Completed', 'Labor Revenue (₹)'] },
          grid: { top: 35, right: 16, bottom: 25, left: 16, containLabel: true },
          xAxis: { type: 'category', data: names },
          yAxis: [
            { type: 'value', name: 'Jobs' },
            {
              type: 'value',
              name: 'Revenue',
              axisLabel: { formatter: '₹{value}' },
            },
          ],
          series: [
            {
              name: 'Jobs Completed',
              type: 'bar',
              data: completed,
              itemStyle: { color: '#10B981', borderRadius: [4, 4, 0, 0] },
            },
            {
              name: 'Labor Revenue (₹)',
              type: 'line',
              yAxisIndex: 1,
              data: labor,
              itemStyle: { color: '#3B82F6' },
              lineStyle: { width: 3 },
            },
          ],
        };
      }

      case 'inventory': {
        const topParts = analyticsData.inventory.topParts.slice(0, 7);
        const names = topParts.map((p) => p.name);
        const values = topParts.map((p) => p.value);

        return {
          tooltip: { trigger: 'axis' },
          grid: { top: 20, right: 16, bottom: 20, left: 110, containLabel: false },
          xAxis: { type: 'value', show: false },
          yAxis: {
            type: 'category',
            data: names.reverse(),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#94A3B8', fontSize: 11 },
          },
          series: [
            {
              name: 'Billed Value',
              type: 'bar',
              data: values.reverse(),
              itemStyle: { color: '#F59E0B', borderRadius: [0, 6, 6, 0] },
            },
          ],
        };
      }

      case 'fleet': {
        const brands = analyticsData.fleet.brands.slice(0, 7);
        return {
          tooltip: { trigger: 'item', formatter: '{b}: {c} vehicles ({d}%)' },
          legend: { bottom: 6 },
          series: [
            {
              name: 'Car Makes',
              type: 'pie',
              radius: ['20%', '75%'],
              center: ['50%', '45%'],
              roseType: 'radius',
              itemStyle: { borderRadius: 6, borderColor: '#07080A', borderWidth: 2 },
              label: { color: '#94A3B8', fontSize: 11 },
              data: brands.map((b) => ({ name: b.name, value: b.count })),
            },
          ],
        };
      }

      case 'retention': {
        return {
          tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
          legend: { bottom: 10 },
          series: [
            {
              name: 'Customers',
              type: 'pie',
              radius: ['50%', '75%'],
              center: ['50%', '45%'],
              itemStyle: { borderRadius: 8, borderColor: '#07080A', borderWidth: 2 },
              label: { show: true, formatter: '{b}\n{c} ({d}%)', color: '#94A3B8' },
              data: [
                {
                  name: 'Repeat Customers',
                  value: analyticsData.customers.returningCustomers,
                  itemStyle: { color: '#8B5CF6' },
                },
                {
                  name: 'New Customers',
                  value: analyticsData.customers.newCustomers,
                  itemStyle: { color: '#06B6D4' },
                },
              ],
            },
          ],
        };
      }

      case 'workload': {
        return {
          tooltip: { trigger: 'axis' },
          grid: { top: 25, right: 16, bottom: 25, left: 16, containLabel: true },
          xAxis: {
            type: 'category',
            data: analyticsData.workload.days,
          },
          yAxis: { type: 'value' },
          series: [
            {
              name: 'Arrivals',
              type: 'bar',
              barWidth: 28,
              data: analyticsData.workload.counts.map((c, i) => ({
                value: c,
                itemStyle: {
                  color: analyticsData.workload.days[i] === analyticsData.workload.peakDay ? '#F43F5E' : '#06B6D4',
                  borderRadius: [6, 6, 0, 0],
                },
              })),
            },
          ],
        };
      }

      default:
        return {};
    }
  }, [activeCard, analyticsData]);

  // Card Metadata
  const meta = {
    revenue: {
      title: 'Revenue & Billing Breakdown',
      subtitle: 'Invoicing trends, labor vs. parts split & average repair order',
      icon: DollarSign,
      color: 'text-status-success',
    },
    jobFlow: {
      title: 'Job Flow & Bay Throughput',
      subtitle: 'Work order lifecycle progression & overdue bay tracking',
      icon: ClipboardList,
      color: 'text-cyan-400',
    },
    turnaround: {
      title: 'Turnaround & Velocity',
      subtitle: 'Intake to customer handover cycle times & on-time compliance',
      icon: Clock,
      color: 'text-amber-400',
    },
    technicians: {
      title: 'Advisor & Technician Productivity',
      subtitle: 'Individual job completions, active bay loads & labor revenue',
      icon: Wrench,
      color: 'text-blue-400',
    },
    inventory: {
      title: 'Parts & Stock Velocity',
      subtitle: 'Spare parts usage, high-frequency consumables & reorder risks',
      icon: Package,
      color: 'text-amber-500',
    },
    fleet: {
      title: 'Fleet & Brand Distribution',
      subtitle: 'Manufacturer market share & repeat vehicle loyalty',
      icon: Car,
      color: 'text-indigo-400',
    },
    retention: {
      title: 'Customer Retention & Loyalty',
      subtitle: 'Returning customer rates and workshop customer lifetime value',
      icon: Users,
      color: 'text-purple-400',
    },
    workload: {
      title: 'Intake & Peak Workload Schedule',
      subtitle: 'Day-of-week drop-offs for technician scheduling & bay capacity',
      icon: Calendar,
      color: 'text-rose-400',
    },
  }[activeCard || 'revenue'];

  const Icon = meta.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-2xl h-full bg-workshop-surface border-l border-workshop-border shadow-2xl flex flex-col z-10 font-sans"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-workshop-border flex items-center justify-between gap-4 bg-workshop-card/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-workshop-card shrink-0", meta.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-black font-google-sans uppercase text-workshop-text tracking-tight truncate">
                    {meta.title}
                  </h2>
                  <p className="text-xs text-workshop-muted truncate">
                    {meta.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg bg-workshop-card hover:bg-workshop-border/60 text-workshop-text text-xs font-bold flex items-center gap-1.5 border border-workshop-border transition-colors cursor-pointer"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-workshop-accent" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-workshop-muted hover:text-workshop-text rounded-lg hover:bg-workshop-card transition-colors cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body with Chart & Insights */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Primary Visual Chart */}
              <div className="bg-workshop-card border border-workshop-border/50 rounded-2xl p-4 md:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-workshop-text flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-workshop-accent" />
                    <span>Interactive Analysis</span>
                  </span>
                  <span className="text-[10px] text-workshop-muted uppercase tracking-wider font-bold">
                    Powered by Apache ECharts
                  </span>
                </div>

                <div className="w-full h-72 md:h-80 pt-2">
                  <EChartsReact option={detailChartOption} className="w-full h-full" />
                </div>
              </div>

              {/* Specific Domain Breakdowns */}
              {activeCard === 'revenue' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-workshop-card p-4 rounded-xl border border-workshop-border/40">
                    <p className="text-[10px] font-bold uppercase text-workshop-muted">Total Invoiced</p>
                    <p className="text-lg font-black font-google-sans text-status-success mt-0.5">
                      {formatCurrency(analyticsData.revenue.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-workshop-card p-4 rounded-xl border border-workshop-border/40">
                    <p className="text-[10px] font-bold uppercase text-workshop-muted">Labor Charges</p>
                    <p className="text-lg font-black font-google-sans text-blue-400 mt-0.5">
                      {formatCurrency(analyticsData.revenue.laborRevenue)}
                    </p>
                  </div>
                  <div className="bg-workshop-card p-4 rounded-xl border border-workshop-border/40 col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase text-workshop-muted">Parts Invoiced</p>
                    <p className="text-lg font-black font-google-sans text-amber-400 mt-0.5">
                      {formatCurrency(analyticsData.revenue.partsRevenue)}
                    </p>
                  </div>
                </div>
              )}

              {activeCard === 'technicians' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-workshop-muted tracking-wider">
                    Technician Leaderboard
                  </h4>
                  <div className="divide-y divide-workshop-border/30 border border-workshop-border/40 rounded-xl overflow-hidden bg-workshop-card">
                    {analyticsData.technicians.list.map((tech, idx) => (
                      <div key={tech.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-center font-bold text-workshop-muted text-[11px]">#{idx + 1}</span>
                          <div>
                            <p className="font-bold text-workshop-text">{tech.name}</p>
                            <p className="text-[10px] text-workshop-muted font-numeric">
                              {tech.completed} completed • {tech.active} active
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-numeric font-bold">
                          <p className="text-workshop-accent">{formatCurrency(tech.laborRevenue)}</p>
                          <p className="text-[10px] text-workshop-muted font-normal">{tech.completionRate}% completion</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeCard === 'inventory' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-workshop-muted tracking-wider">
                    Fastest Moving Spares
                  </h4>
                  <div className="divide-y divide-workshop-border/30 border border-workshop-border/40 rounded-xl overflow-hidden bg-workshop-card">
                    {analyticsData.inventory.topParts.map((part) => (
                      <div key={part.name} className="p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-workshop-text">{part.name}</p>
                          <p className="text-[10px] text-workshop-muted">{part.quantity} units dispatched</p>
                        </div>
                        <p className="font-bold text-amber-400 font-numeric">{formatCurrency(part.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeCard === 'fleet' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-workshop-muted tracking-wider">
                    Top Vehicle Makes Serviced
                  </h4>
                  <div className="divide-y divide-workshop-border/30 border border-workshop-border/40 rounded-xl overflow-hidden bg-workshop-card">
                    {analyticsData.fleet.brands.map((brand) => (
                      <div key={brand.name} className="p-3.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-workshop-text">{brand.name}</span>
                        <div className="text-right font-numeric">
                          <span className="font-bold text-indigo-400">{brand.count} cars</span>
                          <span className="text-workshop-muted text-[10px] ml-2">({brand.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
