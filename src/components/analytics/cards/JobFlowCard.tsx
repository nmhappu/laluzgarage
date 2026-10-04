import { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { AnalyticsSquareCard } from '../AnalyticsSquareCard';
import { EChartsReact } from '../EChartsReact';

interface JobFlowCardProps {
  total: number;
  completed: number;
  activeJobs: number;
  completionRate: number;
  overdueCount: number;
  statusDonut: Array<{ name: string; value: number; itemStyle: { color: string } }>;
  onClick: () => void;
}

export function JobFlowCard({
  total,
  completed,
  activeJobs,
  overdueCount,
  statusDonut,
  onClick,
}: JobFlowCardProps) {
  const chartOption = useMemo(() => {
    const hasData = statusDonut.length > 0;
    const data = hasData
      ? statusDonut
      : [{ name: 'None', value: 1, itemStyle: { color: 'rgba(255,255,255,0.08)' } }];

    return {
      tooltip: {
        show: true,
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      series: [
        {
          type: 'pie',
          radius: ['52%', '80%'],
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
          data,
        },
      ],
    };
  }, [statusDonut]);

  return (
    <AnalyticsSquareCard
      title="Job Flow"
      icon={ClipboardList}
      iconColor="text-cyan-400"
      primaryValue={`${total} Orders`}
      badgeText={overdueCount > 0 ? `${overdueCount} Overdue` : undefined}
      badgeType="urgent"
      chartNode={<EChartsReact option={chartOption} className="w-full h-full min-h-0" />}
      secondaryContext={
        <span>
          <strong className="text-status-success">{completed}</strong> Done • <strong className="text-cyan-400">{activeJobs}</strong> Active
        </span>
      }
      onClick={onClick}
    />
  );
}
export default JobFlowCard;
