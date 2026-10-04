import { format } from 'date-fns';

export interface StatTrendItem {
  date: string;
  value: number;
}

export interface SparklineResult {
  linePath: string;
  areaPath: string;
}

export interface SparklineOptions {
  smooth?: boolean;
}

/**
 * Calculates an adaptive array of date keys ('yyyy-MM-dd') optimized for clear telemetry visualization.
 * - Examines recent activity in the last 30 days.
 * - Detects active span (between earliest recent activity and today).
 * - Avoids dead leading zeros by trimming empty days before the first recorded event.
 * - Guarantees a minimum window of 7 days (for smooth curve rendering) and up to 30 days if activity is spread out.
 */
export function calculateAdaptiveDateKeys(
  recordDates: string[],
  referenceDate?: Date,
  targetDays = 30,
  adaptMin = true
): string[] {
  const now = referenceDate ? new Date(referenceDate) : new Date();

  // Parse valid dates within the target window (up to targetDays, default 30)
  const validDiffs: number[] = [];
  for (const dateStr of recordDates) {
    if (!dateStr || dateStr.length < 10) continue;
    const recordDay = new Date(dateStr.slice(0, 10));
    if (isNaN(recordDay.getTime())) continue;

    // Difference in calendar days from today
    const diffMs = now.getTime() - recordDay.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= targetDays) {
      validDiffs.push(diffDays);
    }
  }

  let days = targetDays;

  if (adaptMin && validDiffs.length > 0) {
    const maxDiff = Math.max(...validDiffs);
    // If workshop data only started very recently (< 14 days), adapt to avoid 20+ leading zeroes
    if (maxDiff < 14 && validDiffs.length < 5) {
      days = Math.max(14, maxDiff + 1);
    } else {
      days = targetDays;
    }
  }

  const dateKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dateKeys.push(format(d, 'yyyy-MM-dd'));
  }

  return dateKeys;
}

/**
 * Smooths data points using a weighted 3-point moving average.
 * Softens single-day dropouts (e.g. weekends/closures) and spikes
 * to render an organic momentum curve.
 */
export function smoothTelemetryData(data: number[]): number[] {
  if (!data || data.length < 3) {
    return data ? [...data] : [];
  }

  // If all values are identical (e.g. all 0), return as-is
  const first = data[0];
  if (data.every((v) => v === first)) {
    return [...data];
  }

  const n = data.length;
  const smoothed = new Array<number>(n);

  smoothed[0] = Number((data[0] * 0.75 + data[1] * 0.25).toFixed(2));

  for (let i = 1; i < n - 1; i++) {
    smoothed[i] = Number((data[i - 1] * 0.2 + data[i] * 0.6 + data[i + 1] * 0.2).toFixed(2));
  }

  smoothed[n - 1] = Number((data[n - 2] * 0.25 + data[n - 1] * 0.75).toFixed(2));
  return smoothed;
}

export function generateSparkline(
  rawPoints: number[],
  width = 120,
  height = 36,
  padding = 4,
  options?: SparklineOptions
): SparklineResult {
  if (!rawPoints || rawPoints.length === 0) {
    return { linePath: '', areaPath: '' };
  }

  const data = options?.smooth ? smoothTelemetryData(rawPoints) : rawPoints;
  const usableHeight = height - padding * 2;

  if (data.length === 1) {
    const y = height / 2;
    return {
      linePath: `M 0,${y} L ${width},${y}`,
      areaPath: `M 0,${y} L ${width},${y} L ${width},${height} L 0,${height} Z`,
    };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  if (range === 0) {
    const y = max === 0 ? height - padding : height / 2;
    return {
      linePath: `M 0,${y} L ${width},${y}`,
      areaPath: `M 0,${y} L ${width},${y} L ${width},${height} L 0,${height} Z`,
    };
  }

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return [x, y] as [number, number];
  });

  let linePath = `M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    let cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    let cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    // Prevent overshoot dipping below baseline or above top padding
    const maxY = height - padding;
    const minY = padding;
    cp1y = Math.max(minY, Math.min(maxY, cp1y));
    cp2y = Math.max(minY, Math.min(maxY, cp2y));

    // If consecutive points are equal, flatten tangent to prevent oscillation
    if (Math.abs(p1[1] - p2[1]) < 0.001) {
      cp1y = p1[1];
      cp2y = p2[1];
    }

    linePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = `${linePath} L ${lastPoint[0].toFixed(1)},${height} L ${firstPoint[0].toFixed(1)},${height} Z`;

  return { linePath, areaPath };
}
