import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Portal } from "../Portal";
import { MaterialCalendar } from "../ui/MaterialCalendar";
import type { ServiceRecord } from "../../types";

export interface EditDetailsModalProps {
  detailsRecord: ServiceRecord | null;
  setDetailsRecord: React.Dispatch<React.SetStateAction<ServiceRecord | null>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isUpdating: boolean;
  readOnly?: boolean;
}

export function EditDetailsModal({
  detailsRecord,
  setDetailsRecord,
  onClose,
  onSubmit,
  isUpdating,
  readOnly = false,
}: EditDetailsModalProps) {
  return (
    <AnimatePresence>
      {detailsRecord && (
        <Portal>
          <motion.div
            initial={{ x: "100%", opacity: 0.95 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="viewport-fill z-[100] bg-workshop-bg flex flex-col w-full overflow-hidden font-sans text-workshop-text"
          >
            {/* Header Bar */}
            <div className="flex justify-between items-center pl-2 pr-6 sheet-header-safe pb-4 bg-workshop-bg border-b border-workshop-border/30 shrink-0 select-none">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center p-2 rounded-2xl text-workshop-muted hover:text-workshop-text transition-all duration-200 outline-none active:scale-95 group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-workshop-accent" />
              </button>

              <div className="flex-1 pl-2">
                <h2 className="text-lg sm:text-2xl font-black text-workshop-accent tracking-tight uppercase leading-none font-sans">
                  {readOnly ? "Service Details (Read Only)" : "Edit Service Details"}
                </h2>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl mx-auto w-full">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted px-1">
                    Personal Items / Valuables
                  </label>
                  <textarea
                    value={detailsRecord.personalItems || ""}
                    onChange={(e) =>
                      setDetailsRecord({ ...detailsRecord, personalItems: e.target.value })
                    }
                    className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none text-workshop-text focus:ring-1 focus:ring-workshop-accent transition-all text-sm min-h-[60px] resize-none"
                    placeholder="Captured items during intake..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted px-1 flex items-center justify-between">
                    Maintenance Request
                    <span className="text-[9px] lowercase font-normal opacity-60">Each line becomes a checklist item</span>
                  </label>
                  <textarea
                    required
                    value={detailsRecord.description}
                    onChange={(e) =>
                      setDetailsRecord({
                        ...detailsRecord,
                        description: e.target.value,
                      })
                    }
                    className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none h-32 resize-none text-sm focus:ring-1 focus:ring-workshop-accent text-workshop-text shadow-sm"
                    placeholder="Line 1: Item one&#10;Line 2: Item two"
                  />
                </div>

                <div className="space-y-1.5 px-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted flex items-center gap-1.5">
                    Expected Delivery Date
                    <span className="text-status-urgent">*</span>
                  </label>
                  <MaterialCalendar
                    value={detailsRecord.expectedDeliveryDate || ""}
                    onChange={(val) =>
                      setDetailsRecord({
                        ...detailsRecord,
                        expectedDeliveryDate: val,
                      })
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className="py-3 text-sm font-bold text-workshop-text focus:ring-1 focus:ring-workshop-accent"
                  />
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="pt-4 px-6 sheet-footer-safe bg-workshop-bg border-t border-workshop-border/30 flex justify-end gap-3 shrink-0">
                {readOnly ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-8 py-3.5 bg-workshop-surface border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-text hover:bg-workshop-surface/80 transition-all active:scale-[0.98]"
                  >
                    Close
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-3.5 border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface transition-all active:scale-[0.98]"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating || !detailsRecord.description || !detailsRecord.expectedDeliveryDate}
                      className="px-8 py-3.5 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-workshop-accent/20 hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale font-black"
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                      ) : (
                        "Save Details"
                      )}
                    </button>
                  </>
                )}
              </div>
            </form>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
