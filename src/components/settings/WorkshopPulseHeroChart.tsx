import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { subDays, format } from 'date-fns';
import { db } from '../../lib/firebase';
import { EChartsReact } from '../analytics/EChartsReact';
import type { ServiceRecord } from '../../types';

interface DayThroughput {
  date: string;
  label: string;
  count: number;
}

interface WorkshopPulseHeroChartProps {
  records?: ServiceRecord[];
}

export function WorkshopPulseHeroChart({ records: propRecords }: WorkshopPulseHeroChartProps) {
  const [fetchedRecords, setFetchedRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(!propRecords);

  useEffect(() => {
    if (propRecords) return;

    let isMounted = true;
    async function loadRecords() {
      try {
        const snap = await getDocs(
          query(collection(db, 'serviceRecords'), orderBy('date', 'desc'), limit(200))
        );
        if (isMounted) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord));
          setFetchedRecords(docs);
        }
      } catch (err) {
        console.error('Error loading records for throughput pulse:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadRecords();

    return () => {
      isMounted = false;
    };
  }, [propRecords]);

  const records = propRecords || fetchedRecords;

  // Compute 14-day throughput data
  const { timeline, total14DayCount } = useMemo(() => {
    const days = 14;
    const now = new Date();
    const map = new Map<string, number>();
    const keys: string[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(now, i);
      const key = format(d, 'yyyy-MM-dd');
      keys.push(key);
      map.set(key, 0);
    }

    records.forEach((r) => {
      if (!r.date) return;
      const dateKey = r.date.split('T')[0];
      if (map.has(dateKey)) {
        map.set(dateKey, (map.get(dateKey) || 0) + 1);
      }
    });

    let total = 0;
    const tl: DayThroughput[] = keys.map((key) => {
      const count = map.get(key) || 0;
      total += count;
      return {
        date: key,
        label: format(new Date(key), 'dd MMM'),
        count,
      };
    });

    return { timeline: tl, total14DayCount: total };
  }, [records]);

  // Apache ECharts Option Configuration
  const chartOption = useMemo(() => {
    const dates = timeline.map((t) => t.label);
    const rawCounts = timeline.map((t) => t.count);

    // If zero records exist (e.g. empty test db), provide a subtle breathing baseline
    const hasData = total14DayCount > 0;
    const counts = hasData
      ? rawCounts
      : [1.2, 1.8, 1.4, 2.2, 1.9, 2.8, 2.1, 2.5, 3.2, 2.7, 3.5, 3.0, 2.4, 2.9];

    return {
      grid: {
        top: 10,
        right: 0,
        bottom: 0,
        left: 0,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: dates,
        show: false,
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        show: false,
        min: 0,
      },
      series: [
        {
          type: 'line',
          smooth: 0.45,
          data: counts,
          symbol: 'none',
          lineStyle: {
            color: '#10B981',
            width: 2.5,
            shadowColor: 'rgba(16, 185, 129, 0.45)',
            shadowBlur: 10,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.32)' },
                { offset: 0.65, color: 'rgba(16, 185, 129, 0.10)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.0)' },
              ],
            },
          },
        },
      ],
      animation: true,
      animationDuration: 1300,
      animationEasing: 'cubicOut' as const,
    };
  }, [timeline, total14DayCount]);

  return (
    <>
      {/* Background Animated ECharts Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-90">
        <EChartsReact
          option={chartOption}
          className="w-full h-full"
          style={{ minHeight: 'unset' }}
        />
      </div>

      {/* Top-Right Live Context Badge */}
      <div className="absolute right-5 sm:right-6 top-6 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-workshop-surface/80 border border-workshop-border/70 backdrop-blur-md text-xs font-semibold text-workshop-muted shadow-sm select-none">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success"></span>
        </span>
        <span className="text-[11px] font-mono font-medium tracking-wide text-workshop-text">
          {loading ? (
            'Syncing...'
          ) : (
            `${total14DayCount} ${total14DayCount === 1 ? 'Car' : 'Cars'} (14D Pulse)`
          )}
        </span>
      </div>
    </>
  );
}

export default WorkshopPulseHeroChart;
