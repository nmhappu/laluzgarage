import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { Portal } from '../Portal';

export interface DiscardIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DiscardIntakeModal({
  isOpen,
  onClose,
  onConfirm,
}: DiscardIntakeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <div className="viewport-fill z-[200] flex items-center justify-center p-4 sheet-header-safe sheet-footer-safe">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              onClick={onClose}
              className="absolute inset-0 bg-workshop-bg/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
              style={{ willChange: 'transform, opacity' }}
              className="relative bg-workshop-card w-full max-w-sm rounded-2xl p-6 sm:p-7 shadow-2xl border border-workshop-border text-center"
            >
              <div className="w-14 h-14 bg-status-urgent/10 rounded-2xl flex items-center justify-center mx-auto mb-5 text-status-urgent border border-status-urgent/20">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <h2 className="text-xl font-bold font-logo text-workshop-text tracking-tight mb-2">
                Discard Intake Progress?
              </h2>
              <p className="text-workshop-muted text-xs sm:text-sm mb-6 leading-relaxed">
                You have unsaved changes in this service intake. If you exit now, your current intake details will be discarded.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-workshop-surface text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface/80 rounded-xl text-xs font-bold uppercase tracking-wider border border-workshop-border transition-all cursor-pointer active:scale-95"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2.5 bg-status-urgent text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-status-urgent/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  Discard & Exit
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
