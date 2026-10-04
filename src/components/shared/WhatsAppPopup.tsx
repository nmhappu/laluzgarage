import React, { useState, useEffect } from 'react';
import { X, MessageCircle, FileText, CheckCircle2, ExternalLink, Car, Phone, User, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Portal } from '../ui/Portal';
import { useBackHandler } from '../../contexts/UIContext';
import { WhatsAppIcon } from '../ui/BrandIcons';
import { WhatsAppOptionCard } from './WhatsAppOptionCard';
import type { ServiceRecord, Vehicle } from '../../types';
import {
  getWhatsAppPresetsSync,
  fetchWhatsAppPresets,
  formatIntakeMessage,
  formatDeliveryMessage,
  type WhatsAppPresets,
} from '../../services/whatsappPresetService';
import { formatCurrency, capitalizeName, cleanPhoneNumber, buildWhatsAppUrl, formatPartsListForWhatsApp, cn } from '../../lib/utils';
import { getServiceStatusDetail } from '../../lib/constants';

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

  // Close WhatsApp popup on system/browser back button
  useBackHandler(() => {
    onClose();
    return true;
  }, isOpen, 90);

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

  const cleanPhone = cleanPhoneNumber(customerPhone);
  const formattedName = customerName ? capitalizeName(customerName) : 'Customer';
  const vehicleTitle = vehicle ? `${vehicle.make ? vehicle.make + ' ' : ''}${vehicle.model}`.trim() : 'Vehicle';
  const plateNo = vehicle?.plateNumber || '';

  // 1. Direct Chat URL
  const directChatUrl = url || (cleanPhone ? buildWhatsAppUrl(cleanPhone) : '');

  // 2. Intake Preset URL & Message
  const intakeText = formatIntakeMessage(presets.intakeTemplate, {
    customerName: formattedName,
    vehicleMake: vehicle?.make,
    vehicleModel: vehicle?.model,
    vehiclePlate: plateNo,
    jobDescription: record?.description || 'Service Maintenance',
  });
  const intakeUrl = cleanPhone ? buildWhatsAppUrl(cleanPhone, intakeText) : directChatUrl;

  // 3. Delivery Preset URL & Message (Condition: only when status is 'completed' or 'complete')
  const isCompletedStatus =
    record?.status === 'completed' || (record?.status as string) === 'complete';

  const partsListStr = formatPartsListForWhatsApp(record?.partsUsed);

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
  const deliveryUrl = cleanPhone ? buildWhatsAppUrl(cleanPhone, deliveryText) : directChatUrl;

  const handleAction = (targetUrl: string) => {
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  const statusDetail = record ? getServiceStatusDetail(record.status) : null;
  const statusBadge = statusDetail ? { label: statusDetail.label, bg: statusDetail.chipClass } : null;

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
                  <div className="w-10 h-10 rounded-xl bg-whatsapp/15 border border-whatsapp/30 flex items-center justify-center shrink-0">
                    <WhatsAppIcon className="w-6 h-6 shrink-0" />
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
                      <Phone className="w-4 h-4 text-whatsapp" />
                      <span className="text-xs font-bold text-workshop-muted uppercase tracking-wider">Phone:</span>
                      <span className="text-sm font-numeric font-bold text-whatsapp">
                        {customerPhone || 'No Phone Number'}
                      </span>
                    </div>

                    {(vehicleTitle !== 'Vehicle' || plateNo) && (
                      <div className="flex items-center gap-2 text-xs">
                        <Car className="w-3.5 h-3.5 text-workshop-muted" />
                        <span className="font-bold text-workshop-text">{vehicleTitle}</span>
                        {plateNo && (
                          <span className="font-plate font-black text-secondary bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/20">
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
                  <WhatsAppOptionCard
                    icon={MessageCircle}
                    title="1. Open Chat"
                    badgeLabel="Direct"
                    description="Launch direct WhatsApp conversation without any pre-filled message template."
                    actionId="whatsapp-opt-open-chat"
                    actionLabel="Open Direct Chat"
                    actionIcon={ExternalLink}
                    onAction={() => handleAction(directChatUrl)}
                  />

                  {/* Option 2: Send Intake Preset */}
                  <WhatsAppOptionCard
                    icon={FileText}
                    iconBoxClassName="bg-whatsapp/10 border-whatsapp/30 text-whatsapp"
                    title="2. Send Intake Preset"
                    badgeLabel="Intake Log"
                    badgeClassName="bg-whatsapp/10 border-whatsapp/30 text-whatsapp"
                    description="Send vehicle registration & job acknowledgment details to the client."
                    previewText={intakeText}
                    isPreviewOpen={previewOpen === 'intake'}
                    onTogglePreview={() => setPreviewOpen(previewOpen === 'intake' ? null : 'intake')}
                    actionId="whatsapp-opt-send-intake"
                    actionLabel="Send Intake Preset"
                    actionIcon={Send}
                    actionButtonClassName="bg-whatsapp hover:bg-whatsapp-dark text-white border-transparent hover:border-transparent shadow-md shadow-whatsapp/20"
                    onAction={() => handleAction(intakeUrl)}
                  />

                  {/* Option 3: Send Delivery Preset (CONDITIONAL: ONLY if status is complete) */}
                  {isCompletedStatus && (
                    <WhatsAppOptionCard
                      animateIn
                      icon={CheckCircle2}
                      containerClassName="border-status-success/30 hover:border-status-success/60"
                      iconBoxClassName="bg-status-success/10 border-status-success/30 text-status-success"
                      title="3. Send Delivery Preset"
                      badgeLabel="Completed Job"
                      badgeClassName="bg-status-success/15 border-status-success/30 text-status-success"
                      description="Send ready-for-pickup notification with parts replaced, labor charges, and bill summary."
                      previewText={deliveryText}
                      isPreviewOpen={previewOpen === 'delivery'}
                      onTogglePreview={() => setPreviewOpen(previewOpen === 'delivery' ? null : 'delivery')}
                      actionId="whatsapp-opt-send-delivery"
                      actionLabel="Send Delivery Preset"
                      actionIcon={Send}
                      actionButtonClassName="bg-status-success hover:brightness-110 text-white border-transparent hover:border-transparent shadow-md shadow-status-success/20"
                      onAction={() => handleAction(deliveryUrl)}
                    />
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
