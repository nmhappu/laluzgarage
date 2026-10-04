import { useMemo } from 'react';
import { Car } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';
import type { BrandShareMetric } from '../../../hooks/useAnalytics';

interface FleetCardProps {
  totalVehiclesServiced: number;
  repeatRate: number;
  brands: BrandShareMetric[];
  topBrand: BrandShareMetric;
  onClick: () => void;
}

export function FleetCard({
  totalVehiclesServiced,
  brands,
  topBrand,
  onClick,
}: FleetCardProps) {
  const chartOption = useMemo(() => {
    const top4 = brands.slice(0, 4);
    const data = top4.map((b) => ({ name: b.name, value: b.count }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      series: [
        {
          type: 'pie',
          radius: ['20%', '80%'],
          center: ['50%', '50%'],
          roseType: 'area',
          itemStyle: {
            borderRadius: 3,
            borderColor: '#07080A',
            borderWidth: 1.5,
          },
          label: { show: false },
          data: data.length > 0 ? data : [{ name: 'None', value: 1 }],
        },
      ],
    };
  }, [brands]);

  return (
    <AnalyticsSquareCard
      title="Fleet & Brands"
      icon={Car}
      iconColor="text-indigo-400"
      primaryValue={topBrand.name !== 'None' ? `${topBrand.name} (${topBrand.percentage}%)` : `${totalVehiclesServiced} Cars`}
      chartNode={<EChartsReact option={chartOption} className="w-full h-full min-h-0" />}
      secondaryContext={
        <span>
          <strong className="text-workshop-text">{totalVehiclesServiced}</strong> cars serviced
        </span>
      }
      onClick={onClick}
    />
  );
}
export default FleetCard;
