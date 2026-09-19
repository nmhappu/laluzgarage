import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';

interface RetentionCardProps {
  uniqueCustomers: number;
  returningCustomers: number;
  newCustomers: number;
  repeatPercent: number;
  onClick: () => void;
}

export function RetentionCard({
  uniqueCustomers,
  returningCustomers,
  newCustomers,
  repeatPercent,
  onClick,
}: RetentionCardProps) {
  const chartOption = useMemo(() => {
    return {
      series: [
        {
          type: 'gauge',
          startAngle: 90,
          endAngle: -270,
          radius: '90%',
          center: ['50%', '50%'],
          pointer: { show: false },
          progress: {
            show: true,
            overlap: false,
            roundCap: true,
            clip: false,
            itemStyle: {
              color: '#8B5CF6',
            },
          },
          axisLine: {
            lineStyle: {
              width: 10,
              color: [[1, 'rgba(255, 255, 255, 0.08)']],
            },
          },
          splitLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          data: [
            {
              value: repeatPercent,
              name: 'Retention',
              title: { show: false },
              detail: {
                show: false,
              },
            },
          ],
        },
      ],
    };
  }, [repeatPercent]);

  return (
    <AnalyticsSquareCard
      title="Customer Loyalty"
      subtitle="Repeat Customer Retention"
      icon={Users}
      iconColor="text-purple-400"
      primaryValue={`${repeatPercent}% Returning`}
      badgeText={`${uniqueCustomers} Customers`}
      badgeType="neutral"
      chartNode={<EChartsReact option={chartOption} className="w-full h-full" />}
      secondaryContext={
        <span>
          <strong className="text-purple-400">{returningCustomers}</strong> repeat visits • <strong className="text-workshop-text">{newCustomers}</strong> new customers
        </span>
      }
      onClick={onClick}
    />
  );
}
