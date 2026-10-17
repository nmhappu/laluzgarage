import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { useAnalytics, type TimeRangeKey } from '../../../hooks/useAnalytics';
import { useMonthParam } from '../../../hooks/useMonthParam';
import { MonthNavigator } from '../MonthNavigator';
import { useBackHandler } from '../../../contexts/UIContext';
import { cn } from '../../../lib/utils';
import type { CardKey } from './types';
import { METRIC_METAS, exportMetricCSV } from './detailUtils';
import { MetricDetailContent } from './MetricDetailContent';

const VALID_METRICS: CardKey[] = [
  'revenue',
  'jobFlow',
  'turnaround',
  'technicians',
  'inventory',
  'fleet',
  'retention',
  'workload',
  'categories',
  'ticketTiers',
  'vehicleHealth',
  'clientSpend',
];

export function AnalyticsDetailPage() {
  const { metric } = useParams<{ metric: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const rangeParam = (searchParams.get('range') as TimeRangeKey) || '30d';
  const customStartParam = searchParams.get('start');
  const customEndParam = searchParams.get('end');

  const customStart = customStartParam ? new Date(customStartParam) : null;
  const customEnd = customEndParam ? new Date(customEndParam) : null;

  const { monthAnchor, isCurrentMonth, shiftMonth } = useMonthParam();
  const analyticsData = useAnalytics(rangeParam, customStart, customEnd, monthAnchor);

  // Validate metric
  const activeCard: CardKey = (VALID_METRICS.includes(metric as CardKey)
    ? metric
    : 'revenue') as CardKey;

  const meta = METRIC_METAS[activeCard];
  const Icon = meta.icon;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/analytics${window.location.search}`, { replace: true });
    }
  };

  // Hardware back button integration
  useBackHandler(() => {
    handleBack();
    return true;
  }, true, 80);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExportCSV = () => {
    exportMetricCSV(activeCard, analyticsData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="w-full h-full flex flex-col bg-workshop-bg text-workshop-text overflow-hidden font-google-sans"
    >
      {/* 1. Dedicated Top Navigation Bar */}
      <header className="h-14 sm:h-16 border-b border-workshop-border/60 bg-workshop-surface/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-workshop-muted hover:text-workshop-text hover:bg-workshop-card/80 transition-colors cursor-pointer shrink-0"
            aria-label="Back to Analytics"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-workshop-card shrink-0", meta.color)}>
            <Icon className="w-4 h-4" />
          </div>

          <div>
            <h1 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight text-workshop-text truncate">
              {meta.title}
            </h1>
            <p className="text-[10px] text-workshop-muted hidden sm:block">
              {meta.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-workshop-card hover:bg-workshop-border/60 text-workshop-text text-xs font-bold flex items-center gap-1.5 border border-workshop-border/60 transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-workshop-accent" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </header>

      {/* 2. Scrollable Body Content */}
      <main className="flex-1 overflow-y-auto px-3.5 sm:px-6 md:px-8 py-4 sm:py-6 max-w-5xl mx-auto w-full">
        <MonthNavigator
          enabled={rangeParam === 'thisMonth'}
          monthAnchor={monthAnchor}
          isCurrentMonth={isCurrentMonth}
          onShift={shiftMonth}
        >
          <MetricDetailContent
            activeCard={activeCard}
            analyticsData={analyticsData}
          />
        </MonthNavigator>
      </main>
    </motion.div>
  );
}
export default AnalyticsDetailPage;
