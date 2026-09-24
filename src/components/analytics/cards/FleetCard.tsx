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
  repeatRate,
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
        formatter: '{b}: {c} vehicles ({d}%)',
      },
      series: [
        {
          type: 'pie',
          radius: ['20%', '82%'],
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
      title="Fleet & Brand Mix"
      subtitle="Top Serviced Car Makes"
      icon={Car}
      iconColor="text-indigo-400"
      primaryValue={topBrand.name !== 'None' ? `${topBrand.name} (${topBrand.percentage}%)` : `${totalVehiclesServiced} Cars`}
      badgeText={`${repeatRate}% Repeat Fleet`}
      badgeType="info"
      chartNode={<EChartsReact option={chartOption} className="w-full h-full" />}
      secondaryContext={
        <span>
          <strong className="text-workshop-text">{totalVehiclesServiced}</strong> unique cars serviced • {brands.length} brands
        </span>
      }
      onClick={onClick}
    />
  );
}
