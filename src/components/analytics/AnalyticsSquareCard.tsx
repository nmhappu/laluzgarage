import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export interface AnalyticsSquareCardProps {
  title: string;
  subtitle?: string;
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
  subtitle,
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
        "relative aspect-square min-h-0 sm:min-h-[250px] max-h-[380px] p-3 xs:p-3.5 sm:p-5 md:p-6",
        "bg-workshop-surface border border-workshop-border/50 rounded-xl sm:rounded-2xl",
        "flex flex-col justify-between overflow-hidden",
        "hover:border-workshop-accent/50 hover:shadow-xl hover:shadow-workshop-accent/5",
        "transition-all duration-200 group cursor-pointer select-none",
        className
      )}
    >
      {/* Subtle background ambient gradient glow on hover */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-workshop-accent/5 rounded-full blur-2xl group-hover:bg-workshop-accent/10 transition-colors pointer-events-none" />

      {/* 1. Header: Icon, Title, and Pill Badge */}
      {/* Mobile Layout (<sm) */}
      <div className="sm:hidden flex flex-col gap-1 shrink-0 z-10">
        <div className="flex items-center justify-between gap-1.5">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            "bg-workshop-card/80 transition-transform group-hover:scale-105",
            iconColor
          )}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          {badgeText && (
            <span className={cn(
              "text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0 truncate max-w-[80px]",
              badgeClasses
            )}>
              {badgeText}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-[11px] font-bold font-google-sans text-workshop-text uppercase tracking-wider truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[9px] text-workshop-muted font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Tablet & Desktop Layout (sm+) */}
      <div className="hidden sm:flex items-start justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            "bg-workshop-card/80 transition-transform group-hover:scale-105",
            iconColor
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold font-google-sans text-workshop-text uppercase tracking-wider truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] text-workshop-muted font-medium truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {badgeText && (
          <span className={cn(
            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
            badgeClasses
          )}>
            {badgeText}
          </span>
        )}
      </div>

      {/* 2. Middle: Primary Big Number + Embedded ECharts Graphic */}
      <div className="my-auto py-1 sm:py-2 flex flex-col justify-center shrink-0 z-10">
        <div className="text-base xs:text-lg sm:text-2xl md:text-3xl font-black font-google-sans tracking-tight text-workshop-text mb-0.5 sm:mb-1 truncate">
          {primaryValue}
        </div>

        {chartNode && (
          <div className="w-full h-12 xs:h-14 sm:h-24 md:h-28 overflow-hidden">
            {chartNode}
          </div>
        )}
      </div>

      {/* 3. Footer: Context / Supporting Metrics + Drill-Down Hint */}
      <div className="pt-1.5 sm:pt-2 border-t border-workshop-border/30 flex items-center justify-between text-[9px] xs:text-[10px] sm:text-[11px] text-workshop-muted shrink-0 z-10">
        <div className="truncate font-medium flex-1 mr-1 sm:mr-2">
          {secondaryContext}
        </div>
        <div className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1 text-[10px] font-bold text-workshop-accent uppercase tracking-wider shrink-0">
          <span>Details</span>
          <span>→</span>
        </div>
      </div>
    </motion.div>
  );
}
