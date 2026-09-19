import { useMemo } from 'react';
import { Wrench } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';
import type { TechMetric } from '../../../hooks/useAnalytics';

interface TechnicianCardProps {
  list: TechMetric[];
  topTech: TechMetric | null;
  totalAdvisors: number;
  onClick: () => void;
}

export function TechnicianCard({
  list,
  topTech,
  totalAdvisors,
  onClick,
}: TechnicianCardProps) {
  const chartOption = useMemo(() => {
    const top3 = list.slice(0, 3).reverse();
    const names = top3.map((t) => t.name.split(' ')[0]);
    const values = top3.map((t) => t.completed);

    return {
      grid: { top: 4, right: 12, bottom: 4, left: 55, containLabel: false },
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
          fontSize: 10,
          fontFamily: '"Google Sans", sans-serif',
        },
      },
      series: [
        {
          type: 'bar',
          data: values.length > 0 ? values : [0],
          barWidth: 10,
          itemStyle: {
            color: '#3B82F6',
            borderRadius: [0, 4, 4, 0],
          },
          showBackground: true,
          backgroundStyle: {
            color: 'rgba(255, 255, 255, 0.04)',
            borderRadius: [0, 4, 4, 0],
          },
        },
      ],
    };
  }, [list]);

  return (
    <AnalyticsSquareCard
      title="Advisor Productivity"
      subtitle="Workforce Bay Output"
      icon={Wrench}
      iconColor="text-blue-400"
      primaryValue={topTech ? `${topTech.name.split(' ')[0]} (${topTech.completed})` : `${totalAdvisors} Advisors`}
      badgeText={`${totalAdvisors} Active Techs`}
      badgeType="info"
      chartNode={<EChartsReact option={chartOption} className="w-full h-full" />}
      secondaryContext={
        <span>
          Top Lead: <strong className="text-workshop-text">{topTech ? `${topTech.completed} completed` : 'N/A'}</strong>
        </span>
      }
      onClick={onClick}
    />
  );
}
