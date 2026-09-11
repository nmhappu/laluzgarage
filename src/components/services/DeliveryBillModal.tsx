import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Receipt } from "lucide-react";
import { Portal } from "../Portal";
import { useBackHandler } from "../../contexts/UIContext";
import type { ServiceRecord, Customer, Vehicle } from "../../types";
import { formatCurrency, capitalizeName, cleanPhoneNumber, buildWhatsAppUrl, formatPartsListForWhatsApp } from "../../lib/utils";
import { getWhatsAppPresetsSync, formatDeliveryMessage } from "../../services/whatsappPresetService";
import { WhatsAppIcon } from "../ui/BrandIcons";

export interface CompletedJobPayload {
  record: ServiceRecord;
  customer?: Customer;
  vehicle?: Vehicle;
}

export interface DeliveryBillModalProps {
  completedJob: CompletedJobPayload | null;
  onClose: () => void;
}

export function DeliveryBillModal({
  completedJob,
  onClose,
}: DeliveryBillModalProps) {
  useBackHandler(() => {
    onClose();
    return true;
  }, Boolean(completedJob), 85);

  return (
    <AnimatePresence>
      {completedJob && (() => {
        const { record, customer, vehicle } = completedJob;
        const custName = customer?.name ? capitalizeName(customer.name) : "Customer";
        const custPhone = customer?.phone || "";
        const cleanPhone = cleanPhoneNumber(custPhone);
        const vehicleTitle = vehicle ? `${vehicle.make ? vehicle.make + ' ' : ''}${vehicle.model}`.trim() : "Vehicle";
        const plateNo = vehicle?.plateNumber || "";

        const partsListStr = formatPartsListForWhatsApp(record.partsUsed);

        const presets = getWhatsAppPresetsSync();
        const waText = formatDeliveryMessage(presets.deliveryTemplate, {
          customerName: custName,
          vehicleTitle,
          vehicleMake: vehicle?.make,
          vehicleModel: vehicle?.model,
          vehiclePlate: plateNo,
          partsList: partsListStr,
          laborCost: formatCurrency(record.laborCost || 0),
          totalCost: formatCurrency(record.totalCost || 0),
          jobDescription: record.description || 'Service Maintenance',
        });

        const waUrl = buildWhatsAppUrl(cleanPhone, waText);

        return (
          <Portal>
            <div className="viewport-fill z-[9999] bg-workshop-bg flex flex-col font-sans overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full min-h-full flex flex-col justify-between p-6 md:p-10 sheet-header-safe sheet-footer-safe max-w-3xl mx-auto space-y-6"
              >
                {/* Top Header Bar */}
                <div className="flex items-center justify-between border-b border-workshop-border/30 pb-5">
                  <div className="flex items-center gap-3.5">
                    <MessageSquare className="w-7 h-7 text-whatsapp shrink-0" />
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-success/15 border border-status-success/30 text-status-success text-[10px] font-black uppercase tracking-widest mb-0.5">
                        Job Card Completed
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-workshop-text tracking-tight uppercase leading-tight">
                        Delivery Message
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-3 text-workshop-muted hover:text-workshop-text hover:bg-workshop-border/20 rounded-full transition-all cursor-pointer"
                    title="Close"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Content Body */}
                <div className="space-y-6 my-auto">
                  {/* Client & Vehicle Summary */}
                  <div className="bg-workshop-bg/60 border border-workshop-border/30 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-workshop-muted uppercase tracking-wider text-xs">Client</span>
                      <span className="font-black text-workshop-text uppercase text-sm">{custName}</span>
                    </div>
                    <div className="h-px bg-workshop-border/10" />
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-workshop-muted uppercase tracking-wider text-xs">Vehicle</span>
                      <span className="font-bold uppercase flex items-center gap-2 text-sm">
                        <span className="text-workshop-text">{vehicleTitle}</span>
                        {plateNo && (
                          <>
                            <span className="text-workshop-muted">/</span>
                            <span className="font-plate font-black text-secondary">{plateNo}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Final Bill Breakdown */}
                  <div className="bg-workshop-bg/80 border border-status-success/20 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-workshop-border/20 pb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-status-success" />
                        <span className="text-sm font-black uppercase tracking-wider text-workshop-text">
                          Final Bill Summary
                        </span>
                      </div>
                    </div>

                    {/* Parts List */}
                    <div className="space-y-2 text-sm">
                      <span className="text-xs font-bold text-workshop-muted uppercase tracking-wider block">
                        Fixed / Replaced Parts
                      </span>
                      {record.partsUsed && record.partsUsed.length > 0 ? (
                        record.partsUsed.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-workshop-surface/60 px-4 py-2.5 rounded-xl border border-workshop-border/10 font-medium">
                            <span className="text-workshop-text truncate max-w-[280px]">
                              {p.name} <span className="text-workshop-muted font-bold">x{p.quantity}</span>
                            </span>
                            <span className="font-numeric font-bold text-workshop-text">
                              {formatCurrency(p.unitPrice * p.quantity)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-workshop-muted italic text-xs px-1">
                          No replacement parts billed.
                        </div>
                      )}
                    </div>

                    {/* Labor & Total */}
                    <div className="pt-3 border-t border-workshop-border/20 space-y-2 text-sm">
                      <div className="flex justify-between items-center text-workshop-muted">
                        <span className="font-bold uppercase tracking-wider text-xs">Labor Charges</span>
                        <span className="font-numeric font-bold text-workshop-text">{formatCurrency(record.laborCost || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-workshop-border/20">
                        <span className="font-black uppercase tracking-wider text-sm text-workshop-text">Final Bill Amount</span>
                        <span className="font-numeric font-black text-2xl text-status-success">{formatCurrency(record.totalCost || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-workshop-border/20">
                  {custPhone ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className="flex-1 py-4 px-6 bg-whatsapp hover:bg-whatsapp-dark text-white rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-whatsapp/20 transition-all cursor-pointer active:scale-95"
                    >
                      <WhatsAppIcon className="w-5 h-5 shrink-0" />
                      <span>Send WhatsApp Message</span>
                    </a>
                  ) : (
                    <div className="text-center text-status-urgent text-sm font-bold py-3 flex-1">
                      No phone number available
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-4 px-8 bg-workshop-bg hover:bg-workshop-surface border border-workshop-border text-workshop-muted hover:text-workshop-text rounded-2xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        );
      })()}
    </AnimatePresence>
  );
}
