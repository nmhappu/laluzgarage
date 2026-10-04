import { useMemo } from 'react';
import { Gauge } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';
import type { MileageBracketMetric } from '../../../hooks/useAnalytics';

interface VehicleHealthCardProps {
  avgMileage: number;
  deadVehicleCount: number;
  deadVehicleRate: number;
  unknownMileageCount: number;
  highMileageCount: number;
  highMileageRate: number;
  mileageBrackets: MileageBracketMetric[];
  avgDeltaKm: number;
  onClick: () => void;
}

const BRACKET_COLORS = ['#38BDF8', '#34D399', '#FBBF24', '#F43F5E'];

export function VehicleHealthCard({
  avgMileage,
  deadVehicleCount,
  highMileageCount,
  mileageBrackets,
  onClick,
}: VehicleHealthCardProps) {
  const chartOption = useMemo(() => {
    const labels = mileageBrackets.map((b) => b.bracket);
    const data = mileageBrackets.map((b, idx) => ({
      value: b.count,
      itemStyle: {
        color: BRACKET_COLORS[idx % BRACKET_COLORS.length],
        borderRadius: [2, 2, 0, 0],
      },
    }));

    return {
      grid: { top: 4, right: 4, bottom: 14, left: 4, containLabel: false },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748B',
          fontSize: 8,
          interval: 0,
        },
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          type: 'bar',
          data: data.length > 0 ? data : [0],
          barWidth: 8,
        },
      ],
    };
  }, [mileageBrackets]);

  return (
    <AnalyticsSquareCard
      title="Vehicle Health"
      icon={Gauge}
      iconColor="text-sky-400"
      primaryValue={avgMileage > 0 ? `${avgMileage.toLocaleString()} km` : 'Odometer Log'}
      badgeText={deadVehicleCount > 0 ? `${deadVehicleCount} Tow-in` : undefined}
      badgeType="urgent"
      chartNode={<EChartsReact option={chartOption} className="w-full h-full min-h-0" />}
      secondaryContext={
        <span>
          <strong className="text-workshop-text">{highMileageCount}</strong> &gt;100k km • {deadVehicleCount} tow-in
        </span>
      }
      onClick={onClick}
    />
  );
}
export default VehicleHealthCard;
