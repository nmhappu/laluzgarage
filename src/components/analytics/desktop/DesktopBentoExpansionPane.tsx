import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Maximize2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { useAnalytics } from '../../../hooks/useAnalytics';
import type { CardKey } from '../detail/types';
import { METRIC_METAS, exportMetricCSV } from '../detail/detailUtils';
import { MetricDetailContent } from '../detail/MetricDetailContent';
import { cn } from '../../../lib/utils';

interface DesktopBentoExpansionPaneProps {
  activeCard: CardKey | null;
  analyticsData: ReturnType<typeof useAnalytics>;
  onClose: () => void;
}

export function DesktopBentoExpansionPane({
  activeCard,
  analyticsData,
  onClose,
}: DesktopBentoExpansionPaneProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const paneRef = useRef<HTMLDivElement>(null);

  // Scroll smoothly to expansion pane when activeCard opens
  useEffect(() => {
    if (activeCard && paneRef.current) {
      paneRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeCard]);

  // Escape key handler to close the inline panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeCard) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCard, onClose]);

  if (!activeCard) return null;

  const meta = METRIC_METAS[activeCard];
  const Icon = meta.icon;

  const handleExport = () => {
    exportMetricCSV(activeCard, analyticsData);
  };

  const handleOpenDedicatedPage = () => {
    navigate(`/analytics/${activeCard}${location.search}`);
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={paneRef}
        key={activeCard}
        initial={{ opacity: 0, y: -8, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.995 }}
        transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
        className="col-span-full bg-workshop-surface border-2 border-workshop-accent/60 rounded-2xl p-5 md:p-7 shadow-2xl shadow-workshop-accent/5 overflow-hidden my-2 relative"
      >
        {/* Subtle accent line on top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-workshop-accent via-cyan-400 to-indigo-500" />

        {/* 1. Header Bar: Title, Domain Pill, Export CSV, Dedicated Page Link, Collapse Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-workshop-border/60">
          <div className="flex items-center gap-3.5">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-workshop-card shadow-xs", meta.color)}>
              <Icon className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border", meta.badgeBg)}>
                  {meta.categoryLabel}
                </span>
                <span className="text-[11px] text-workshop-muted font-medium hidden md:inline">
                  Deep-Dive Inspection
                </span>
              </div>
              <h2 className="text-lg lg:text-xl font-black uppercase tracking-tight text-workshop-text font-google-sans mt-0.5">
                {meta.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Export CSV button */}
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-1.5 rounded-xl bg-workshop-card hover:bg-workshop-border/60 text-workshop-text text-xs font-bold flex items-center gap-1.5 border border-workshop-border/60 transition-colors cursor-pointer"
              title="Download CSV report"
            >
              <Download className="w-3.5 h-3.5 text-workshop-accent" />
              <span>Export CSV</span>
            </button>

            {/* Dedicated full page link */}
            <button
              type="button"
              onClick={handleOpenDedicatedPage}
              className="p-1.5 rounded-xl bg-workshop-card hover:bg-workshop-border/60 text-workshop-muted hover:text-workshop-text text-xs font-bold border border-workshop-border/60 transition-colors cursor-pointer hidden lg:flex items-center gap-1"
              title="Open full page view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Collapse button */}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-workshop-card/80 hover:bg-workshop-card text-workshop-muted hover:text-workshop-text text-xs font-bold flex items-center gap-1.5 border border-workshop-border/60 transition-colors cursor-pointer"
              title="Collapse inline view (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* 2. Embedded Content: Detail Chart, KPIs, Itemized Breakdown Tables */}
        <MetricDetailContent
          activeCard={activeCard}
          analyticsData={analyticsData}
          chartHeightClassName="h-72 lg:h-96"
        />
      </motion.div>
    </AnimatePresence>
  );
}
export default DesktopBentoExpansionPane;
