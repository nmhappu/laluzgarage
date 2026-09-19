import { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';
import { formatCurrency } from '../../../lib/utils';
import type { TimelineDataPoint } from '../../../hooks/useAnalytics';

interface RevenueCardProps {
  totalRevenue: number;
  laborRevenue: number;
  partsRevenue: number;
  avgTicket: number;
  growth: number;
  timeline: TimelineDataPoint[];
  onClick: () => void;
}

export function RevenueCard({
  totalRevenue,
  laborRevenue,
  partsRevenue,
  avgTicket,
  growth,
  timeline,
  onClick,
}: RevenueCardProps) {
  const chartOption = useMemo(() => {
    const dates = timeline.map((t) => t.label);
    const totals = timeline.map((t) => t.total);

    return {
      grid: { top: 6, right: 0, bottom: 6, left: 0, containLabel: false },
      xAxis: {
        type: 'category',
        data: dates.length > 0 ? dates : ['No Data'],
        show: false,
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          type: 'line',
          smooth: 0.35,
          data: totals.length > 0 ? totals : [0],
          symbol: 'none',
          lineStyle: {
            color: '#10B981',
            width: 2.5,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.35)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.0)' },
              ],
            },
          },
        },
      ],
    };
  }, [timeline]);

  return (
    <AnalyticsSquareCard
      title="Revenue & Billing"
      subtitle="Workshop Invoicing Health"
      icon={DollarSign}
      iconColor="text-status-success"
      primaryValue={formatCurrency(totalRevenue)}
      badgeText={`${growth >= 0 ? '+' : ''}${growth}%`}
      badgeType={growth >= 0 ? 'success' : 'urgent'}
      chartNode={<EChartsReact option={chartOption} className="w-full h-full" />}
      secondaryContext={
        <span>
          Avg Ticket: <strong className="text-workshop-text">{formatCurrency(avgTicket)}</strong> • Labor: {formatCurrency(laborRevenue)}
        </span>
      }
      onClick={onClick}
    />
  );
}
