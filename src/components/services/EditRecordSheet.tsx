import React, { useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { FileText, RefreshCw, CheckCircle2 } from "lucide-react";
import { Portal } from "../ui/Portal";
import { useIsMobile } from "../../hooks/useResponsiveSearch";
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
  const isMobile = useIsMobile();
  const dragControls = useDragControls();

  // Escape key listener for fast dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingRecord) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingRecord, onClose]);

  const vehicle = editingRecord ? vehicleMap.get(editingRecord.vehicleId) : undefined;
  const customer = editingRecord ? customers.find((c) => c.id === editingRecord.customerId) : undefined;
  const vehicleTitle = vehicle ? `${vehicle.make} ${vehicle.model}` : "Job Card";

  const renderFormContent = () => {
    if (!editingRecord) return null;

    return (
      <form onSubmit={onSubmit} className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-grow overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 bg-workshop-surface/20 scrollbar-thin">
          <div className="w-full space-y-4">
            <EditSheetVehicleHero
              vehicle={vehicle}
              customer={customer}
              editingRecord={editingRecord}
              onWhatsAppClick={onWhatsAppClick}
            />

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

            {/* Final Remarks & Advice Card */}
            <div className="bg-workshop-card/80 border border-workshop-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 font-sans">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-workshop-surface border border-workshop-border/60 flex items-center justify-center text-workshop-accent shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-workshop-text leading-tight">
                  Final Remarks & Advice
                </h3>
              </div>

              <textarea
                value={editingRecord.finalRemarks || ""}
                onChange={(e) =>
                  setEditingRecord({
                    ...editingRecord,
                    finalRemarks: e.target.value,
                  })
                }
                className="w-full bg-workshop-surface/50 border border-workshop-border/80 focus:border-workshop-accent focus:ring-1 focus:ring-workshop-accent px-3.5 py-2.5 rounded-xl outline-none text-xs font-medium text-workshop-text placeholder:text-workshop-muted/40 transition-all resize-none min-h-[72px]"
                placeholder="Provide advice, parts warranty info, or technical notes for the customer..."
              />
            </div>

            <EditSheetBilling
              laborCost={editingRecord.laborCost || 0}
              partsUsed={editingRecord.partsUsed}
              onChangeLaborCost={(newCost) =>
                setEditingRecord({ ...editingRecord, laborCost: newCost })
              }
            />
          </div>
        </div>

        {/* Fixed Material Sticky Bottom Action Footer Bar */}
        <div className="px-5 sm:px-6 py-3.5 sheet-footer-safe bg-workshop-surface/90 backdrop-blur-md border-t border-workshop-border/60 flex items-center justify-end gap-3 shrink-0 z-20 shadow-lg">
          {readOnly ? (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-workshop-card border border-workshop-border rounded-xl text-xs font-black text-workshop-text hover:bg-workshop-surface active:scale-95 transition-all uppercase tracking-wider outline-none cursor-pointer"
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 sm:px-5 py-2.5 border border-workshop-border/80 hover:border-workshop-muted/40 rounded-xl text-xs font-bold text-workshop-muted hover:text-workshop-text hover:bg-workshop-card/80 active:scale-95 transition-all uppercase tracking-wider outline-none cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-5 sm:px-6 py-2.5 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50 outline-none cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : editingRecord.status === "completed" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Complete & Save</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </>
          )}
        </div>
      </form>
    );
  };

  // Mobile View: Bottom Sheet modal with backdrop in Portal
  if (isMobile) {
    return (
      <AnimatePresence>
        {editingRecord && (
          <Portal>
            {/* Scrim Backdrop */}
            <motion.div
              key="mobile-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet */}
            <motion.div
              key="mobile-bottom-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.7 }}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 100 || info.velocity.y > 350) {
                  onClose();
                }
              }}
              className="fixed inset-x-0 bottom-0 z-[101] h-[92dvh] max-h-[92dvh] bg-workshop-surface border-t border-workshop-border/60 rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden font-sans text-workshop-text accelerate-gpu will-change-transform"
            >
              {/* Drag Handle Notch */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="w-full pt-3 pb-2.5 flex justify-center items-center cursor-grab active:cursor-grabbing touch-none shrink-0 select-none"
                title="Drag down to close"
              >
                <div className="w-12 h-1.5 bg-workshop-muted/40 rounded-full" />
              </div>

              <EditSheetHeader
                vehicleTitle={vehicleTitle}
                intakeDate={(editingRecord.date || editingRecord.createdAt) as string}
                expectedDeliveryDate={editingRecord.expectedDeliveryDate}
                onClose={onClose}
                onPointerDown={(e) => dragControls.start(e)}
              />

              {renderFormContent()}
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    );
  }

  // Desktop View: Standard Co-planar Side Sheet docked in-flow
  return (
    <AnimatePresence>
      {editingRecord && (
        <motion.div
          key="desktop-side-sheet"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="hidden md:flex shrink-0 h-full overflow-hidden"
        >
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="w-[380px] lg:w-[480px] xl:w-[540px] shrink-0 h-full flex flex-col"
          >
            <div className="w-full h-full bg-workshop-surface border-l border-workshop-border/60 rounded-none shadow-none overflow-hidden flex flex-col font-sans text-workshop-text">
              <EditSheetHeader
                vehicleTitle={vehicleTitle}
                intakeDate={(editingRecord.date || editingRecord.createdAt) as string}
                expectedDeliveryDate={editingRecord.expectedDeliveryDate}
                onClose={onClose}
              />

              {renderFormContent()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
