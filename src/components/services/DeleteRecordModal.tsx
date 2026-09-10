import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { Portal } from "../Portal";
import type { ServiceRecord } from "../../types";

export interface DeleteRecordModalProps {
  recordToDelete: ServiceRecord | null;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export function DeleteRecordModal({
  recordToDelete,
  onClose,
  onConfirmDelete,
}: DeleteRecordModalProps) {
  return (
    <AnimatePresence>
      {recordToDelete && (
        <Portal>
          <div className="viewport-fill z-[200] flex items-center justify-center p-4 sheet-header-safe sheet-footer-safe">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              onClick={onClose}
              className="absolute inset-0 bg-workshop-bg/95"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              className="relative bg-workshop-card w-full max-w-sm rounded-xl p-8 shadow-2xl border border-workshop-border text-center"
            >
              <div className="w-16 h-16 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-status-urgent border border-status-urgent/20">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-black text-workshop-text uppercase tracking-tight mb-2">
                Purge Record?
              </h2>
              <p className="text-workshop-muted text-sm mb-8 leading-relaxed">
                Are you certain you want to delete this job card? This action will permanently remove the record and revert used parts to inventory.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-workshop-surface text-workshop-muted rounded-xl text-sm font-black uppercase tracking-widest border border-workshop-border hover:text-workshop-text hover:bg-workshop-border transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmDelete}
                  className="flex-1 px-4 py-2.5 bg-status-urgent text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-status-urgent/20 hover:brightness-110 transition-all"
                >
                  Purge
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
