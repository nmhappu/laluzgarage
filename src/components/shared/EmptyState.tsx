import React from 'react';
import { motion, type Variants } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  variants?: Variants;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconClassName,
  variants,
}: EmptyStateProps) {
  const content = (
    <div
      className={cn(
        'text-center py-16 px-4 bg-workshop-surface/20 border border-workshop-border border-dashed rounded-2xl space-y-3 max-w-xl mx-auto font-sans',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-workshop-surface border border-workshop-border flex items-center justify-center mx-auto text-workshop-muted shadow-xs">
        <Icon className={cn('w-6 h-6 text-workshop-muted/60', iconClassName)} />
      </div>
      <div className="space-y-1">
        <h3 className="text-workshop-text font-black uppercase tracking-tight text-sm sm:text-base">
          {title}
        </h3>
        {description && (
          <div className="text-workshop-muted text-xs max-w-sm mx-auto leading-relaxed">
            {description}
          </div>
        )}
      </div>
      {action && <div className="pt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );

  if (variants) {
    return (
      <motion.div variants={variants} initial="enter" animate="center" exit="exit">
        {content}
      </motion.div>
    );
  }

  return content;
}
