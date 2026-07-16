import React, { useEffect } from 'react';
import { MessageSquare, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Portal } from './Portal';

interface WhatsAppPopupProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string;
  url: string;
}

export function WhatsAppPopup({ isOpen, onClose, customerName, customerPhone, url }: WhatsAppPopupProps) {
  // Prevent body scrolling when the popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOpenChat = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-workshop-bg/90 backdrop-blur-md"
            />

            {/* Container Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md bg-workshop-surface border border-workshop-border/40 rounded-3xl p-8 text-center shadow-2xl z-10 overflow-hidden font-sans"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 text-workshop-muted hover:text-workshop-text hover:bg-workshop-border/20 rounded-full transition-all cursor-pointer"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Decorative Glow */}
              <div className="absolute -top-12 -left-12 w-40 h-40 bg-[#128C7E]/10 rounded-full blur-3xl pointer-events-none" />

              {/* Icon */}
              <div className="mx-auto w-16 h-16 bg-[#128C7E]/10 rounded-2xl flex items-center justify-center text-[#128C7E] border border-[#128C7E]/20 mb-6 shrink-0 shadow-inner">
                <MessageSquare className="w-8 h-8 fill-[#128C7E]/5" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-black tracking-tight text-workshop-text uppercase mb-2">
                Open WhatsApp Chat
              </h3>
              <p className="text-workshop-muted text-xs leading-relaxed mb-6 font-medium">
                You are about to open a direct WhatsApp chat window with:
              </p>

              {/* Contact Info Card */}
              <div className="bg-workshop-bg/50 border border-workshop-border/20 rounded-2xl p-4 mb-8 text-left space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-workshop-muted tracking-wider">Client Name</span>
                  <span className="text-xs font-bold text-workshop-text truncate max-w-[200px]">{customerName}</span>
                </div>
                <div className="h-px bg-workshop-border/10" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-workshop-muted tracking-wider">Phone Number</span>
                  <span className="text-xs font-mono font-bold text-[#128C7E]">{customerPhone}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-5 py-3.5 bg-workshop-bg hover:bg-workshop-surface border border-workshop-border/50 text-workshop-muted hover:text-workshop-text rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="flex-1 px-5 py-3.5 bg-[#128C7E] hover:bg-[#0e7065] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-[#128C7E]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Open Chat</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
