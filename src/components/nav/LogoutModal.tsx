import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { Portal } from '../Portal';
import { useBackHandler } from '../../contexts/UIContext';

interface LogoutModalProps {
  isOpen: boolean;
  isLoggingOut: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutModal({
  isOpen,
  isLoggingOut,
  onClose,
  onConfirm,
}: LogoutModalProps) {
  // Dismiss logout modal on back button press if not already logging out
  useBackHandler(() => {
    if (!isLoggingOut) {
      onClose();
    }
    return true;
  }, isOpen, 80);

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
              className="absolute inset-0 bg-workshop-bg/85"
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              style={{ willChange: "transform, opacity" }}
              className="relative bg-workshop-card w-full max-w-sm rounded-xl p-8 shadow-2xl border border-workshop-border text-center"
            >
              <div className="w-16 h-16 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-status-urgent border border-status-urgent/20">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-black text-workshop-text uppercase tracking-tight mb-2">
                End Session?
              </h2>
              <p className="text-workshop-muted text-sm mb-8 leading-relaxed">
                Are you sure you want to log out? You will need to sign in again to access the workshop dashboard.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-workshop-surface text-workshop-muted rounded-xl text-sm font-black uppercase tracking-widest border border-workshop-border hover:text-workshop-text hover:bg-workshop-border transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-logout-btn"
                  disabled={isLoggingOut}
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2.5 bg-status-urgent text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-status-urgent/20 hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {isLoggingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Signing out...</span>
                    </>
                  ) : (
                    'Log Out'
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
