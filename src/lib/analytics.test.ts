import { describe, it, expect } from 'vitest';
import { formatCurrency, parseDateSafe, formatDateSafe } from './utils';
import { navItems, getActiveTabLabel, getActiveTabM3Icon } from '../components/nav/types';
import {
  calculateRevenueMetrics,
  calculateJobFlowMetrics,
  calculateCustomerMetrics,
  calculateAnalyticsInterval,
} from './analyticsCalculators';
import type { ServiceRecord } from '../types';

describe('Analytics & Nav Integration Tests', () => {
  it('excludes /analytics from navItems (moved to Settings as Statistics)', () => {
    const analyticsNav = navItems.find((item) => item.to === '/analytics');
    expect(analyticsNav).toBeUndefined();
    expect(navItems.map((item) => item.to)).toEqual(['/', '/vehicles', '/inventory', '/services']);
  });

  it('correctly maps /analytics to Statistics label and m3Icon', () => {
    expect(getActiveTabLabel('/analytics')).toBe('Statistics');
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
  });
});
