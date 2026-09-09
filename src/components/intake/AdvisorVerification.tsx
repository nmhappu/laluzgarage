import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Portal } from '../Portal';

export interface AdvisorVerificationProps {
  isPage?: boolean;
  pinCode: string;
  pinError: string | null;
  pinInputRef: React.RefObject<HTMLInputElement>;
  onPinChange: (val: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function AdvisorVerification({
  isPage,
  pinCode,
  pinError,
  pinInputRef,
  onPinChange,
  onClear,
  onClose,
}: AdvisorVerificationProps) {
  const Wrapper = isPage ? React.Fragment : Portal;

  return (
    <Wrapper>
      <motion.div
        initial={isPage ? { opacity: 0, y: 15 } : { opacity: 0 }}
        animate={isPage ? { opacity: 1, y: 0 } : { opacity: 1 }}
        exit={isPage ? { opacity: 0, y: -10 } : { opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1.0] }}
        className={cn(
          "bg-workshop-bg flex flex-col justify-between",
          isPage
            ? "w-full max-w-4xl mx-auto min-h-[75vh]"
            : "fixed inset-0 z-[100] h-full p-0 pb-6 overflow-y-auto"
        )}
      >
        {/* Top Header Bar */}
        <div className="w-full sticky top-0 z-20 bg-workshop-bg border-b border-workshop-border/20 shrink-0">
          <div className="safe-top" />
          <div className="h-16 flex items-center justify-between px-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Key className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-sm font-black tracking-wider uppercase text-workshop-text font-google-sans">
                Advisor Verification
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-workshop-surface rounded-xl transition-colors text-workshop-muted hover:text-workshop-text cursor-pointer active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clean Main PIN Content Area */}
        <div className="w-full max-w-sm mx-auto my-auto flex flex-col items-center justify-center text-center py-8 px-6 select-none">
          <div className="space-y-1.5 mb-6">
            <p className="text-base font-bold text-workshop-text">Enter Security PIN</p>
            <p className="text-xs text-workshop-muted font-medium max-w-[240px] mx-auto leading-relaxed">
              Tap the PIN indicator below to open your keyboard and enter your 4-digit PIN.
            </p>
          </div>

          {/* Clickable PIN Indicator Dots with Native Numeric Input */}
          <div
            onClick={() => pinInputRef.current?.focus()}
            className="relative flex justify-center items-center gap-4 py-6 px-8 cursor-pointer group select-none"
          >
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
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer text-base bg-transparent"
            />
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all duration-200 pointer-events-none",
                  pinCode.length > index
                    ? "bg-blue-500 border-blue-400 scale-110 shadow-lg shadow-blue-500/40"
                    : "border-workshop-border/80 bg-workshop-surface/50 group-hover:border-blue-400/60"
                )}
              />
            ))}
          </div>

          {/* Error Message */}
          <div className="h-6 my-2 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {pinError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="text-xs font-bold text-status-urgent"
                >
                  {pinError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Clear Input option */}
          {pinCode.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onClear();
                pinInputRef.current?.focus();
              }}
              className="mt-2 py-2 px-4 text-xs font-bold text-workshop-muted hover:text-workshop-text uppercase tracking-widest transition-colors cursor-pointer"
            >
              Clear Input
            </button>
          )}
        </div>
      </motion.div>
    </Wrapper>
  );
}
