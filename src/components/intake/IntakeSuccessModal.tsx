import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Portal } from '../Portal';
import { WhatsAppIcon } from '../ui/BrandIcons';
import type { CreatedJobSummary } from '../../hooks/useServiceIntake';

export interface IntakeSuccessModalProps {
  createdJob: CreatedJobSummary;
  isPage?: boolean;
  onClose: () => void;
  onDismiss: () => void;
}

export function IntakeSuccessModal({
  createdJob,
  isPage,
  onDismiss,
}: IntakeSuccessModalProps) {
  const Wrapper = isPage ? React.Fragment : Portal;

  return (
    <Wrapper>
      <div
        className={cn(
          isPage
            ? "w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-12 px-6 min-h-[80vh] text-center"
            : "fixed inset-0 z-[100] bg-workshop-bg flex flex-col items-center justify-center p-6 text-center overflow-y-auto"
        )}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="max-w-md w-full bg-workshop-surface rounded-2xl p-8 border border-workshop-border shadow-2xl space-y-6"
        >
          <div className="w-16 h-16 bg-status-success/10 text-status-success rounded-full flex items-center justify-center mx-auto border border-status-success/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-workshop-text uppercase tracking-tight">
              Job Card Issued!
            </h3>
            <p className="text-xs text-workshop-muted">
              The digital job card was successfully created and logged into our secure systems.
            </p>
          </div>

          <div className="bg-workshop-bg/50 border border-workshop-border/40 rounded-xl p-5 text-left space-y-3">
            <div>
              <span className="text-[9px] uppercase font-black text-workshop-muted tracking-wider">
                Owner / Customer
              </span>
              <p className="text-sm font-bold text-workshop-text">{createdJob.customerName}</p>
            </div>
            <div>
              <span className="text-[9px] uppercase font-black text-workshop-muted tracking-wider">
                Vehicle Details
              </span>
              <p className="text-sm font-bold text-workshop-text">
                {createdJob.vehicleName}{' '}
                {createdJob.vehiclePlate && `[${createdJob.vehiclePlate.toUpperCase()}]`}
              </p>
            </div>
            <div>
              <span className="text-[9px] uppercase font-black text-workshop-muted tracking-wider">
                Job Details
              </span>
              <p className="text-xs font-semibold text-workshop-text line-clamp-2">
                {createdJob.description}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            {createdJob.waUrl && (
              <button
                type="button"
                onClick={() => {
                  window.open(createdJob.waUrl, '_blank', 'noopener,noreferrer');
                }}
                className="w-full py-4 bg-whatsapp text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-whatsapp-dark active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <WhatsAppIcon className="w-5 h-5 shrink-0" />
                Share via WhatsApp
              </button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-4 bg-workshop-surface text-workshop-text hover:bg-workshop-border/30 rounded-xl text-xs font-black uppercase tracking-wider border border-workshop-border/60 hover:border-workshop-text/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Dismiss & Close
            </button>
          </div>
        </motion.div>
      </div>
    </Wrapper>
  );
}
