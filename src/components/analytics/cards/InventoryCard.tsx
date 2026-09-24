import { useMemo } from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';
import { formatCurrency } from '../../../lib/utils';
import type { PartUsageMetric } from '../../../hooks/useAnalytics';

interface InventoryCardProps {
  totalBilled: number;
  totalItemsDispatched: number;
  lowStockCount: number;
  topParts: PartUsageMetric[];
  categoryBreakdown: Array<{ name: string; value: number }>;
  onClick: () => void;
}

export function InventoryCard({
  totalBilled,
  totalItemsDispatched,
  lowStockCount,
  topParts,
  categoryBreakdown,
  onClick,
}: InventoryCardProps) {
  const chartOption = useMemo(() => {
    const categories = categoryBreakdown.slice(0, 4);
    const names = categories.map((c) => (c.name.length > 5 ? c.name.slice(0, 4) + '..' : c.name));
    const values = categories.map((c) => c.value);

    return {
      grid: { top: 4, right: 4, bottom: 16, left: 4, containLabel: false },
      xAxis: {
        type: 'category',
        data: names.length > 0 ? names : ['Parts'],
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
          data: values.length > 0 ? values : [1],
          barWidth: 8,
          itemStyle: {
            color: '#F59E0B',
            borderRadius: [2, 2, 0, 0],
          },
        },
      ],
    };
  }, [categoryBreakdown]);

  return (
    <AnalyticsSquareCard
      title="Parts & Inventory"
      subtitle="Spares Consumption & Stock"
      icon={Package}
      iconColor="text-amber-500"
      primaryValue={formatCurrency(totalBilled)}
      badgeText={lowStockCount > 0 ? `${lowStockCount} Low Stock` : 'Stock Healthy'}
      badgeType={lowStockCount > 0 ? 'urgent' : 'success'}
      chartNode={<EChartsReact option={chartOption} className="w-full h-full" />}
      secondaryContext={
        <span className="flex items-center gap-1.5">
          {lowStockCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-status-urgent shrink-0" />}
          <span>
            <strong className="text-workshop-text">{totalItemsDispatched}</strong> parts dispatched • {topParts.length} fast-movers
          </span>
        </span>
      }
      onClick={onClick}
    />
  );
}
