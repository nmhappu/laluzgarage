import { motion, AnimatePresence } from "motion/react";
import { Trash2, Loader2 } from "lucide-react";
import { Portal } from "../Portal";
import { useBackHandler } from "../../contexts/UIContext";

export interface DeleteUserModalProps {
  userToDelete: { id: string; name: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  error: string | null;
}

export function DeleteUserModal({
  userToDelete,
  onCancel,
  onConfirm,
  isDeleting,
  error,
}: DeleteUserModalProps) {
  useBackHandler(() => {
    if (!isDeleting) {
      onCancel();
    }
    return true;
  }, Boolean(userToDelete), 85);

  return (
    <AnimatePresence>
      {userToDelete && (
        <Portal>
          <div className="fixed inset-0 bg-workshop-bg/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-workshop-surface max-w-sm w-full rounded-xl p-6 border border-workshop-border shadow-2xl text-center"
          >
            <div className="w-12 h-12 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-4 text-status-urgent border border-status-urgent/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-workshop-text uppercase tracking-tight mb-2">
              Delete Advisor?
            </h3>
            <p className="text-workshop-muted text-xs mb-6 leading-relaxed">
              Are you sure you want to permanently delete advisor{" "}
              <span className="font-semibold text-workshop-text">
                &quot;{userToDelete.name}&quot;
              </span>
              ? This action cannot be undone.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-status-urgent/10 border border-status-urgent/20 rounded-lg text-status-urgent text-xs font-semibold text-left">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 bg-workshop-surface text-workshop-muted hover:text-workshop-text rounded-lg text-xs font-bold uppercase tracking-wider border border-workshop-border/40 hover:bg-workshop-border/20 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 bg-status-urgent text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-status-urgent/25 hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
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
