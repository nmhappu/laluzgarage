import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { subDays, format } from 'date-fns';
import { motion } from 'motion/react';
import { db } from '../../lib/firebase';
import { EChartsReact } from '../analytics/EChartsReact';
import { cn } from '../../lib/utils';
import type { ServiceRecord } from '../../types';

interface DayFlow {
  date: string;
  label: string;
  intake: number;
  completed: number;
}

interface WorkshopPulseHeroChartProps {
  records?: ServiceRecord[];
  className?: string;
  showBadge?: boolean;
}

let cachedPulseRecords: ServiceRecord[] | null = null;

export function WorkshopPulseHeroChart({ records: propRecords, className, showBadge = false }: WorkshopPulseHeroChartProps) {
  const [fetchedRecords, setFetchedRecords] = useState<ServiceRecord[]>(() => cachedPulseRecords || []);
  const [loading, setLoading] = useState(() => !propRecords && cachedPulseRecords === null);

  useEffect(() => {
    if (propRecords) return;

    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1200);

    async function loadRecords() {
      try {
        const snap = await getDocs(
          query(collection(db, 'serviceRecords'), orderBy('date', 'desc'), limit(200))
        );
        if (isMounted) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord));
          cachedPulseRecords = docs;
          setFetchedRecords(docs);
        }
      } catch (err) {
        console.error('Error loading records for throughput pulse:', err);
      } finally {
        clearTimeout(fallbackTimer);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadRecords();

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [propRecords]);

  const records = propRecords || fetchedRecords;

  // Compute 14-day Dual-Wave data: Intake vs. Completed/Outflow
  const { timeline, totalIntake, totalCompleted } = useMemo(() => {
    const days = 14;
    const now = new Date();
    const intakeMap = new Map<string, number>();
    const completedMap = new Map<string, number>();
    const keys: string[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(now, i);
      const key = format(d, 'yyyy-MM-dd');
      keys.push(key);
      intakeMap.set(key, 0);
      completedMap.set(key, 0);
    }

    records.forEach((r) => {
      if (!r.date) return;
      const dateKey = r.date.split('T')[0];
      if (intakeMap.has(dateKey)) {
        intakeMap.set(dateKey, (intakeMap.get(dateKey) || 0) + 1);
        if (r.status === 'completed') {
          completedMap.set(dateKey, (completedMap.get(dateKey) || 0) + 1);
        }
      }
    });

    let sumIntake = 0;
    let sumCompleted = 0;
    const tl: DayFlow[] = keys.map((key) => {
      const intake = intakeMap.get(key) || 0;
      const completed = completedMap.get(key) || 0;
      sumIntake += intake;
      sumCompleted += completed;
      return {
        date: key,
        label: format(new Date(key), 'dd MMM'),
        intake,
        completed,
      };
    });

    return { timeline: tl, totalIntake: sumIntake, totalCompleted: sumCompleted };
  }, [records]);

  // Apache ECharts Dual-Wave Option Configuration (Option 4: Intake vs Outflow)
  const chartOption = useMemo(() => {
    const dates = timeline.map((t) => t.label);
    const hasData = totalIntake > 0 || totalCompleted > 0;

    // Realistic telemetry baselines if test database has zero 14-day entries
    const intakeData = hasData
      ? timeline.map((t) => t.intake)
      : [1.8, 2.5, 2.0, 3.2, 2.8, 3.8, 3.0, 3.5, 4.2, 3.6, 4.5, 3.8, 3.2, 3.9];
    const completedData = hasData
      ? timeline.map((t) => t.completed)
      : [1.2, 1.8, 1.4, 2.4, 2.1, 3.0, 2.5, 2.9, 3.6, 3.1, 4.0, 3.4, 2.8, 3.5];

    return {
      grid: {
        top: 10,
        right: 0,
        bottom: 4,
        left: 0,
        containLabel: false,
      },
      xAxis: {
        type: 'category' as const,
        data: dates,
        show: false,
        boundaryGap: false,
      },
      yAxis: {
        type: 'value' as const,
        show: false,
        min: 0,
      },
      series: [
        // Series 1: Vehicle Intakes (Cobalt Blue #3B82F6)
        {
          name: 'Intakes',
          type: 'line' as const,
          smooth: 0.35,
          smoothMonotone: 'x' as const,
          data: intakeData,
          symbol: 'none',
          z: 1,
          lineStyle: {
            color: '#3B82F6',
            width: 2,
            shadowColor: 'rgba(59, 130, 246, 0.45)',
            shadowBlur: 8,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.24)' },
                { offset: 0.65, color: 'rgba(59, 130, 246, 0.06)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.0)' },
              ],
            },
          },
        },
        // Series 2: Vehicle Deliveries / Completed (Emerald #10B981)
        {
          name: 'Completed',
          type: 'line' as const,
          smooth: 0.35,
          smoothMonotone: 'x' as const,
          data: completedData,
          symbol: 'none',
          z: 2,
          lineStyle: {
            color: '#10B981',
            width: 2.5,
            shadowColor: 'rgba(16, 185, 129, 0.50)',
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
                { offset: 0, color: 'rgba(16, 185, 129, 0.28)' },
                { offset: 0.65, color: 'rgba(16, 185, 129, 0.08)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.0)' },
              ],
            },
          },
        },
      ],
      animation: false,
    };
  }, [timeline, totalIntake, totalCompleted]);

  return (
    <>
      {/* Background Animated ECharts Dual-Wave Layer */}
      <div
        className={cn(
          "absolute top-0 inset-x-0 pointer-events-none overflow-hidden opacity-90 [mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)]",
          className || "h-[105px] sm:h-[115px]"
        )}
      >
        {!loading && (
          <div className="w-full h-full relative">
            <motion.div
              initial={{ clipPath: 'inset(0% 100% 0% 0%)' }}
              animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
              transition={{
                duration: 2.6,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.08,
              }}
              className="w-full h-full"
            >
              <EChartsReact
                option={chartOption}
                className="w-full h-full"
                style={{ minHeight: 'unset' }}
              />
            </motion.div>
          </div>
        )}
      </div>

      {/* Top-Right Live Context Dual-Metric Badge */}
      {showBadge && (
        <div className="absolute right-5 sm:right-6 top-5 sm:top-6 z-10 flex items-center gap-2.5 px-3 py-1 rounded-full bg-workshop-surface/85 border border-workshop-border/70 backdrop-blur-md text-xs font-semibold text-workshop-muted shadow-sm select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success"></span>
          </span>
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-wide">
            <span className="flex items-center gap-1.5 text-workshop-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block shadow-[0_0_6px_rgba(59,130,246,0.6)]"></span>
              <span className="text-workshop-text">{loading ? '...' : `${totalIntake} In`}</span>
            </span>
            <span className="text-workshop-border/80 font-normal">•</span>
            <span className="flex items-center gap-1.5 text-workshop-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success inline-block shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
              <span className="text-status-success font-bold">{loading ? '...' : `${totalCompleted} Out`}</span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default WorkshopPulseHeroChart;
