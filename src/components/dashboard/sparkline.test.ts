import { describe, it, expect } from 'vitest';
import {
  generateSparkline,
  smoothTelemetryData,
  calculateAdaptiveDateKeys,
} from './sparkline';

describe('generateSparkline', () => {
  it('returns empty strings for empty or null data', () => {
    expect(generateSparkline([])).toEqual({ linePath: '', areaPath: '' });
  });

  it('handles single item data', () => {
    const res = generateSparkline([10], 100, 40);
    expect(res.linePath).toBe('M 0,20 L 100,20');
    expect(res.areaPath).toBe('M 0,20 L 100,20 L 100,40 L 0,40 Z');
  });

  it('handles identical all-zero data', () => {
    const res = generateSparkline([0, 0, 0], 100, 40, 4);
    expect(res.linePath).toBe('M 0,36 L 100,36');
    expect(res.areaPath).toBe('M 0,36 L 100,36 L 100,40 L 0,40 Z');
  });

  it('handles identical positive values', () => {
    const res = generateSparkline([5, 5, 5], 100, 40, 4);
    expect(res.linePath).toBe('M 0,20 L 100,20');
  });

  it('generates smooth cubic bezier curve for dynamic points', () => {
    const res = generateSparkline([1, 4, 2, 8, 5], 100, 40, 4);
    expect(res.linePath).toContain('M ');
    expect(res.linePath).toContain(' C ');
    expect(res.areaPath).toContain(res.linePath);
    expect(res.areaPath).toContain('L 100.0,40 L 0.0,40 Z');
  });

  it('generates smooth bezier with smooth option enabled', () => {
    const res = generateSparkline([0, 4, 0, 5, 1], 100, 40, 4, { smooth: true });
    expect(res.linePath).toContain('M ');
    expect(res.linePath).toContain(' C ');
    expect(res.areaPath).toContain(res.linePath);
  });
});

describe('smoothTelemetryData', () => {
  it('returns empty or short arrays as-is', () => {
    expect(smoothTelemetryData([])).toEqual([]);
    expect(smoothTelemetryData([5])).toEqual([5]);
    expect(smoothTelemetryData([2, 8])).toEqual([2, 8]);
  });

  it('preserves all-zero or all-identical data', () => {
    expect(smoothTelemetryData([0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
    expect(smoothTelemetryData([3, 3, 3])).toEqual([3, 3, 3]);
  });

  it('softens single-day dropouts using 3-point moving average', () => {
    const raw = [0, 4, 0, 5, 1];
    const smoothed = smoothTelemetryData(raw);
    expect(smoothed.length).toBe(5);
    // Middle Sunday drop (raw[2] = 0) should be smoothed to > 0
    expect(smoothed[2]).toBeGreaterThan(0);
    // Peak should be softened slightly
    expect(smoothed[1]).toBeLessThan(4);
  });
});

describe('calculateAdaptiveDateKeys', () => {
  const refDate = new Date('2026-09-25T12:00:00Z');

  it('defaults to 30 days when no record dates are passed', () => {
    const keys = calculateAdaptiveDateKeys([], refDate);
    expect(keys.length).toBe(30);
    expect(keys[keys.length - 1]).toBe('2026-09-25');
  });

  it('provides full 30 days for established workshop activity', () => {
    const recentDates = [
      '2026-09-25',
      '2026-09-24',
      '2026-09-23',
      '2026-09-22',
      '2026-09-21',
      '2026-09-20',
      '2026-09-10',
    ];
    const keys = calculateAdaptiveDateKeys(recentDates, refDate);
    expect(keys.length).toBe(30);
    expect(keys[keys.length - 1]).toBe('2026-09-25');
  });

  it('adapts to 14 days minimum when workshop only started recently with sparse records', () => {
    const newWorkshopDates = ['2026-09-25', '2026-09-23'];
    const keys = calculateAdaptiveDateKeys(newWorkshopDates, refDate);
    expect(keys.length).toBe(14);
  });

  it('provides exact 45 days when targetDays is 45 and adaptMin is false', () => {
    const newWorkshopDates = ['2026-09-25', '2026-09-23'];
    const keys = calculateAdaptiveDateKeys(newWorkshopDates, refDate, 45, false);
    expect(keys.length).toBe(45);
    expect(keys[keys.length - 1]).toBe('2026-09-25');
  });
});
