import React, { useState, useEffect } from 'react';
import { X, MessageCircle, FileText, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Car, Phone, User, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Portal } from './Portal';
import type { ServiceRecord, Vehicle } from '../types';
import {
  getWhatsAppPresetsSync,
  fetchWhatsAppPresets,
  formatIntakeMessage,
  formatDeliveryMessage,
  capitalizeName,
  type WhatsAppPresets,
} from '../services/whatsappPresetService';
import { formatCurrency, cn } from '../lib/utils';

export interface WhatsAppPopupProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string;
  url?: string;
  record?: ServiceRecord | null;
  vehicle?: Vehicle | null;
}

export function WhatsAppPopup({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  url,
  record,
  vehicle,
}: WhatsAppPopupProps) {
  const [presets, setPresets] = useState<WhatsAppPresets>(getWhatsAppPresetsSync());
  const [previewOpen, setPreviewOpen] = useState<'intake' | 'delivery' | null>(null);

  // Fetch updated presets from Firestore on open
  useEffect(() => {
    if (isOpen) {
      fetchWhatsAppPresets().then((res) => setPresets(res));
      setPreviewOpen(null);
    }
  }, [isOpen]);

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

  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  const formattedName = customerName ? capitalizeName(customerName) : 'Customer';
  const vehicleTitle = vehicle ? `${vehicle.make ? vehicle.make + ' ' : ''}${vehicle.model}`.trim() : 'Vehicle';
  const plateNo = vehicle?.plateNumber || '';

  // 1. Direct Chat URL
  const directChatUrl = url || (cleanPhone ? `https://wa.me/${cleanPhone}` : '');

  // 2. Intake Preset URL & Message
  const intakeText = formatIntakeMessage(presets.intakeTemplate, {
    customerName: formattedName,
    vehicleMake: vehicle?.make,
    vehicleModel: vehicle?.model,
    vehiclePlate: plateNo,
    jobDescription: record?.description || 'Service Maintenance',
  });
  const intakeUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(intakeText)}` : directChatUrl;

  // 3. Delivery Preset URL & Message (Condition: only when status is 'completed' or 'complete')
  const isCompletedStatus =
    record?.status === 'completed' || (record?.status as string) === 'complete';

  const partsListStr =
    record?.partsUsed && record.partsUsed.length > 0
      ? record.partsUsed
          .map(
            (p, idx) =>
              `${idx + 1}. ${p.name} (x${p.quantity}) - ${formatCurrency(p.unitPrice * p.quantity)}`
          )
          .join('\n')
      : '• General Inspection & Maintenance';

  const deliveryText = formatDeliveryMessage(presets.deliveryTemplate, {
    customerName: formattedName,
    vehicleTitle,
    vehicleMake: vehicle?.make,
    vehicleModel: vehicle?.model,
    vehiclePlate: plateNo,
    partsList: partsListStr,
    laborCost: formatCurrency(record?.laborCost || 0),
    totalCost: formatCurrency(record?.totalCost || 0),
    jobDescription: record?.description || 'Service Maintenance',
  });
  const deliveryUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(deliveryText)}` : directChatUrl;

  const handleAction = (targetUrl: string) => {
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', bg: 'bg-status-success/15 border-status-success/30 text-status-success' };
      case 'in-progress':
        return { label: 'In Progress', bg: 'bg-status-warning/15 border-status-warning/30 text-status-warning' };
      case 'pending':
        return { label: 'Pending', bg: 'bg-status-urgent/15 border-status-urgent/30 text-status-urgent' };
      case 'cancelled':
        return { label: 'Cancelled', bg: 'bg-workshop-muted/15 border-workshop-muted/30 text-workshop-muted' };
      default:
        return { label: status || 'Active', bg: 'bg-workshop-border/30 border-workshop-border text-workshop-muted' };
    }
  };

  const statusBadge = record ? getStatusBadge(record.status) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="w-full max-w-2xl bg-workshop-card border border-workshop-border/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col font-sans max-h-[92vh]"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-workshop-border/40 bg-workshop-surface/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#128C7E]/15 border border-[#128C7E]/30 flex items-center justify-center shrink-0">
                    <img
                      src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/whatsapp-light.svg"
                      alt="WhatsApp"
                      className="w-6 h-6 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-workshop-text tracking-tight uppercase leading-tight">
                      WhatsApp Actions
                    </h2>
                    <p className="text-workshop-muted text-xs font-medium">
                      Select a communication preset for client
                    </p>
                  </div>
                </div>
                <button
                  id="close-whatsapp-screen-btn"
                  onClick={onClose}
                  className="p-2.5 text-workshop-muted hover:text-workshop-text hover:bg-workshop-border/20 rounded-xl transition-all cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                {/* Client & Context Card */}
                <div className="bg-workshop-bg border border-workshop-border/40 rounded-2xl p-4 sm:p-4.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-workshop-muted" />
                      <span className="text-xs font-bold text-workshop-muted uppercase tracking-wider">Client:</span>
                      <span className="text-sm font-black text-workshop-text uppercase">{formattedName}</span>
                    </div>
                    {statusBadge && (
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider',
                          statusBadge.bg
                        )}
                      >
                        {statusBadge.label}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-workshop-border/20">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#128C7E]" />
                      <span className="text-xs font-bold text-workshop-muted uppercase tracking-wider">Phone:</span>
                      <span className="text-sm font-mono font-bold text-[#128C7E]">
                        {customerPhone || 'No Phone Number'}
                      </span>
                    </div>

                    {(vehicleTitle !== 'Vehicle' || plateNo) && (
                      <div className="flex items-center gap-2 text-xs">
                        <Car className="w-3.5 h-3.5 text-workshop-muted" />
                        <span className="font-bold text-workshop-text">{vehicleTitle}</span>
                        {plateNo && (
                          <span className="font-mono font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            {plateNo.toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* The 3 Options List */}
                <div className="space-y-3.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-workshop-muted px-1 block">
                    Choose an Option:
                  </span>

                  {/* Option 1: Open Direct Chat */}
                  <div className="bg-workshop-bg hover:bg-workshop-surface/60 border border-workshop-border/40 hover:border-[#128C7E]/40 rounded-2xl p-4 sm:p-4.5 transition-all space-y-3 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-workshop-surface border border-workshop-border/60 flex items-center justify-center shrink-0 group-hover:border-[#128C7E]/40 text-[#128C7E]">
                          <MessageCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-black text-workshop-text uppercase tracking-tight">
                              1. Open Chat
                            </h3>
                            <span className="px-2 py-0.5 rounded bg-workshop-surface border border-workshop-border/40 text-[10px] font-black uppercase tracking-wider text-workshop-muted">
                              Direct
                            </span>
                          </div>
                          <p className="text-xs text-workshop-muted font-medium mt-0.5">
                            Launch direct WhatsApp conversation without any pre-filled message template.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        id="whatsapp-opt-open-chat"
                        onClick={() => handleAction(directChatUrl)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-workshop-surface hover:bg-workshop-card border border-workshop-border/60 hover:border-[#128C7E]/60 text-workshop-text rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                      >
                        <span>Open Direct Chat</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#128C7E]" />
                      </button>
                    </div>
                  </div>

                  {/* Option 2: Send Intake Preset */}
                  <div className="bg-workshop-bg hover:bg-workshop-surface/60 border border-workshop-border/40 hover:border-[#128C7E]/40 rounded-2xl p-4 sm:p-4.5 transition-all space-y-3 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#128C7E]/10 border border-[#128C7E]/30 flex items-center justify-center shrink-0 text-[#128C7E]">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-black text-workshop-text uppercase tracking-tight">
                              2. Send Intake Preset
                            </h3>
                            <span className="px-2 py-0.5 rounded bg-[#128C7E]/10 border border-[#128C7E]/30 text-[10px] font-black uppercase tracking-wider text-[#128C7E]">
                              Intake Log
                            </span>
                          </div>
                          <p className="text-xs text-workshop-muted font-medium mt-0.5">
                            Send vehicle registration & job acknowledgment details to the client.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Preview */}
                    <div className="pt-1 border-t border-workshop-border/20">
                      <button
                        type="button"
                        onClick={() => setPreviewOpen(previewOpen === 'intake' ? null : 'intake')}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-workshop-muted hover:text-workshop-text uppercase tracking-wider py-1 cursor-pointer"
                      >
                        <span>{previewOpen === 'intake' ? 'Hide Message Preview' : 'View Message Preview'}</span>
                        {previewOpen === 'intake' ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {previewOpen === 'intake' && (
                        <div className="mt-2 p-3 bg-workshop-card border border-workshop-border/40 rounded-xl text-xs font-mono text-workshop-text/90 whitespace-pre-wrap leading-relaxed">
                          {intakeText}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        id="whatsapp-opt-send-intake"
                        onClick={() => handleAction(intakeUrl)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-[#128C7E] hover:bg-[#0e7065] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#128C7E]/20 active:scale-95"
                      >
                        <span>Send Intake Preset</span>
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Option 3: Send Delivery Preset (CONDITIONAL: ONLY if status is complete) */}
                  {isCompletedStatus && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-workshop-bg hover:bg-workshop-surface/60 border border-status-success/30 hover:border-status-success/60 rounded-2xl p-4 sm:p-4.5 transition-all space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-status-success/10 border border-status-success/30 flex items-center justify-center shrink-0 text-status-success">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm sm:text-base font-black text-workshop-text uppercase tracking-tight">
                                3. Send Delivery Preset
                              </h3>
                              <span className="px-2 py-0.5 rounded bg-status-success/15 border border-status-success/30 text-[10px] font-black uppercase tracking-wider text-status-success">
                                Completed Job
                              </span>
                            </div>
                            <p className="text-xs text-workshop-muted font-medium mt-0.5">
                              Send ready-for-pickup notification with parts replaced, labor charges, and bill summary.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Delivery Preview */}
                      <div className="pt-1 border-t border-workshop-border/20">
                        <button
                          type="button"
                          onClick={() => setPreviewOpen(previewOpen === 'delivery' ? null : 'delivery')}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-workshop-muted hover:text-workshop-text uppercase tracking-wider py-1 cursor-pointer"
                        >
                          <span>{previewOpen === 'delivery' ? 'Hide Message Preview' : 'View Message Preview'}</span>
                          {previewOpen === 'delivery' ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {previewOpen === 'delivery' && (
                          <div className="mt-2 p-3 bg-workshop-card border border-workshop-border/40 rounded-xl text-xs font-mono text-workshop-text/90 whitespace-pre-wrap leading-relaxed">
                            {deliveryText}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          id="whatsapp-opt-send-delivery"
                          onClick={() => handleAction(deliveryUrl)}
                          className="w-full sm:w-auto px-5 py-2.5 bg-status-success hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-status-success/20 active:scale-95"
                        >
                          <span>Send Delivery Preset</span>
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Footer Bar */}
              <div className="p-4 sm:p-5 border-t border-workshop-border/40 bg-workshop-surface/20 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-workshop-bg hover:bg-workshop-surface border border-workshop-border/60 text-workshop-muted hover:text-workshop-text rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
