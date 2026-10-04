import React from 'react';
import { motion } from 'motion/react';
import { ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface WhatsAppOptionCardProps {
  icon: LucideIcon;
  iconBoxClassName?: string;
  iconClassName?: string;
  title: string;
  badgeLabel: string;
  badgeClassName?: string;
  description: string;
  previewText?: string;
  isPreviewOpen?: boolean;
  onTogglePreview?: () => void;
  actionId: string;
  actionLabel: string;
  actionIcon?: LucideIcon;
  actionButtonClassName?: string;
  onAction: () => void;
  containerClassName?: string;
  animateIn?: boolean;
}

export function WhatsAppOptionCard({
  icon: Icon,
  iconBoxClassName,
  iconClassName,
  title,
  badgeLabel,
  badgeClassName,
  description,
  previewText,
  isPreviewOpen = false,
  onTogglePreview,
  actionId,
  actionLabel,
  actionIcon: ActionIcon,
  actionButtonClassName,
  onAction,
  containerClassName,
  animateIn = false,
}: WhatsAppOptionCardProps) {
  const content = (
    <div
      className={cn(
        'bg-workshop-bg hover:bg-workshop-surface/60 border border-workshop-border/40 hover:border-whatsapp/40 rounded-2xl p-4 sm:p-4.5 transition-all space-y-3 group',
        containerClassName
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-xl bg-workshop-surface border border-workshop-border/60 flex items-center justify-center shrink-0 group-hover:border-whatsapp/40 text-whatsapp',
              iconBoxClassName
            )}
          >
            <Icon className={cn('w-5 h-5', iconClassName)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-workshop-text uppercase tracking-tight">
                {title}
              </h3>
              <span
                className={cn(
                  'px-2 py-0.5 rounded bg-workshop-surface border border-workshop-border/40 text-[10px] font-black uppercase tracking-wider text-workshop-muted',
                  badgeClassName
                )}
              >
                {badgeLabel}
              </span>
            </div>
            <p className="text-xs text-workshop-muted font-medium mt-0.5">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Preview */}
      {previewText && onTogglePreview && (
        <div className="pt-1 border-t border-workshop-border/20">
          <button
            type="button"
            onClick={onTogglePreview}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-workshop-muted hover:text-workshop-text uppercase tracking-wider py-1 cursor-pointer"
          >
            <span>{isPreviewOpen ? 'Hide Message Preview' : 'View Message Preview'}</span>
            {isPreviewOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {isPreviewOpen && (
            <div className="mt-2 p-3 bg-workshop-card border border-workshop-border/40 rounded-xl text-xs font-mono text-workshop-text/90 whitespace-pre-wrap leading-relaxed">
              {previewText}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          id={actionId}
          onClick={onAction}
          className={cn(
            'w-full sm:w-auto px-5 py-2.5 bg-workshop-surface hover:bg-workshop-card border border-workshop-border/60 hover:border-whatsapp/60 text-workshop-text rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95',
            actionButtonClassName
          )}
        >
          <span>{actionLabel}</span>
          {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );

  if (animateIn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}
