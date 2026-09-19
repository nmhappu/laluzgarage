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
      grid: { top: 6, right: 6, bottom: 18, left: 6, containLabel: false },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748B',
          fontSize: 9,
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
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barWidth: 14,
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
