import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';

interface TurnaroundCardProps {
  avgDays: number;
  avgHours: number;
  onTimeRate: number;
  expressCount: number;
  longStayCount: number;
  onClick: () => void;
}

export function TurnaroundCard({
  avgDays,
  onTimeRate,
  expressCount,
  onClick,
}: TurnaroundCardProps) {
  const chartOption = useMemo(() => {
    const normalizedVal = Math.min(5, Math.max(0.2, avgDays));

    return {
      series: [
        {
          type: 'gauge',
          center: ['50%', '82%'],
          radius: '90%',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 5,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 6,
              color: [
                [0.3, '#10B981'],
                [0.7, '#FBBF24'],
                [1, '#F43F5E'],
              ],
            },
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '52%',
            width: 3.5,
            offsetCenter: [0, '-10%'],
            itemStyle: {
              color: '#F8FAFC',
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: { show: false },
          detail: { show: false },
          data: [{ value: normalizedVal }],
        },
      ],
    };
  }, [avgDays]);

  return (
    <AnalyticsSquareCard
      title="Turnaround"
      icon={Clock}
      iconColor="text-amber-400"
      primaryValue={`${avgDays} Days Avg`}
      chartNode={<EChartsReact option={chartOption} className="w-full h-full min-h-0" />}
      secondaryContext={
        <span>
          <strong className="text-status-success">{onTimeRate}%</strong> on-time • {expressCount} express
        </span>
      }
      onClick={onClick}
    />
  );
}
export default TurnaroundCard;
