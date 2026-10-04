import { useMemo } from 'react';
import { Crown } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';
import { formatCurrency } from '../../../lib/utils';
import type { ClientSpendMetric } from '../../../hooks/useAnalytics';

interface ClientSpendCardProps {
  topClients: ClientSpendMetric[];
  topClient: ClientSpendMetric | null;
  avgCustomerSpend: number;
  top5Share: number;
  vipCount: number;
  totalTrackedSpend: number;
  onClick: () => void;
}

export function ClientSpendCard({
  topClients,
  topClient,
  avgCustomerSpend,
  vipCount,
  onClick,
}: ClientSpendCardProps) {
  const chartOption = useMemo(() => {
    const top3 = topClients.slice(0, 3).reverse();
    const names = top3.map((c) => c.name.split(' ')[0].slice(0, 6));
    const values = top3.map((c) => c.totalSpent);

    return {
      grid: { top: 2, right: 4, bottom: 2, left: 34, containLabel: false },
      xAxis: {
        type: 'value',
        show: false,
      },
      yAxis: {
        type: 'category',
        data: names.length > 0 ? names : ['None'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 8.5,
          fontFamily: '"Google Sans", sans-serif',
        },
      },
      series: [
        {
          type: 'bar',
          data: values.length > 0 ? values : [0],
          barWidth: 6,
          itemStyle: {
            color: '#F43F5E',
            borderRadius: [0, 3, 3, 0],
          },
          showBackground: true,
          backgroundStyle: {
            color: 'rgba(255, 255, 255, 0.04)',
            borderRadius: [0, 3, 3, 0],
          },
        },
      ],
    };
  }, [topClients]);

  return (
    <AnalyticsSquareCard
      title="VIP Clients"
      icon={Crown}
      iconColor="text-rose-400"
      primaryValue={topClient ? formatCurrency(topClient.totalSpent) : formatCurrency(avgCustomerSpend)}
      chartNode={<EChartsReact option={chartOption} className="w-full h-full min-h-0" />}
      secondaryContext={
        <span>
          Top: <strong className="text-workshop-text">{topClient ? topClient.name : 'N/A'}</strong> • {vipCount} VIPs
        </span>
      }
      onClick={onClick}
    />
  );
}
export default ClientSpendCard;
