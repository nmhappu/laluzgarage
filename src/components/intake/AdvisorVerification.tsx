import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';
import { IntakeTopBar } from './IntakeTopBar';

const tapSpringTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 25,
};

export interface AdvisorVerificationProps {
  isPage?: boolean;
  pinCode: string;
  pinError: string | null;
  pinInputRef: React.RefObject<HTMLInputElement | null>;
  onPinChange: (val: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function AdvisorVerification({
  pinCode,
  pinError,
  pinInputRef,
  onPinChange,
  onClear,
  onClose,
}: AdvisorVerificationProps) {
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
        <div className="w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl -translate-y-12" />
      </div>

      {/* Standard App Top Navbar */}
      <IntakeTopBar onBack={onClose} title="Advisor Verification" m3Icon="lock" />

      {/* Main Content Area - Standard Page Padding & Left-Aligned */}
      <main className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-6 py-8 flex flex-col justify-center items-center sheet-footer-safe">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          className="flex flex-col items-start text-left space-y-6 max-w-md w-full my-auto"
        >
          {/* Ambient Status Icon */}
          <div className="relative text-secondary">
            <div className="absolute -inset-3 bg-secondary/20 blur-2xl rounded-full pointer-events-none" />
            <ShieldCheck className="relative w-12 h-12 stroke-[1.75]" />
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-2 text-left">
            <h1 className="text-2xl sm:text-3xl font-logo font-bold text-workshop-text tracking-tight">
              Advisor Verification
            </h1>
            <p className="text-workshop-muted text-xs sm:text-sm leading-relaxed">
              Enter your 4-digit security PIN to authorize and initiate vehicle intake.
            </p>
          </div>

          {/* PIN Digit Boxes Container */}
          <div
            onClick={() => pinInputRef.current?.focus()}
            className="w-full space-y-3 pt-1 cursor-pointer select-none"
          >
            <label className="text-xs font-semibold text-workshop-muted pl-0.5 block text-left">
              Advisor PIN Code
            </label>

            {/* Hidden Input Layered with 4 Digit Slots */}
            <div className="relative flex items-center justify-start gap-3">
              <input
                ref={pinInputRef}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                value={pinCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                  onPinChange(val);
                }}
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                aria-label="Enter 4-digit advisor PIN"
              />

              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pinCode.length > idx;
                const isCurrent = pinCode.length === idx;
                return (
                  <div
                    key={idx}
                    className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl border flex items-center justify-center font-numeric font-bold text-xl sm:text-2xl transition-all duration-150 ${
                      isFilled
                        ? 'border-secondary/80 bg-secondary/10 text-secondary shadow-sm shadow-secondary/15'
                        : isCurrent
                        ? 'border-secondary ring-2 ring-secondary/20 bg-workshop-surface/90 text-workshop-text'
                        : 'border-workshop-border bg-workshop-surface/60 text-workshop-muted/30'
                    }`}
                  >
                    {isFilled ? '•' : ''}
                  </div>
                );
              })}

              {pinCode.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                    pinInputRef.current?.focus();
                  }}
                  className="ml-2 py-2 px-3 text-[11px] font-medium font-google-sans uppercase tracking-wider text-workshop-muted hover:text-status-urgent transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Error Message Banner */}
          <AnimatePresence>
            {pinError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="w-full flex items-center gap-2.5 p-3.5 bg-status-urgent/10 border border-status-urgent/25 text-status-urgent rounded-xl text-xs font-semibold text-left"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="w-full space-y-3 pt-2">
            <motion.button
              type="button"
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              transition={tapSpringTransition}
              className="w-full flex items-center justify-start gap-3 bg-workshop-surface/60 hover:bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 text-workshop-muted hover:text-workshop-text px-5 py-3.5 rounded-xl font-medium font-google-sans text-xs uppercase tracking-wider cursor-pointer text-left accelerate-gpu will-change-transform"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Cancel & Return</span>
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
