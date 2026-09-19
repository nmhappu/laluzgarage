import { describe, it, expect } from 'vitest';
import { formatCurrency, parseDateSafe, formatDateSafe } from './utils';
import { navItems, getActiveTabLabel, getActiveTabM3Icon } from '../components/nav/types';

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
});
