import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { Portal } from '../Portal';
import type { Part } from '../../types';

export interface DeletePartModalProps {
  isOpen: boolean;
  part: Part | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeletePartModal({ isOpen, part, onClose, onConfirm }: DeletePartModalProps) {
  if (!isOpen || !part) return null;

  return (
    <AnimatePresence>
      <Portal>
        <div className="viewport-fill z-[110] flex items-center justify-center p-4 sheet-header-safe sheet-footer-safe">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            onClick={onClose}
            className="absolute inset-0 bg-workshop-bg/95"
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            style={{ willChange: "transform, opacity" }}
            className="relative bg-workshop-card w-full max-w-sm rounded-[24px] p-8 shadow-2xl border border-workshop-border text-center z-10"
          >
            <div className="w-16 h-16 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-status-urgent border border-status-urgent/20">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-workshop-text mb-2 tracking-tight uppercase">Liquidate Asset?</h2>
            <p className="text-workshop-muted text-sm mb-8 leading-relaxed">
              Are you sure you want to permanently delete <span className="font-bold text-workshop-text underline">{part.name}</span> from the inventory log?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-[10px] font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface/50 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 px-4 py-3 bg-status-urgent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-status-urgent/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>
      </Portal>
    </AnimatePresence>
  );
}
