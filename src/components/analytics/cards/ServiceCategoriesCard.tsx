import { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';
import type { ServiceCategoryMetric } from '../../../hooks/useAnalytics';

interface ServiceCategoriesCardProps {
  categories: ServiceCategoryMetric[];
  topCategory: ServiceCategoryMetric;
  topRevenueCategory: ServiceCategoryMetric;
  totalCategorized: number;
  onClick: () => void;
}

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F43F5E', '#64748B'];

export function ServiceCategoriesCard({
  categories,
  topCategory,
  totalCategorized,
  onClick,
}: ServiceCategoriesCardProps) {
  const chartOption = useMemo(() => {
    const top4 = categories.slice(0, 4);
    const data = top4.map((c, idx) => ({
      name: c.name,
      value: c.count,
      itemStyle: { color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] },
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      series: [
        {
          type: 'pie',
          radius: ['50%', '82%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 3,
            borderColor: '#07080A',
            borderWidth: 1.5,
          },
          label: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 3,
          },
          data: data.length > 0 ? data : [{ name: 'None', value: 1, itemStyle: { color: 'rgba(255,255,255,0.08)' } }],
        },
      ],
    };
  }, [categories]);

  return (
    <AnalyticsSquareCard
      title="Categories"
      icon={Layers}
      iconColor="text-teal-400"
      primaryValue={topCategory.count > 0 ? topCategory.name : `${totalCategorized} Orders`}
      chartNode={<EChartsReact option={chartOption} className="w-full h-full min-h-0" />}
      secondaryContext={
        <span>
          <strong className="text-teal-400">{topCategory.count}</strong> orders ({topCategory.percentage}%)
        </span>
      }
      onClick={onClick}
    />
  );
}
export default ServiceCategoriesCard;
