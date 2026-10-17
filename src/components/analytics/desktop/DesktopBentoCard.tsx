import { type ReactNode } from 'react';
import { type LucideIcon, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import type { CardKey } from '../detail/types';

export interface DesktopBentoCardProps {
  metricKey: CardKey;
  title: string;
  domainLabel: string;
  icon: LucideIcon;
  iconColor?: string;
  primaryValue: string | number;
  badgeText?: string;
  badgeType?: 'success' | 'urgent' | 'neutral' | 'info';
  secondaryContext?: ReactNode;
  chartNode?: ReactNode;
  isHero?: boolean;
  isExpanded?: boolean;
  onToggleExpand: () => void;
  className?: string;
}

export function DesktopBentoCard({
  title,
  domainLabel,
  icon: Icon,
  iconColor = 'text-workshop-accent',
  primaryValue,
  badgeText,
  badgeType = 'neutral',
  secondaryContext,
  chartNode,
  isHero = false,
  isExpanded = false,
  onToggleExpand,
  className,
}: DesktopBentoCardProps) {
  const badgeClasses = {
    success: 'bg-status-success/15 text-status-success border-status-success/30',
    urgent: 'bg-status-urgent/15 text-status-urgent border-status-urgent/30',
    info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    neutral: 'bg-workshop-card text-workshop-muted border-workshop-border/50',
  }[badgeType];

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={onToggleExpand}
      className={cn(
        "relative rounded-2xl p-5 md:p-6 flex flex-col justify-between overflow-hidden",
        "bg-workshop-surface border transition-all duration-200 group cursor-pointer select-none",
        isExpanded
          ? "border-workshop-accent ring-1 ring-workshop-accent/50 shadow-xl shadow-workshop-accent/10 bg-workshop-surface"
          : "border-workshop-border/60 hover:border-workshop-accent/40 hover:shadow-lg hover:shadow-black/20",
        isHero
          ? "col-span-1 md:col-span-2 min-h-[220px]"
          : "col-span-1 min-h-[200px]",
        className
      )}
    >
      {/* Ambient background glow on hover / active */}
      <div
        className={cn(
          "absolute -top-14 -right-14 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-opacity duration-300",
          isExpanded
            ? "bg-workshop-accent/15 opacity-100"
            : "bg-workshop-accent/5 opacity-0 group-hover:opacity-100"
        )}
      />

      {/* 1. Header: Icon + Category Badge + Title + Inline Expand Toggle */}
      <div className="flex items-center justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
              "bg-workshop-card/90 transition-transform group-hover:scale-105",
              iconColor
            )}
          >
            <Icon className="w-4.5 h-4.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-workshop-muted">
                {domainLabel}
              </span>
              {isHero && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-workshop-accent/10 text-workshop-accent border border-workshop-accent/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Hero
                </span>
              )}
            </div>
            <h3 className="text-xs lg:text-sm font-bold font-google-sans text-workshop-text uppercase tracking-wide truncate">
              {title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {badgeText && (
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
                badgeClasses
              )}
            >
              {badgeText}
            </span>
          )}

          {/* Inline inspection indicator button */}
          <button
            type="button"
            className={cn(
              "p-1.5 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1",
              isExpanded
                ? "bg-workshop-accent text-workshop-bg border-workshop-accent"
                : "bg-workshop-card/80 border-workshop-border/60 text-workshop-muted group-hover:text-workshop-text group-hover:border-workshop-accent/40"
            )}
            title={isExpanded ? "Collapse inline view" : "Expand inline deep dive"}
          >
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Middle: Primary Value & Visualization Preview */}
      <div className={cn(
        "my-3 flex items-center justify-between gap-4 min-w-0 z-10",
        isHero ? "flex-col sm:flex-row sm:items-end" : "flex-row"
      )}>
        <div className="shrink-0 min-w-0">
          <p className="text-2xl lg:text-3xl font-black font-google-sans tracking-tight text-workshop-text truncate">
            {primaryValue}
          </p>
        </div>

        {chartNode && (
          <div className={cn(
            "overflow-hidden shrink min-w-0",
            isHero
              ? "w-full sm:w-1/2 h-16 sm:h-20"
              : "w-28 sm:w-36 h-12 sm:h-14 ml-auto"
          )}>
            {chartNode}
          </div>
        )}
      </div>

      {/* 3. Footer: Context / Secondary Metrics & Drilldown Prompt */}
      <div className="pt-2.5 border-t border-workshop-border/30 flex items-center justify-between text-xs text-workshop-muted shrink-0 z-10">
        <div className="truncate font-medium flex-1 mr-2">
          {secondaryContext}
        </div>

        <span className={cn(
          "text-[10.5px] font-bold uppercase tracking-wider transition-colors shrink-0",
          isExpanded
            ? "text-workshop-accent"
            : "text-workshop-muted group-hover:text-workshop-accent"
        )}>
          {isExpanded ? 'Viewing Deep Dive' : 'Expand Details →'}
        </span>
      </div>
    </motion.div>
  );
}
export default DesktopBentoCard;
