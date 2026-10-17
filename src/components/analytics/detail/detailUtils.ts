import {
  DollarSign,
  ClipboardList,
  Clock,
  Wrench,
  Package,
  Car,
  Users,
  Calendar,
  Layers,
  Receipt,
  Gauge,
  Crown,
  type LucideIcon,
} from 'lucide-react';
import type { useAnalytics } from '../../../hooks/useAnalytics';
import type { CardKey } from './types';

export type MetricDomain = 'financial' | 'operations' | 'inventory' | 'fleet_clients';

export interface MetricMeta {
  title: string;
  categoryLabel: string;
  domain: MetricDomain;
  icon: LucideIcon;
  color: string;
  badgeBg: string;
  description: string;
}

export const METRIC_METAS: Record<CardKey, MetricMeta> = {
  revenue: {
    title: 'Revenue & Invoicing',
    categoryLabel: 'Financials',
    domain: 'financial',
    icon: DollarSign,
    color: 'text-status-success',
    badgeBg: 'bg-status-success/15 text-status-success border-status-success/30',
    description: 'Income breakdown, billing trends, and labor vs parts split',
  },
  jobFlow: {
    title: 'Job Flow & Bay WIP',
    categoryLabel: 'Operations',
    domain: 'operations',
    icon: ClipboardList,
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    description: 'Active bay queue, completion rate, and throughput distribution',
  },
  turnaround: {
    title: 'Turnaround Velocity',
    categoryLabel: 'Operations',
    domain: 'operations',
    icon: Clock,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    description: 'Repair order cycle durations, express jobs, and on-time delivery rate',
  },
  technicians: {
    title: 'Advisor & Tech Output',
    categoryLabel: 'Operations',
    domain: 'operations',
    icon: Wrench,
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    description: 'Individual advisor job volume, completion rate, and labor revenue generated',
  },
  inventory: {
    title: 'Parts & Stock Velocity',
    categoryLabel: 'Inventory',
    domain: 'inventory',
    icon: Package,
    color: 'text-amber-500',
    badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    description: 'High-movement spare parts, billed inventory values, and low-stock alerts',
  },
  fleet: {
    title: 'Fleet & Brand Share',
    categoryLabel: 'Fleet & Clients',
    domain: 'fleet_clients',
    icon: Car,
    color: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    description: 'Vehicle manufacturer distribution, customer repeat rates, and fleet diversity',
  },
  retention: {
    title: 'Customer Retention',
    categoryLabel: 'Fleet & Clients',
    domain: 'fleet_clients',
    icon: Users,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    description: 'Returning vs new customer split and loyalty visit frequencies',
  },
  workload: {
    title: 'Intake Schedule',
    categoryLabel: 'Operations',
    domain: 'operations',
    icon: Calendar,
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    description: 'Day-of-week arrival volume patterns and peak workshop intake hours',
  },
  categories: {
    title: 'Service Categories',
    categoryLabel: 'Operations',
    domain: 'operations',
    icon: Layers,
    color: 'text-teal-400',
    badgeBg: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    description: 'Service mix breakdown, top revenue categories, and ticket values',
  },
  ticketTiers: {
    title: 'Invoice Value Tiers',
    categoryLabel: 'Financials',
    domain: 'financial',
    icon: Receipt,
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    description: 'Spread across economy, standard, high-value, and premium repair orders',
  },
  vehicleHealth: {
    title: 'Vehicle Health & Mileage',
    categoryLabel: 'Fleet & Clients',
    domain: 'fleet_clients',
    icon: Gauge,
    color: 'text-sky-400',
    badgeBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    description: 'Odometer distribution, tow-in/breakdown rate, and km traveled between visits',
  },
  clientSpend: {
    title: 'VIP Clients & Spend',
    categoryLabel: 'Fleet & Clients',
    domain: 'fleet_clients',
    icon: Crown,
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    description: 'Top lifetime value client ranking, average spend per visit, and revenue concentration',
  },
};

export const DOMAIN_FILTERS: Array<{ id: MetricDomain | 'all'; label: string; count: number }> = [
  { id: 'all', label: 'All Metrics', count: 12 },
  { id: 'financial', label: 'Financials', count: 2 },
  { id: 'operations', label: 'Operations', count: 5 },
  { id: 'inventory', label: 'Inventory', count: 1 },
  { id: 'fleet_clients', label: 'Fleet & Clients', count: 4 },
];

export function exportMetricCSV(
  activeCard: CardKey,
  analyticsData: ReturnType<typeof useAnalytics>
) {
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
  } else if (activeCard === 'categories') {
    csvContent += 'Category,Jobs Count,Share (%),Total Revenue (INR),Avg Ticket (INR)\n';
    analyticsData.categories.categories.forEach((c) => {
      csvContent += `"${c.name}",${c.count},${c.percentage},${c.revenue},${c.avgTicket}\n`;
    });
  } else if (activeCard === 'ticketTiers') {
    csvContent += 'Tier,Range,Invoices Count,Share (%),Total Revenue (INR),Avg Ticket (INR)\n';
    analyticsData.invoiceTiers.tiers.forEach((t) => {
      csvContent += `"${t.name}","${t.range}",${t.count},${t.percentage},${t.totalRevenue},${t.avgTicket}\n`;
    });
  } else if (activeCard === 'vehicleHealth') {
    csvContent += 'Mileage Bracket,Range,Vehicles Count,Share (%)\n';
    analyticsData.vehicleHealth.mileageBrackets.forEach((b) => {
      csvContent += `"${b.bracket}","${b.rangeLabel}",${b.count},${b.percentage}\n`;
    });
    csvContent += `\n"Average Mileage",${analyticsData.vehicleHealth.avgMileage}\n`;
    csvContent += `"Dead/Breakdown Intakes",${analyticsData.vehicleHealth.deadVehicleCount}\n`;
    csvContent += `"Tow-in Rate (%)",${analyticsData.vehicleHealth.deadVehicleRate}%\n`;
  } else if (activeCard === 'clientSpend') {
    csvContent += 'Rank,Customer Name,Phone,Visits Count,Total Invoiced (INR),Avg Spend per Visit (INR),Last Visit\n';
    analyticsData.topClients.topClients.forEach((c, idx) => {
      csvContent += `${idx + 1},"${c.name}","${c.phone}",${c.visitsCount},${c.totalSpent},${c.avgSpend},"${c.lastVisitDate}"\n`;
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
}

export function getDetailChartOption(
  activeCard: CardKey,
  analyticsData: ReturnType<typeof useAnalytics>
) {
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
          textStyle: { color: '#94A3B8' },
        },
        grid: {
          top: 40,
          right: 12,
          bottom: dates.length > 10 ? 60 : 12,
          left: 12,
          containLabel: true,
        },
        // Few points (e.g. 7D): zoom/pan only makes the chart slide around
        dataZoom:
          dates.length > 10
            ? [
                { type: 'inside', start: 0, end: 100 },
                { type: 'slider', bottom: 10, height: 18 },
              ]
            : [],
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: { color: '#94A3B8' },
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            color: '#94A3B8',
            formatter: (val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`,
          },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
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
          bottom: 6,
          textStyle: { color: '#94A3B8' },
        },
        series: [
          {
            name: 'Job Status',
            type: 'pie',
            radius: ['45%', '72%'],
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
                width: 14,
                color: [
                  [0.25, '#10B981'],
                  [0.6, '#FBBF24'],
                  [1, '#F43F5E'],
                ],
              },
            },
            pointer: {
              itemStyle: { color: '#F8FAFC' },
              width: 5,
              length: '60%',
            },
            axisTick: { distance: -14, length: 5, lineStyle: { color: '#fff', width: 1 } },
            splitLine: { distance: -18, length: 10, lineStyle: { color: '#fff', width: 2 } },
            axisLabel: { color: '#94A3B8', distance: 20, fontSize: 10 },
            detail: {
              valueAnimation: true,
              formatter: '{value} Days',
              color: '#F8FAFC',
              fontSize: 20,
              offsetCenter: [0, '60%'],
            },
            data: [{ value: analyticsData.turnaround.avgDays, name: 'Avg Duration' }],
          },
        ],
      };
    }

    case 'technicians': {
      const list = analyticsData.technicians.list.slice(0, 8);
      const names = list.map((t) => t.name.split(' ')[0]);
      const completed = list.map((t) => t.completed);
      const labor = list.map((t) => t.laborRevenue);

      return {
        tooltip: { trigger: 'axis' },
        legend: {
          data: ['Jobs Completed', 'Labor Revenue (₹)'],
          top: 0,
          textStyle: { color: '#94A3B8' },
        },
        grid: { top: 32, right: 12, bottom: 20, left: 12, containLabel: true },
        xAxis: { type: 'category', data: names, axisLabel: { color: '#94A3B8' } },
        yAxis: [
          {
            type: 'value',
            name: 'Jobs',
            axisLabel: { color: '#94A3B8' },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
          },
          {
            type: 'value',
            name: 'Revenue',
            axisLabel: {
              color: '#94A3B8',
              formatter: (v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`,
            },
            splitLine: { show: false },
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
            smooth: 0.3,
            smoothMonotone: 'x',
            data: labor,
            itemStyle: { color: '#3B82F6' },
            lineStyle: { width: 3 },
          },
        ],
      };
    }

    case 'inventory': {
      const topParts = analyticsData.inventory.topParts.slice(0, 8);
      const names = topParts.map((p) => p.name);
      const values = topParts.map((p) => p.value);

      return {
        tooltip: { trigger: 'axis' },
        grid: { top: 16, right: 16, bottom: 16, left: 120, containLabel: false },
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
      const brands = analyticsData.fleet.brands.slice(0, 8);
      return {
        tooltip: { trigger: 'item', formatter: '{b}: {c} vehicles ({d}%)' },
        legend: { bottom: 6, textStyle: { color: '#94A3B8' } },
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
        legend: { bottom: 8, textStyle: { color: '#94A3B8' } },
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
        grid: { top: 20, right: 12, bottom: 20, left: 12, containLabel: true },
        xAxis: {
          type: 'category',
          data: analyticsData.workload.days,
          axisLabel: { color: '#94A3B8' },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#94A3B8' },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        },
        series: [
          {
            name: 'Arrivals',
            type: 'bar',
            barWidth: 26,
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

    case 'categories': {
      const top = analyticsData.categories.categories.slice(0, 8);
      return {
        tooltip: { trigger: 'item', formatter: '{b}: {c} jobs ({d}%)' },
        legend: { orient: 'horizontal', bottom: 6, textStyle: { color: '#94A3B8' } },
        series: [
          {
            name: 'Service Categories',
            type: 'pie',
            radius: ['35%', '70%'],
            center: ['50%', '45%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#07080A', borderWidth: 2 },
            label: { show: true, formatter: '{b}\n{c} ({d}%)', color: '#94A3B8', fontSize: 11 },
            data: top.map((c) => ({ name: c.name, value: c.count })),
          },
        ],
      };
    }

    case 'ticketTiers': {
      const tiers = analyticsData.invoiceTiers.tiers;
      return {
        tooltip: {
          trigger: 'axis',
          formatter: (params: unknown) => {
            const item = (Array.isArray(params) ? params[0] : params) as { dataIndex: number } | undefined;
            if (!item) return '';
            const tier = tiers[item.dataIndex];
            if (!tier) return '';
            return `${tier.name} (${tier.range})<br/>Orders: <b>${tier.count}</b> (${tier.percentage}%)<br/>Revenue: <b>₹${tier.totalRevenue.toLocaleString()}</b>`;
          },
        },
        grid: { top: 30, right: 12, bottom: 30, left: 12, containLabel: true },
        xAxis: {
          type: 'category',
          data: tiers.map((t) => t.label),
          axisLabel: { color: '#94A3B8' },
        },
        yAxis: [
          {
            type: 'value',
            name: 'Orders',
            axisLabel: { color: '#94A3B8' },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
          },
          {
            type: 'value',
            name: 'Revenue',
            axisLabel: {
              color: '#94A3B8',
              formatter: (v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`,
            },
            splitLine: { show: false },
          },
        ],
        series: [
          {
            name: 'Orders',
            type: 'bar',
            data: tiers.map((t) => ({ value: t.count, itemStyle: { color: t.color, borderRadius: [4, 4, 0, 0] } })),
          },
          {
            name: 'Revenue (₹)',
            type: 'line',
            yAxisIndex: 1,
            smooth: 0.3,
            smoothMonotone: 'x',
            data: tiers.map((t) => t.totalRevenue),
            itemStyle: { color: '#10B981' },
            lineStyle: { width: 3 },
          },
        ],
      };
    }

    case 'vehicleHealth': {
      const brackets = analyticsData.vehicleHealth.mileageBrackets;
      const colors = ['#38BDF8', '#34D399', '#FBBF24', '#F43F5E'];
      return {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} vehicles ({d}%)',
        },
        legend: { bottom: 6, textStyle: { color: '#94A3B8' } },
        series: [
          {
            name: 'Mileage Brackets',
            type: 'pie',
            radius: ['35%', '70%'],
            center: ['50%', '45%'],
            itemStyle: { borderRadius: 6, borderColor: '#07080A', borderWidth: 2 },
            label: { show: true, formatter: '{b}\n{c} ({d}%)', color: '#94A3B8', fontSize: 11 },
            data: brackets.map((b, i) => ({
              name: b.bracket,
              value: b.count,
              itemStyle: { color: colors[i % colors.length] },
            })),
          },
        ],
      };
    }

    case 'clientSpend': {
      const top = analyticsData.topClients.topClients.slice(0, 8);
      return {
        tooltip: {
          trigger: 'axis',
          formatter: (params: unknown) => {
            const item = (Array.isArray(params) ? params[0] : params) as { dataIndex: number } | undefined;
            if (!item) return '';
            const client = top[top.length - 1 - item.dataIndex];
            if (!client) return '';
            return `${client.name}<br/>Total Spent: <b>₹${client.totalSpent.toLocaleString()}</b><br/>Visits: <b>${client.visitsCount}</b> (Avg ₹${client.avgSpend.toLocaleString()})`;
          },
        },
        grid: { top: 16, right: 16, bottom: 16, left: 120, containLabel: false },
        xAxis: {
          type: 'value',
          axisLabel: {
            color: '#94A3B8',
            formatter: (v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`,
          },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        },
        yAxis: {
          type: 'category',
          data: top.map((c) => (c.name.length > 14 ? c.name.slice(0, 13) + '…' : c.name)).reverse(),
          axisLabel: { color: '#94A3B8', fontSize: 11 },
        },
        series: [
          {
            name: 'Spend (₹)',
            type: 'bar',
            data: top.map((c) => c.totalSpent).reverse(),
            itemStyle: { color: '#F43F5E', borderRadius: [0, 6, 6, 0] },
          },
        ],
      };
    }

    default:
      return {};
  }
}
