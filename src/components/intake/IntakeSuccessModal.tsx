import { motion } from 'motion/react';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { WhatsAppIcon } from '../ui/BrandIcons';
import { IntakeTopBar } from './IntakeTopBar';
import type { CreatedJobSummary } from '../../hooks/useServiceIntake';

const tapSpringTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 25,
};

export interface IntakeSuccessModalProps {
  createdJob: CreatedJobSummary;
  isPage?: boolean;
  onClose: () => void;
  onDismiss: () => void;
}

export function IntakeSuccessModal({
  createdJob,
  onDismiss,
}: IntakeSuccessModalProps) {
  return (
    <div className="min-h-screen w-full bg-workshop-bg flex flex-col text-workshop-text relative overflow-x-hidden">
      {/* Precision Canvas Dot Grid Background */}
      <div
        className="canvas-grid pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
        style={{
          maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, #000 40%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, #000 40%, transparent 95%)',
        }}
      />

      {/* Ambient Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-status-success/5 rounded-full blur-3xl -translate-y-12" />
      </div>

      {/* Standard App Top Navbar */}
      <IntakeTopBar onBack={onDismiss} title="Job Card Summary" m3Icon="check_circle" />

      {/* Main Content Area - Standard Page Padding & Left-Aligned */}
      <main className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-6 py-8 flex flex-col justify-center items-center sheet-footer-safe">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          className="flex flex-col items-start text-left space-y-6 max-w-md w-full my-auto"
        >
          {/* Ambient Status Icon */}
          <div className="relative text-status-success">
            <div className="absolute -inset-3 bg-status-success/20 blur-2xl rounded-full pointer-events-none" />
            <CheckCircle2 className="relative w-12 h-12 stroke-[1.75]" />
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-2 text-left">
            <h1 className="text-2xl sm:text-3xl font-logo font-bold text-workshop-text tracking-tight">
              Job Card Issued
            </h1>
            <p className="text-workshop-muted text-xs sm:text-sm leading-relaxed">
              The digital job card was successfully created and registered into our garage database.
            </p>
          </div>

          {/* Details Table (PendingApproval style) */}
          <div className="w-full divide-y divide-workshop-border/60 border-y border-workshop-border/60 text-left py-1">
            <div className="flex items-center justify-between py-3 text-xs sm:text-sm">
              <span className="text-workshop-muted font-medium">Customer</span>
              <span className="text-workshop-text font-semibold truncate max-w-[220px]">
                {createdJob.customerName}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 text-xs sm:text-sm">
              <span className="text-workshop-muted font-medium">Vehicle</span>
              <span className="text-workshop-text font-semibold truncate max-w-[220px]">
                {createdJob.vehicleName}{' '}
                {createdJob.vehiclePlate && (
                  <span className="font-plate text-xs text-workshop-accent uppercase">
                    [{createdJob.vehiclePlate}]
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 text-xs sm:text-sm">
              <span className="text-workshop-muted font-medium">Description</span>
              <span className="text-workshop-text font-medium truncate max-w-[220px]">
                {createdJob.description}
              </span>
            </div>
          </div>

          {/* Interactive Action Buttons */}
          <div className="w-full space-y-3 pt-2">
            {createdJob.waUrl && (
              <motion.button
                type="button"
                onClick={() => {
                  window.open(createdJob.waUrl, '_blank', 'noopener,noreferrer');
                }}
                whileTap={{ scale: 0.97 }}
                transition={tapSpringTransition}
                className="w-full flex items-center justify-start gap-3 bg-whatsapp text-white hover:bg-whatsapp-dark px-5 py-3.5 rounded-xl font-medium font-google-sans text-xs uppercase tracking-wider shadow-md cursor-pointer text-left accelerate-gpu will-change-transform"
              >
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span>Share via WhatsApp</span>
              </motion.button>
            )}

            <motion.button
              type="button"
              onClick={onDismiss}
              whileTap={{ scale: 0.97 }}
              transition={tapSpringTransition}
              className="w-full flex items-center justify-start gap-3 bg-workshop-surface/60 hover:bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 text-workshop-muted hover:text-workshop-text px-5 py-3.5 rounded-xl font-medium font-google-sans text-xs uppercase tracking-wider cursor-pointer text-left accelerate-gpu will-change-transform"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Dismiss & Return</span>
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
