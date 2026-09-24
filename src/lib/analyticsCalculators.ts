import {
  subDays,
  startOfMonth,
  startOfYear,
  format,
  differenceInCalendarDays,
  differenceInHours,
} from 'date-fns';
import type { ServiceRecord, Vehicle, Part, WorkshopUser } from '../types';
import { parseDateSafe } from './utils';

export type TimeRangeKey = 'today' | '7d' | '30d' | 'thisMonth' | 'thisYear' | 'all' | 'custom';

export interface TimelineDataPoint {
  date: string;
  label: string;
  total: number;
  labor: number;
  parts: number;
  jobsCount: number;
}

export interface TechMetric {
  id: string;
  name: string;
  completed: number;
  active: number;
  total: number;
  laborRevenue: number;
  totalRevenue: number;
  completionRate: number;
}

export interface PartUsageMetric {
  name: string;
  quantity: number;
  value: number;
  category: string;
}

export interface BrandShareMetric {
  name: string;
  count: number;
  percentage: number;
}

export interface DateInterval {
  start: Date;
  end: Date;
}

/**
 * Calculates current and previous intervals for analytics time range
 */
export function calculateAnalyticsInterval(
  timeRange: TimeRangeKey,
  customStart?: Date | null,
  customEnd?: Date | null
): { currentInterval: DateInterval; previousInterval: DateInterval } {
  const now = new Date();
  const end = now;
  let start = subDays(now, 30);

  if (timeRange === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeRange === '7d') {
    start = subDays(now, 7);
  } else if (timeRange === '30d') {
    start = subDays(now, 30);
  } else if (timeRange === 'thisMonth') {
    start = startOfMonth(now);
  } else if (timeRange === 'thisYear') {
    start = startOfYear(now);
  } else if (timeRange === 'custom' && customStart && customEnd) {
    start = customStart;
    return {
      currentInterval: { start, end: customEnd },
      previousInterval: {
        start: subDays(start, Math.max(1, differenceInCalendarDays(customEnd, start))),
        end: start,
      },
    };
  } else if (timeRange === 'all') {
    start = new Date(2020, 0, 1);
  }

  const durationDays = Math.max(1, differenceInCalendarDays(end, start));
  const prevStart = subDays(start, durationDays);
  const prevEnd = start;

  return {
    currentInterval: { start, end },
    previousInterval: { start: prevStart, end: prevEnd },
  };
}

/**
 * Calculates revenue metrics including total, labor, parts, average ticket, growth, and timeline
 */
export function calculateRevenueMetrics(
  currentRecords: ServiceRecord[],
  previousRecords: ServiceRecord[]
) {
  let currentTotal = 0;
  let currentLabor = 0;
  let currentParts = 0;
  let completedCount = 0;

  currentRecords.forEach((r) => {
    if (r.status === 'completed') {
      const total = Number(r.totalCost || 0);
      const labor = Number(r.laborCost || 0);
      const partsCost = Number(r.partsCost || 0);
      currentTotal += total;
      currentLabor += labor;
      currentParts += partsCost;
      completedCount++;
    }
  });

  let prevTotal = 0;
  previousRecords.forEach((r) => {
    if (r.status === 'completed') {
      prevTotal += Number(r.totalCost || 0);
    }
  });

  const growth = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0;
  const avgTicket = completedCount > 0 ? Math.round(currentTotal / completedCount) : 0;

  // Build timeline points
  const dateMap = new Map<string, { total: number; labor: number; parts: number; jobs: number }>();
  currentRecords.forEach((r) => {
    const dateStr = r.date ? r.date.split('T')[0] : '';
    if (!dateStr) return;

    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { total: 0, labor: 0, parts: 0, jobs: 0 });
    }
    const entry = dateMap.get(dateStr)!;
    entry.jobs++;
    if (r.status === 'completed') {
      entry.total += Number(r.totalCost || 0);
      entry.labor += Number(r.laborCost || 0);
      entry.parts += Number(r.partsCost || 0);
    }
  });

  const sortedDates = Array.from(dateMap.keys()).sort();
  const timeline: TimelineDataPoint[] = sortedDates.map((dateStr) => {
    const data = dateMap.get(dateStr)!;
    const parsed = parseDateSafe(dateStr);
    return {
      date: dateStr,
      label: parsed ? format(parsed, 'dd MMM') : dateStr,
      total: data.total,
      labor: data.labor,
      parts: data.parts,
      jobsCount: data.jobs,
    };
  });

  return {
    totalRevenue: currentTotal,
    laborRevenue: currentLabor,
    partsRevenue: currentParts,
    avgTicket,
    growth,
    timeline,
    laborShare: currentTotal > 0 ? Math.round((currentLabor / currentTotal) * 100) : 0,
    partsShare: currentTotal > 0 ? Math.round((currentParts / currentTotal) * 100) : 0,
  };
}

/**
 * Calculates job flow statuses, completion rate, overdue counts, and donut data
 */
export function calculateJobFlowMetrics(currentRecords: ServiceRecord[]) {
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let cancelled = 0;
  let overdueCount = 0;

  const now = new Date();

  currentRecords.forEach((r) => {
    if (r.status === 'completed') completed++;
    else if (r.status === 'in-progress') inProgress++;
    else if (r.status === 'pending') pending++;
    else if (r.status === 'cancelled') cancelled++;

    if (r.status === 'pending' || r.status === 'in-progress') {
      if (r.expectedDeliveryDate) {
        const expDate = parseDateSafe(r.expectedDeliveryDate);
        if (expDate && expDate < now) {
          overdueCount++;
        }
      }
    }
  });

  const total = currentRecords.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const activeJobs = inProgress + pending;

  const statusDonut = [
    { name: 'Completed', value: completed, itemStyle: { color: '#10B981' } },
    { name: 'In-Progress', value: inProgress, itemStyle: { color: '#06B6D4' } },
    { name: 'Pending', value: pending, itemStyle: { color: '#FBBF24' } },
    { name: 'Cancelled', value: cancelled, itemStyle: { color: '#64748B' } },
  ].filter((item) => item.value > 0);

  return {
    total,
    completed,
    inProgress,
    pending,
    cancelled,
    activeJobs,
    completionRate,
    overdueCount,
    statusDonut,
  };
}

/**
 * Calculates turnaround duration, on-time percentage, express and long-stay jobs
 */
export function calculateTurnaroundMetrics(currentRecords: ServiceRecord[]) {
  const durations: number[] = [];
  let onTimeCount = 0;
  let totalWithDeadline = 0;
  let expressCount = 0;
  let longStayCount = 0;

  currentRecords.forEach((r) => {
    if (r.status === 'completed') {
      const intakeDate = parseDateSafe(r.date);
      let completionDate: Date | null = null;

      if (r.updatedAt && typeof (r.updatedAt as { toDate?: () => Date }).toDate === 'function') {
        completionDate = (r.updatedAt as { toDate: () => Date }).toDate();
      } else if (r.expectedDeliveryDate) {
        completionDate = parseDateSafe(r.expectedDeliveryDate);
      }

      if (intakeDate && completionDate) {
        const hours = Math.max(1, differenceInHours(completionDate, intakeDate));
        durations.push(hours);
        if (hours <= 24) expressCount++;
        if (hours >= 72) longStayCount++;
      }

      if (r.expectedDeliveryDate) {
        totalWithDeadline++;
        const deadline = parseDateSafe(r.expectedDeliveryDate);
        if (deadline && completionDate && completionDate <= deadline) {
          onTimeCount++;
        }
      }
    }
  });

  const avgHours = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 24;
  const avgDays = Number((avgHours / 24).toFixed(1));
  const onTimeRate = totalWithDeadline > 0
    ? Math.round((onTimeCount / totalWithDeadline) * 100)
    : 92;

  return {
    avgHours,
    avgDays,
    onTimeRate,
    expressCount,
    longStayCount,
  };
}

/**
 * Calculates technician performance, labor revenue generated, and completion rates
 */
export function calculateTechnicianMetrics(
  users: WorkshopUser[],
  currentRecords: ServiceRecord[]
) {
  const techMap = new Map<string, TechMetric>();

  users.forEach((u) => {
    techMap.set(u.id, {
      id: u.id,
      name: u.name || 'Unnamed Advisor',
      completed: 0,
      active: 0,
      total: 0,
      laborRevenue: 0,
      totalRevenue: 0,
      completionRate: 0,
    });
  });

  currentRecords.forEach((r) => {
    let key = r.technicianId;
    const techName = r.technicianName;
    if (!key && techName) key = techName;
    else if (!key && !techName) key = 'unassigned';

    if (!techMap.has(key)) {
      techMap.set(key, {
        id: key,
        name: techName || (key === 'unassigned' ? 'Unassigned' : 'Unknown Advisor'),
        completed: 0,
        active: 0,
        total: 0,
        laborRevenue: 0,
        totalRevenue: 0,
        completionRate: 0,
      });
    }

    const item = techMap.get(key)!;
    item.total++;
    if (r.status === 'completed') {
      item.completed++;
      item.laborRevenue += Number(r.laborCost || 0);
      item.totalRevenue += Number(r.totalCost || 0);
    } else if (r.status === 'in-progress' || r.status === 'pending') {
      item.active++;
    }
  });

  const list = Array.from(techMap.values())
    .filter((t) => t.total > 0)
    .map((t) => ({
      ...t,
      completionRate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
    }))
    .sort((a, b) => b.completed - a.completed);

  const topTech = list[0] || null;

  return {
    list,
    topTech,
    totalAdvisors: list.length,
  };
}

/**
 * Calculates parts consumption, dispatched quantity, low stock items, and category value
 */
export function calculateInventoryMetrics(
  parts: Part[],
  currentRecords: ServiceRecord[]
) {
  const usageMap = new Map<string, PartUsageMetric>();
  let totalBilled = 0;
  let totalItemsDispatched = 0;

  currentRecords.forEach((r) => {
    if (Array.isArray(r.partsUsed)) {
      r.partsUsed.forEach((part) => {
        const qty = Number(part.quantity || 0);
        const price = Number(part.unitPrice || 0);
        const itemVal = qty * price;

        totalBilled += itemVal;
        totalItemsDispatched += qty;

        const partName = part.name || 'Generic Part';
        if (!usageMap.has(partName)) {
          usageMap.set(partName, {
            name: partName,
            quantity: 0,
            value: 0,
            category: 'General',
          });
        }
        const entry = usageMap.get(partName)!;
        entry.quantity += qty;
        entry.value += itemVal;
      });
    }
  });

  const topParts = Array.from(usageMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const lowStockItems = parts.filter((p) => p.stockQuantity <= (p.minStockLevel || 5));

  const categoryMap = new Map<string, number>();
  parts.forEach((p) => {
    const cat = p.category || 'General';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (p.stockQuantity * p.price));
  });

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  return {
    totalBilled,
    totalItemsDispatched,
    topParts,
    lowStockCount: lowStockItems.length,
    lowStockItems,
    categoryBreakdown,
  };
}

/**
 * Calculates fleet brand share distribution and repeat vehicle visit rate
 */
export function calculateFleetMetrics(
  currentRecords: ServiceRecord[],
  vehicleMap: Map<string, Vehicle>
) {
  const brandCount = new Map<string, number>();
  const vehicleVisits = new Map<string, number>();

  currentRecords.forEach((r) => {
    if (r.vehicleId) {
      vehicleVisits.set(r.vehicleId, (vehicleVisits.get(r.vehicleId) || 0) + 1);
      const vehicle = vehicleMap.get(r.vehicleId);
      const make = vehicle?.make?.trim() || 'Other';
      const normalizedMake = make.charAt(0).toUpperCase() + make.slice(1).toLowerCase();
      brandCount.set(normalizedMake, (brandCount.get(normalizedMake) || 0) + 1);
    }
  });

  const totalVehiclesServiced = Array.from(vehicleVisits.keys()).length;
  let repeatCount = 0;
  vehicleVisits.forEach((count) => {
    if (count > 1) repeatCount++;
  });

  const repeatRate = totalVehiclesServiced > 0
    ? Math.round((repeatCount / totalVehiclesServiced) * 100)
    : 0;

  const brands: BrandShareMetric[] = Array.from(brandCount.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalVehiclesServiced > 0 ? Math.round((count / currentRecords.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalVehiclesServiced,
    repeatRate,
    brands,
    topBrand: brands[0] || { name: 'None', count: 0, percentage: 0 },
  };
}

/**
 * Calculates unique customers, repeat customer return rate
 */
export function calculateCustomerMetrics(currentRecords: ServiceRecord[]) {
  const customerVisits = new Map<string, number>();

  currentRecords.forEach((r) => {
    if (r.customerId) {
      customerVisits.set(r.customerId, (customerVisits.get(r.customerId) || 0) + 1);
    }
  });

  const uniqueCustomers = customerVisits.size;
  let returning = 0;
  customerVisits.forEach((count) => {
    if (count > 1) returning++;
  });

  const repeatPercent = uniqueCustomers > 0
    ? Math.round((returning / uniqueCustomers) * 100)
    : 0;

  return {
    uniqueCustomers,
    returningCustomers: returning,
    newCustomers: uniqueCustomers - returning,
    repeatPercent,
  };
}

/**
 * Calculates day of week distribution and peak workload day
 */
export function calculateWorkloadMetrics(currentRecords: ServiceRecord[]) {
  const counts = [0, 0, 0, 0, 0, 0, 0];

  currentRecords.forEach((r) => {
    const parsed = parseDateSafe(r.date);
    if (parsed) {
      const dayIdx = parsed.getDay();
      counts[dayIdx]++;
    }
  });

  // Reorder from Mon to Sun for automotive workshops
  const reorderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const reorderedCounts = [counts[1], counts[2], counts[3], counts[4], counts[5], counts[6], counts[0]];

  let maxVal = -1;
  let peakDay = 'Mon';
  reorderedDays.forEach((day, idx) => {
    if (reorderedCounts[idx] > maxVal) {
      maxVal = reorderedCounts[idx];
      peakDay = day;
    }
  });

  const total = currentRecords.length;
  const weekendCount = counts[6] + counts[0];
  const weekendPercent = total > 0 ? Math.round((weekendCount / total) * 100) : 0;

  return {
    days: reorderedDays,
    counts: reorderedCounts,
    peakDay,
    weekendPercent,
  };
}
