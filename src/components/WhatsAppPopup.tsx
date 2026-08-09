import React, { useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
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
          <motion.div
            initial={{ x: "100%", opacity: 0.95 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-[9999] bg-workshop-bg flex flex-col font-sans overflow-y-auto"
          >
            <div className="w-full min-h-screen flex flex-col justify-between p-6 md:p-10 max-w-2xl mx-auto space-y-6">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-workshop-border/30 pb-5">
                <div className="flex items-center gap-3.5">
                  <img src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/whatsapp-light.svg" alt="WhatsApp" className="w-7 h-7 shrink-0" referrerPolicy="no-referrer" />
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-workshop-text tracking-tight uppercase leading-tight">
                      Delivery Message
                    </h2>
                    <p className="text-workshop-muted text-xs font-medium">
                      Send message via WhatsApp
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 text-workshop-muted hover:text-workshop-text hover:bg-workshop-border/20 rounded-full transition-all cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6 my-auto">
                <p className="text-workshop-muted text-sm leading-relaxed font-medium">
                  You are about to open a direct WhatsApp chat window with:
                </p>

                {/* Contact Info Card */}
                <div className="bg-workshop-bg/60 border border-workshop-border/30 rounded-2xl p-5 text-left space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-workshop-muted tracking-wider">Client Name</span>
                    <span className="text-sm font-bold text-workshop-text truncate max-w-[250px]">{customerName}</span>
                  </div>
                  <div className="h-px bg-workshop-border/10" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-workshop-muted tracking-wider">Phone Number</span>
                    <span className="text-sm font-mono font-bold text-[#128C7E]">{customerPhone}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-workshop-border/20">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 px-6 bg-workshop-bg hover:bg-workshop-surface border border-workshop-border/50 text-workshop-muted hover:text-workshop-text rounded-2xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="flex-1 py-4 px-6 bg-[#128C7E] hover:bg-[#0e7065] text-white rounded-2xl text-sm font-black uppercase tracking-wider shadow-xl shadow-[#128C7E]/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
                >
                  <span>Open Chat</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
