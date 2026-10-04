import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export interface AnalyticsSquareCardProps {
  title: string;
  subtitle?: string; // Optional for backwards compatibility, not rendered
  icon: LucideIcon;
  iconColor?: string;
  primaryValue: string | number;
  badgeText?: string;
  badgeType?: 'success' | 'urgent' | 'neutral' | 'info';
  secondaryContext?: ReactNode;
  chartNode?: ReactNode;
  onClick: () => void;
  className?: string;
}

export function AnalyticsSquareCard({
  title,
  icon: Icon,
  iconColor = 'text-workshop-accent',
  primaryValue,
  badgeText,
  badgeType = 'neutral',
  secondaryContext,
  chartNode,
  onClick,
  className,
}: AnalyticsSquareCardProps) {
  const badgeClasses = {
    success: 'bg-status-success/15 text-status-success border-status-success/30',
    urgent: 'bg-status-urgent/15 text-status-urgent border-status-urgent/30',
    info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    neutral: 'bg-workshop-card text-workshop-muted border-workshop-border/50',
  }[badgeType];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={onClick}
      className={cn(
        "relative aspect-square min-h-0 p-3 sm:p-5 md:p-6",
        "bg-workshop-surface border border-workshop-border/50 rounded-xl sm:rounded-2xl",
        "flex flex-col justify-between overflow-hidden",
        "hover:border-workshop-accent/50 hover:shadow-xl hover:shadow-workshop-accent/5",
        "transition-all duration-200 group cursor-pointer select-none",
        className
      )}
    >
      {/* Subtle background ambient gradient glow on hover */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-workshop-accent/5 rounded-full blur-2xl group-hover:bg-workshop-accent/10 transition-colors pointer-events-none" />

      {/* 1. Header: Compact Icon, Clean Title, and Optional Status Badge */}
      <div className="flex items-center justify-between gap-1.5 shrink-0 z-10">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div className={cn(
            "w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0",
            "bg-workshop-card/80 transition-transform group-hover:scale-105",
            iconColor
          )}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <h3 className="text-[11px] sm:text-xs font-bold font-google-sans text-workshop-text uppercase tracking-wider truncate">
            {title}
          </h3>
        </div>

        {badgeText && (
          <span className={cn(
            "text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0",
            badgeClasses
          )}>
            {badgeText}
          </span>
        )}
      </div>

      {/* 2. Middle: Primary Big Number + Embedded ECharts Graphic */}
      <div className="my-auto py-1 sm:py-2 flex flex-col justify-center min-w-0 z-10">
        <div className="text-sm xs:text-base sm:text-2xl md:text-3xl font-black font-google-sans tracking-tight text-workshop-text mb-0.5 truncate">
          {primaryValue}
        </div>

        {chartNode && (
          <div className="w-full h-11 xs:h-12 sm:h-22 md:h-26 overflow-hidden">
            {chartNode}
          </div>
        )}
      </div>

      {/* 3. Footer: Context / Supporting Metrics + Drill-Down Hint */}
      <div className="pt-1.5 sm:pt-2 border-t border-workshop-border/25 flex items-center justify-between text-[8.5px] xs:text-[9.5px] sm:text-[11px] text-workshop-muted shrink-0 z-10">
        <div className="truncate font-medium flex-1 mr-1 sm:mr-2">
          {secondaryContext}
        </div>
        <div className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1 text-[10px] font-bold text-workshop-accent uppercase tracking-wider shrink-0">
          <span>→</span>
        </div>
      </div>
    </motion.div>
  );
}
export default AnalyticsSquareCard;
