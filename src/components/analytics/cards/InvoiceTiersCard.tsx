import { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';
import { formatCurrency } from '../../../lib/utils';
import type { InvoiceTierMetric } from '../../../hooks/useAnalytics';

interface InvoiceTiersCardProps {
  tiers: InvoiceTierMetric[];
  medianTicket: number;
  highestTicket: number;
  dominantTier: InvoiceTierMetric;
  highValueShare: number;
  totalInvoices: number;
  onClick: () => void;
}

export function InvoiceTiersCard({
  tiers,
  medianTicket,
  highestTicket,
  dominantTier,
  onClick,
}: InvoiceTiersCardProps) {
  const chartOption = useMemo(() => {
    const labels = tiers.map((t) => t.label);
    const data = tiers.map((t) => ({
      value: t.count,
      itemStyle: {
        color: t.color,
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
  }, [tiers]);

  return (
    <AnalyticsSquareCard
      title="Invoice Tiers"
      icon={Receipt}
      iconColor="text-emerald-400"
      primaryValue={`Median: ${formatCurrency(medianTicket)}`}
      chartNode={<EChartsReact option={chartOption} className="w-full h-full min-h-0" />}
      secondaryContext={
        <span>
          Max: <strong className="text-emerald-400">{formatCurrency(highestTicket)}</strong> • {dominantTier.name}
        </span>
      }
      onClick={onClick}
    />
  );
}
export default InvoiceTiersCard;
