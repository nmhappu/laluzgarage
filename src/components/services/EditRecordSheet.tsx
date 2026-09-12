import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, RefreshCw } from "lucide-react";
import { Portal } from "../Portal";
import type { ServiceRecord, Vehicle, Customer, Part } from "../../types";
import { EditSheetHeader } from "./sheet/EditSheetHeader";
import { EditSheetVehicleHero } from "./sheet/EditSheetVehicleHero";
import { EditSheetTaskChecklist } from "./sheet/EditSheetTaskChecklist";
import { EditSheetPartsPicker } from "./sheet/EditSheetPartsPicker";
import { EditSheetBilling } from "./sheet/EditSheetBilling";
import { EditSheetStatusSelector } from "./sheet/EditSheetStatusSelector";

export interface EditRecordSheetProps {
  editingRecord: ServiceRecord | null;
  setEditingRecord: React.Dispatch<React.SetStateAction<ServiceRecord | null>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isUpdating: boolean;
  vehicleMap: Map<string, Vehicle>;
  customers: Customer[];
  parts: Part[];
  onWhatsAppClick: (record: ServiceRecord, customer?: Customer, vehicle?: Vehicle) => void;
  readOnly?: boolean;
}

export function EditRecordSheet({
  editingRecord,
  setEditingRecord,
  onClose,
  onSubmit,
  isUpdating,
  vehicleMap,
  customers,
  parts,
  onWhatsAppClick,
  readOnly = false,
}: EditRecordSheetProps) {
  if (!editingRecord) return null;

  const vehicle = vehicleMap.get(editingRecord.vehicleId);
  const customer = customers.find((c) => c.id === editingRecord.customerId);
  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "";

  return (
    <AnimatePresence>
      <Portal>
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
          className="viewport-fill z-[100] bg-workshop-bg flex flex-col w-full overflow-hidden font-sans text-workshop-text accelerate-gpu will-change-transform"
        >
          <EditSheetHeader
            vehicleTitle={vehicleTitle}
            intakeDate={(editingRecord.date || editingRecord.createdAt) as string}
            expectedDeliveryDate={editingRecord.expectedDeliveryDate}
            onClose={onClose}
          />

          <form onSubmit={onSubmit} className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-grow overflow-y-auto px-6 py-6 space-y-6 bg-workshop-surface/10 scrollbar-thin">
              <div className="max-w-4xl mx-auto w-full space-y-5">
                <EditSheetVehicleHero
                  vehicle={vehicle}
                  customer={customer}
                  editingRecord={editingRecord}
                  onWhatsAppClick={onWhatsAppClick}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Checklist, Parts, and Final Remarks */}
                  <div className="space-y-6">
                    <EditSheetTaskChecklist
                      description={editingRecord.description || ""}
                      onChangeDescription={(newDesc) =>
                        setEditingRecord({ ...editingRecord, description: newDesc })
                      }
                    />

                    <EditSheetPartsPicker
                      parts={parts}
                      partsUsed={editingRecord.partsUsed}
                      onChangePartsUsed={(updatedParts) =>
                        setEditingRecord({ ...editingRecord, partsUsed: updatedParts })
                      }
                    />

                    {/* Final Remarks */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-workshop-muted px-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-workshop-secondary" />
                        Final Remarks & Advice
                      </label>
                      <textarea
                        value={editingRecord.finalRemarks || ""}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            finalRemarks: e.target.value,
                          })
                        }
                        className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-workshop-accent/50 px-4 py-3 rounded-2xl outline-none h-20 resize-none text-sm focus:ring-1 focus:ring-workshop-accent text-workshop-text transition-all placeholder:text-workshop-muted/60"
                        placeholder="Provide advice, parts warranty info, or technical notes for the customer..."
                      />
                    </div>
                  </div>

                  {/* Right Column: Status, Odometer, Financial Summary */}
                  <div className="space-y-6">
                    <EditSheetStatusSelector
                      status={editingRecord.status}
                      completionMileage={editingRecord.completionMileage}
                      onChangeStatus={(newStatus) =>
                        setEditingRecord({ ...editingRecord, status: newStatus })
                      }
                      onChangeCompletionMileage={(newMileage) =>
                        setEditingRecord({ ...editingRecord, completionMileage: newMileage })
                      }
                    />

                    <EditSheetBilling
                      laborCost={editingRecord.laborCost || 0}
                      partsUsed={editingRecord.partsUsed}
                      onChangeLaborCost={(newCost) =>
                        setEditingRecord({ ...editingRecord, laborCost: newCost })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Material Sticky Bottom Action Footer Bar */}
            <div className="px-6 pt-5 sheet-footer-safe bg-workshop-bg border-t border-workshop-border/40 flex items-center justify-end gap-3.5 shrink-0 z-20 shadow-lg">
              {readOnly ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 bg-workshop-surface border border-workshop-border rounded-2xl text-xs font-black text-workshop-text hover:bg-workshop-surface/80 active:scale-[0.98] transition-all uppercase tracking-widest outline-none"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 border border-workshop-border hover:border-workshop-muted-foreground/30 rounded-2xl text-xs font-bold text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface active:scale-[0.98] transition-all uppercase tracking-widest outline-none"
                  >
                    DISCARD CHANGES
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-8 py-3 bg-workshop-accent text-workshop-bg rounded-2xl text-xs font-black shadow-lg hover:brightness-115 active:scale-[0.98] transition-all uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-55 outline-none"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Record</span>
                    )}
                  </button>
                </>
              )}
            </div>
          </form>
        </motion.div>
      </Portal>
    </AnimatePresence>
  );
}
