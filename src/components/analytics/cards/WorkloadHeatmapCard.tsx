import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';

interface WorkloadHeatmapCardProps {
  days: string[];
  counts: number[];
  peakDay: string;
  weekendPercent: number;
  onClick: () => void;
}

export function WorkloadHeatmapCard({
  days,
  counts,
  peakDay,
  weekendPercent,
  onClick,
}: WorkloadHeatmapCardProps) {
  const chartOption = useMemo(() => {
    return {
      grid: { top: 4, right: 4, bottom: 16, left: 4, containLabel: false },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748B',
          fontSize: 8,
          interval: 0,
          formatter: (val: string) => val.slice(0, 1),
          fontFamily: '"Google Sans", sans-serif',
        },
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          type: 'bar',
          data: counts.map((c, i) => ({
            value: c,
            itemStyle: {
              color: days[i] === peakDay ? '#F43F5E' : '#06B6D4',
              borderRadius: [2, 2, 0, 0],
            },
          })),
          barWidth: 8,
        },
      ],
    };
  }, [days, counts, peakDay]);

  return (
    <AnalyticsSquareCard
      title="Intake & Peak Days"
      subtitle="Workshop Arrival Schedule"
      icon={Calendar}
      iconColor="text-rose-400"
      primaryValue={`Peak: ${peakDay}`}
      badgeText={`${weekendPercent}% Weekend Vol`}
      badgeType="urgent"
      chartNode={<EChartsReact option={chartOption} className="w-full h-full" />}
      secondaryContext={
        <span>
          Busiest Drop-off: <strong className="text-status-urgent">{peakDay}</strong> • Plan bay capacity
        </span>
      }
      onClick={onClick}
    />
  );
}
