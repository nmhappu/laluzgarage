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
  avgHours,
  onTimeRate,
  expressCount,
  longStayCount,
  onClick,
}: TurnaroundCardProps) {
  const chartOption = useMemo(() => {
    // Normalizing cycle time to a gauge scale from 0 to 5 days
    const normalizedVal = Math.min(5, Math.max(0.2, avgDays));

    return {
      series: [
        {
          type: 'gauge',
          center: ['50%', '75%'],
          radius: '115%',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 5,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 10,
              color: [
                [0.3, '#10B981'], // <1.5 days: fast
                [0.7, '#FBBF24'], // 1.5 - 3.5 days: standard
                [1, '#F43F5E'],   // >3.5 days: bottleneck
              ],
            },
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '55%',
            width: 5,
            offsetCenter: [0, '-10%'],
            itemStyle: {
              color: '#F8FAFC',
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: { show: false },
          detail: {
            show: false,
          },
          data: [{ value: normalizedVal }],
        },
      ],
    };
  }, [avgDays]);

  return (
    <AnalyticsSquareCard
      title="Turnaround Velocity"
      subtitle="Intake to Handover Duration"
      icon={Clock}
      iconColor="text-amber-400"
      primaryValue={`${avgDays} Days Avg`}
      badgeText={`${onTimeRate}% On-Time`}
      badgeType={onTimeRate >= 85 ? 'success' : 'neutral'}
      chartNode={<EChartsReact option={chartOption} className="w-full h-full" />}
      secondaryContext={
        <span>
          <strong className="text-status-success">{expressCount}</strong> Express (&lt;24h) • <strong className="text-status-urgent">{longStayCount}</strong> Long-stay (&gt;3d)
        </span>
      }
      onClick={onClick}
    />
  );
}
