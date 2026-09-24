import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, LucideIcon, Loader2 } from 'lucide-react';
import { Portal } from '../Portal';
import { useBackHandler } from '../../contexts/UIContext';
import { cn } from '../../lib/utils';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  loadingLabel?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  iconContainerClassName?: string;
  preview?: React.ReactNode;
  backHandlerPriority?: number;
  confirmButtonId?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  isLoading = false,
  loadingLabel,
  icon: Icon = AlertTriangle,
  iconClassName = 'w-7 h-7',
  iconContainerClassName,
  preview,
  backHandlerPriority = 80,
  confirmButtonId,
}: ConfirmModalProps) {
  // Handle native / hardware back button press
  useBackHandler(() => {
    if (!isLoading) {
      onClose();
    }
    return true;
  }, isOpen, backHandlerPriority);

  const isDanger = confirmVariant === 'danger';
  const isWarning = confirmVariant === 'warning';

  const defaultIconContainer = isDanger
    ? 'bg-status-urgent/10 text-status-urgent border-status-urgent/20'
    : isWarning
      ? 'bg-status-pending/10 text-status-pending border-status-pending/20'
      : 'bg-workshop-accent/10 text-workshop-accent border-workshop-accent/20';

  const confirmBtnBg = isDanger
    ? 'bg-status-urgent text-white shadow-status-urgent/20'
    : isWarning
      ? 'bg-status-pending text-workshop-bg shadow-status-pending/20'
      : 'bg-workshop-accent text-workshop-bg shadow-workshop-accent/20';

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <div className="viewport-fill z-[200] flex items-center justify-center p-4 sheet-header-safe sheet-footer-safe font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              onClick={isLoading ? undefined : onClose}
              className="absolute inset-0 bg-workshop-bg/90 backdrop-blur-xs cursor-pointer"
            />

            {/* Dialog Card */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              style={{ willChange: 'transform, opacity' }}
              className="relative bg-workshop-card w-full max-w-sm rounded-2xl p-6 sm:p-8 shadow-2xl border border-workshop-border text-center z-10 font-sans"
            >
              {/* Icon Container */}
              <div
                className={cn(
                  'w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-5 border',
                  iconContainerClassName || defaultIconContainer
                )}
              >
                <Icon className={iconClassName} />
              </div>

              {/* Title & Description */}
              <h2 className="text-lg sm:text-xl font-black text-workshop-text mb-2 tracking-tight uppercase">
                {title}
              </h2>
              <div className="text-workshop-muted text-xs sm:text-sm mb-6 leading-relaxed">
                {description}
              </div>

              {/* Optional preview snippet (e.g. Vehicle card or error message) */}
              {preview && <div className="mb-6">{preview}</div>}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 sm:py-3 border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface/60 hover:text-workshop-text active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  id={confirmButtonId}
                  disabled={isLoading}
                  onClick={onConfirm}
                  className={cn(
                    'flex-1 px-4 py-2.5 sm:py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2',
                    confirmBtnBg
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>{loadingLabel || 'Processing...'}</span>
                    </>
                  ) : (
                    <span>{confirmLabel}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
