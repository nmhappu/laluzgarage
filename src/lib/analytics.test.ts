import { describe, it, expect } from 'vitest';
import { formatCurrency, parseDateSafe, formatDateSafe } from './utils';
import { navItems, getActiveTabLabel, getActiveTabM3Icon } from '../components/nav/types';
import {
  calculateRevenueMetrics,
  calculateJobFlowMetrics,
  calculateCustomerMetrics,
  calculateAnalyticsInterval,
  calculateServiceCategoryMetrics,
  calculateInvoiceTierMetrics,
  calculateVehicleHealthMetrics,
  calculateTopClientsMetrics,
} from './analyticsCalculators';
import type { ServiceRecord, Customer } from '../types';

describe('Analytics & Nav Integration Tests', () => {
  it('includes /analytics in navItems', () => {
    const analyticsNav = navItems.find((item) => item.to === '/analytics');
    expect(analyticsNav).toBeDefined();
    expect(analyticsNav?.label).toBe('Analytics');
    expect(analyticsNav?.m3Icon).toBe('monitoring');
    expect(navItems.map((item) => item.to)).toEqual(['/', '/vehicles', '/inventory', '/services', '/analytics']);
  });

  it('correctly maps /analytics to Analytics label and m3Icon', () => {
    expect(getActiveTabLabel('/analytics')).toBe('Analytics');
    expect(getActiveTabM3Icon('/analytics')).toBe('monitoring');
  });

  it('formats currency in Indian Rupees without NaN or errors', () => {
    expect(formatCurrency(0)).toContain('0');
    expect(formatCurrency(450000)).toContain('4,50,000');
  });

  it('safely parses dates for analytics intervals', () => {
    const parsed = parseDateSafe('2026-09-19');
    expect(parsed).toBeInstanceOf(Date);
    expect(formatDateSafe('2026-09-19', 'yyyy-MM-dd')).toBe('2026-09-19');
  });

  describe('analyticsCalculators', () => {
    it('calculates revenue and ticket growth correctly', () => {
      const mockCurrent = [
        {
          id: '1',
          vehicleId: 'v1',
          customerId: 'c1',
          date: '2026-09-10',
          status: 'completed',
          totalCost: 1000,
          laborCost: 400,
          partsCost: 600,
          description: 'Brake pad replacement',
        },
        {
          id: '2',
          vehicleId: 'v2',
          customerId: 'c2',
          date: '2026-09-12',
          status: 'completed',
          totalCost: 2000,
          laborCost: 800,
          partsCost: 1200,
          description: 'General service',
        },
      ] as unknown as ServiceRecord[];

      const mockPrevious = [
        {
          id: '3',
          vehicleId: 'v1',
          customerId: 'c1',
          date: '2026-08-10',
          status: 'completed',
          totalCost: 1500,
          laborCost: 500,
          partsCost: 1000,
          description: 'Oil change',
        },
      ] as unknown as ServiceRecord[];

      const result = calculateRevenueMetrics(mockCurrent, mockPrevious);
      expect(result.totalRevenue).toBe(3000);
      expect(result.laborRevenue).toBe(1200);
      expect(result.partsRevenue).toBe(1800);
      expect(result.avgTicket).toBe(1500);
      // Growth from 1500 to 3000 = +100%
      expect(result.growth).toBe(100);
      expect(result.laborShare).toBe(40);
      expect(result.partsShare).toBe(60);
      expect(result.timeline).toHaveLength(2);
    });

    it('calculates job flow metrics with status donut correctly', () => {
      const mockRecords = [
        { id: '1', vehicleId: 'v1', customerId: 'c1', date: '2026-09-01', status: 'completed' },
        { id: '2', vehicleId: 'v2', customerId: 'c2', date: '2026-09-02', status: 'in-progress' },
        { id: '3', vehicleId: 'v3', customerId: 'c3', date: '2026-09-03', status: 'pending' },
        { id: '4', vehicleId: 'v4', customerId: 'c4', date: '2026-09-04', status: 'cancelled' },
      ] as unknown as ServiceRecord[];

      const flow = calculateJobFlowMetrics(mockRecords);
      expect(flow.total).toBe(4);
      expect(flow.completed).toBe(1);
      expect(flow.inProgress).toBe(1);
      expect(flow.pending).toBe(1);
      expect(flow.cancelled).toBe(1);
      expect(flow.activeJobs).toBe(2);
      expect(flow.completionRate).toBe(25);
      expect(flow.statusDonut).toHaveLength(4);
    });

    it('calculates customer retention and repeat visits', () => {
      const mockRecords = [
        { id: '1', vehicleId: 'v1', customerId: 'cust-A', date: '2026-09-01', status: 'completed' },
        { id: '2', vehicleId: 'v1', customerId: 'cust-A', date: '2026-09-10', status: 'completed' },
        { id: '3', vehicleId: 'v2', customerId: 'cust-B', date: '2026-09-05', status: 'completed' },
      ] as unknown as ServiceRecord[];

      const metrics = calculateCustomerMetrics(mockRecords);
      expect(metrics.uniqueCustomers).toBe(2);
      expect(metrics.returningCustomers).toBe(1);
      expect(metrics.newCustomers).toBe(1);
      expect(metrics.repeatPercent).toBe(50);
    });

    it('generates consistent date intervals for today, 7d, 30d', () => {
      const int7 = calculateAnalyticsInterval('7d');
      expect(int7.currentInterval.start).toBeInstanceOf(Date);
      expect(int7.currentInterval.end).toBeInstanceOf(Date);
      expect(int7.previousInterval.start).toBeInstanceOf(Date);
    });

    it('calculates service category metrics and identifies top categories', () => {
      const mockRecords = [
        { id: '1', description: 'Periodic general service and engine oil filter change', status: 'completed', totalCost: 3500 },
        { id: '2', description: 'Front brake pad replacement and disc skimming', status: 'completed', totalCost: 2200 },
        { id: '3', description: 'AC refrigerant gas recharge and cooling coil clean', status: 'completed', totalCost: 4000 },
        { id: '4', description: 'Brake fluid bleeding and rear shoes check', status: 'pending', totalCost: 1500 },
      ] as unknown as ServiceRecord[];

      const result = calculateServiceCategoryMetrics(mockRecords);
      expect(result.totalCategorized).toBe(4);
      expect(result.categories.length).toBeGreaterThanOrEqual(3);

      const brakeCat = result.categories.find((c) => c.name === 'Brakes & Safety');
      expect(brakeCat).toBeDefined();
      expect(brakeCat?.count).toBe(2);
      expect(brakeCat?.percentage).toBe(50);
      expect(brakeCat?.revenue).toBe(2200); // Only completed records count toward revenue

      const periodicCat = result.categories.find((c) => c.name === 'Periodic Service');
      expect(periodicCat).toBeDefined();
      expect(periodicCat?.count).toBe(1);

      expect(result.topCategory.name).toBe('Brakes & Safety');
      expect(result.topRevenueCategory.name).toBe('AC & Climate Control');
    });

    it('calculates invoice value tiers, median ticket, and high-value share', () => {
      const mockRecords = [
        { id: '1', status: 'completed', totalCost: 1200 },  // Minor (< 2K)
        { id: '2', status: 'completed', totalCost: 3500 },  // Standard (2K - 5K)
        { id: '3', status: 'completed', totalCost: 8000 },  // Major (5K - 15K)
        { id: '4', status: 'completed', totalCost: 20000 }, // Heavy (> 15K)
        { id: '5', status: 'pending', totalCost: 5000 },    // Pending should not count in invoiced tiers
      ] as unknown as ServiceRecord[];

      const result = calculateInvoiceTierMetrics(mockRecords);
      expect(result.totalInvoices).toBe(4);
      expect(result.tiers).toHaveLength(4);

      const minor = result.tiers.find((t) => t.id === 'minor')!;
      const standard = result.tiers.find((t) => t.id === 'standard')!;
      const major = result.tiers.find((t) => t.id === 'major')!;
      const heavy = result.tiers.find((t) => t.id === 'heavy')!;

      expect(minor.count).toBe(1);
      expect(standard.count).toBe(1);
      expect(major.count).toBe(1);
      expect(heavy.count).toBe(1);

      // Median of [1200, 3500, 8000, 20000] is (3500 + 8000) / 2 = 5750
      expect(result.medianTicket).toBe(5750);
      expect(result.highestTicket).toBe(20000);

      // High value (major 8000 + heavy 20000 = 28000) out of total 32700 = 86%
      expect(result.highValueShare).toBe(86);
    });

    it('calculates vehicle health, mileage distribution, and tow-in / breakdown rates', () => {
      const mockRecords = [
        { id: '1', vehicleId: 'v1', mileage: 25000, isDeadVehicle: false, date: '2026-09-01' },
        { id: '2', vehicleId: 'v2', mileage: 45000, isDeadVehicle: true, date: '2026-09-02' },
        { id: '3', vehicleId: 'v3', mileage: 120000, isDeadVehicle: false, date: '2026-09-03' },
        { id: '4', vehicleId: 'v1', mileage: 30000, isDeadVehicle: false, date: '2026-09-15' }, // Repeat car v1: +5000 km
      ] as unknown as ServiceRecord[];

      const result = calculateVehicleHealthMetrics(mockRecords);
      expect(result.deadVehicleCount).toBe(1);
      expect(result.deadVehicleRate).toBe(25); // 1 out of 4 records
      expect(result.highMileageCount).toBe(1); // 120000 km > 100k
      expect(result.avgMileage).toBe(Math.round((25000 + 45000 + 120000 + 30000) / 4));
      expect(result.avgDeltaKm).toBe(5000); // 30000 - 25000

      expect(result.mileageBrackets).toHaveLength(4);
      const lowBracket = result.mileageBrackets.find((b) => b.bracket === '< 30k')!;
      expect(lowBracket.count).toBe(1);
      const veteranBracket = result.mileageBrackets.find((b) => b.bracket === '> 100k')!;
      expect(veteranBracket.count).toBe(1);
    });

    it('calculates top spending customer accounts and customer lifetime value (LTV)', () => {
      const mockRecords = [
        { id: '1', customerId: 'cust-1', status: 'completed', totalCost: 15000, date: '2026-09-01' },
        { id: '2', customerId: 'cust-1', status: 'completed', totalCost: 5000, date: '2026-09-10' },
        { id: '3', customerId: 'cust-2', status: 'completed', totalCost: 6000, date: '2026-09-05' },
        { id: '4', customerId: 'cust-3', status: 'completed', totalCost: 1200, date: '2026-09-08' },
      ] as unknown as ServiceRecord[];

      const customerMap = new Map<string, Customer>([
        ['cust-1', { id: 'cust-1', name: 'Rajesh Kumar', phone: '9876543210' } as Customer],
        ['cust-2', { id: 'cust-2', name: 'Ananya Sharma', phone: '9123456780' } as Customer],
      ]);

      const result = calculateTopClientsMetrics(mockRecords, customerMap);
      expect(result.topClients.length).toBe(3);

      const top1 = result.topClient!;
      expect(top1.id).toBe('cust-1');
      expect(top1.name).toBe('Rajesh Kumar');
      expect(top1.totalSpent).toBe(20000);
      expect(top1.visitsCount).toBe(2);
      expect(top1.avgSpend).toBe(10000);

      // VIP accounts (> 10000): Rajesh has 20000 -> 1 VIP
      expect(result.vipCount).toBe(1);
      expect(result.totalTrackedSpend).toBe(27200);
      expect(result.avgCustomerSpend).toBe(Math.round(27200 / 3));
      // Top 5 share is 100% since total customers <= 5
      expect(result.top5Share).toBe(100);
    });
  });
});

