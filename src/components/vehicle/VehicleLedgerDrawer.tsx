import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Package, Wrench, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency, cn } from '../../lib/utils';
import { Portal } from '../Portal';
import type { Customer, Vehicle, ServiceRecord } from '../../types';

const capitalizeName = (name?: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface VehicleLedgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicleForLedger: Vehicle | null;
  serviceRecords: ServiceRecord[];
  customers: Customer[];
}

export function VehicleLedgerDrawer({
  isOpen,
  onClose,
  selectedVehicleForLedger,
  serviceRecords,
  customers,
}: VehicleLedgerDrawerProps) {
  if (!isOpen || !selectedVehicleForLedger) return null;

  const vehicleRecords = serviceRecords.filter(r => r.vehicleId === selectedVehicleForLedger.id);
  const totalSpend = vehicleRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);

  return (
    <Portal>
      <motion.div
        initial={{ x: "100%", opacity: 0.95 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="fixed inset-0 z-[100] bg-workshop-bg flex flex-col h-screen w-full overflow-hidden font-sans text-workshop-text"
      >
        {/* Header of the Ledger (Top Bar) */}
        <div className="flex justify-between items-center pl-2 pr-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 bg-workshop-bg shrink-0 select-none">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center p-2 rounded-2xl text-workshop-muted hover:text-workshop-text transition-all duration-200 outline-none active:scale-95 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-[#3B82F6]" />
          </button>

          <div className="flex-grow pl-2">
            <h2 
              style={{ fontFamily: "'Google Sans', 'Inter', sans-serif" }}
              className="text-lg sm:text-2xl font-black text-[#10B981] tracking-tight uppercase leading-none"
            >
              {selectedVehicleForLedger.make} {selectedVehicleForLedger.model}
            </h2>
          </div>

          <div className="flex flex-col items-end select-none text-right">
            <span 
              style={{ fontFamily: "'Google Sans', 'Inter', sans-serif" }}
              className="text-lg sm:text-2xl font-black text-[#3B82F6] uppercase tracking-tight leading-none"
            >
              {selectedVehicleForLedger.plateNumber}
            </span>
          </div>
        </div>

        {/* Ledger Summary Dashboard Strip */}
        <div className="bg-workshop-surface/40 px-6 py-5 border-b border-workshop-border/20 shrink-0">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-6">
            <div>
              <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest mb-1 leading-none">Total Maintenance Value</p>
              <p className="text-2xl font-black text-[#3B82F6] tracking-tighter leading-none">
                {formatCurrency(totalSpend)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest mb-1 leading-none font-sans">Recorded Jobs</p>
              <p className="text-2xl font-black text-workshop-text tracking-tighter leading-none font-sans">
                {vehicleRecords.length}
              </p>
            </div>
          </div>
        </div>

        {/* Service list Container -- CARDLESS, FLAT, STREAMLINED */}
        <div className="flex-1 overflow-y-auto px-6 py-8 bg-workshop-bg scrollbar-thin">
          <div className="max-w-4xl mx-auto w-full space-y-10">
            {vehicleRecords.length > 0 ? (
              <div className="space-y-8">
                {vehicleRecords.map((record, index) => {
                  let formattedDate = 'Unknown Date';
                  try {
                    if (record.date) {
                      const parsed = new Date(record.date);
                      if (!isNaN(parsed.getTime())) {
                        formattedDate = format(parsed, 'dd MMM yyyy');
                      }
                    }
                  } catch (e) {
                    console.error("Error parsing date:", e);
                  }

                  const owner = customers.find(c => c.id === record.customerId);

                  return (
                    <div key={record.id} className="space-y-8">
                      {index > 0 && (
                        <div className="h-px bg-workshop-border/40 w-full" />
                      )}
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="space-y-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <span className="text-base font-black text-[#3B82F6] uppercase tracking-widest leading-none">
                                {formattedDate}
                              </span>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                record.status === 'completed' ? "text-status-success" :
                                record.status === 'in-progress' ? "text-status-pending" :
                                record.status === 'pending' ? "text-status-urgent" :
                                "text-workshop-muted"
                              )}>
                                {record.status}
                              </span>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest leading-none font-sans">
                                Owned By <span className="text-workshop-text font-black uppercase">{owner ? capitalizeName(owner.name) : "Unknown Owner"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-start sm:items-end shrink-0 select-none">
                            <p className="text-[8px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-1">Invoiced Amount</p>
                            <p className="text-xl sm:text-2xl font-black text-[#3B82F6] tracking-tight leading-none font-sans">{formatCurrency(record.totalCost)}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Maintenance Description without box frames, clean border bar */}
                          <div className="pl-4 border-l-2 border-[#3B82F6]/30 py-1">
                            <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest mb-2 font-sans">COMPLAINT / REPAIR NOTES</p>
                            <div className="text-workshop-text/90 text-xs font-medium leading-relaxed space-y-1.5 font-sans">
                              {record.description.split("\n").map((line, i) => {
                                const cleanLine = line.replace(/^\[[x ]\]\s*/, "");
                                return cleanLine ? (
                                  <div key={i} className="flex items-start gap-2">
                                    <span className="text-[#3B82F6] mt-0.5">•</span>
                                    <span>{cleanLine}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>

                          {record.personalItems && (
                            <div className="p-3 bg-status-success/5 rounded-xl border border-status-success/10 flex items-center gap-3">
                              <Package className="w-5 h-5 text-status-success shrink-0" />
                              <div className="flex items-center gap-2 flex-1 min-w-0 font-sans">
                                <span className="text-[10px] font-black text-status-success uppercase tracking-widest leading-none shrink-0 font-sans">Personal Items:</span>
                                <p className="text-xs text-workshop-text/90 font-bold leading-relaxed whitespace-pre-line truncate font-sans">
                                  {record.personalItems}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Split Metrics with subtle borders */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                            <div className="border border-workshop-border/30 bg-workshop-surface/25 p-3 rounded-xl flex flex-col justify-between">
                              <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-sans">Mileage Recorded</span>
                              <div className="flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5 text-[#3B82F6]" />
                                <span className="text-xs font-black text-workshop-text leading-none font-sans">{(record.mileage || 0).toLocaleString()} KM</span>
                              </div>
                            </div>
                            <div className="border border-workshop-border/30 bg-workshop-surface/25 p-3 rounded-xl flex flex-col justify-between">
                              <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-sans">Inventory Consumed</span>
                              <div className="flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-[#3B82F6]" />
                                <span className="text-xs font-black text-workshop-text leading-none font-sans">{(record.partsUsed || []).length} SKU items</span>
                              </div>
                            </div>
                            <div className="border border-workshop-border/30 bg-workshop-surface/25 p-3 rounded-xl flex flex-col justify-between">
                              <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-sans">Labour Charges</span>
                              <span className="text-xs font-black text-workshop-text leading-none mt-1 font-sans">{formatCurrency(record.laborCost)}</span>
                            </div>
                            <div className="border border-workshop-border/30 bg-workshop-surface/25 p-3 rounded-xl flex flex-col justify-between">
                              <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-sans">Materials Cost</span>
                              <span className="text-xs font-black text-workshop-text leading-none mt-1 font-sans">{formatCurrency(record.partsCost)}</span>
                            </div>
                          </div>

                          {/* Custom allocated parts list breakdown */}
                          {record.partsUsed && record.partsUsed.length > 0 && (
                            <div className="bg-workshop-surface/20 border border-workshop-border/20 rounded-xl p-4 space-y-2.5">
                              <p className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest font-sans">Itemized Parts Consumption</p>
                              <div className="space-y-2 font-sans">
                                {record.partsUsed.map((parts, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs px-1 py-0.5 hover:bg-workshop-surface/30 rounded transition-colors font-sans">
                                    <span className="text-workshop-text font-bold">{parts.name} <span className="text-[10px] text-workshop-muted font-normal ml-1">x{parts.quantity}</span></span>
                                    <span className="text-[#3B82F6] font-mono text-xs font-black">{formatCurrency(parts.unitPrice * parts.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-24 select-none">
                <div className="w-16 h-16 bg-workshop-surface/50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-workshop-muted border border-workshop-border/20">
                  <ShieldCheck className="w-8 h-8 opacity-30 text-[#3B82F6]" />
                </div>
                <h3 className="text-workshop-text font-black uppercase tracking-tight text-sm font-sans">Clean Service History</h3>
                <p className="text-workshop-muted text-xs mt-3 max-w-xs mx-auto leading-relaxed font-sans">No previous maintenance operations or workshop transactions are cataloged for this vehicle in the cloud database.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Sticky Action Footer */}
        <div className="pt-6 px-6 pb-14 sm:pb-6 bg-workshop-bg border-t border-workshop-border/30 flex justify-end shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-8 py-3.5 bg-[#3B82F6] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:brightness-110 shadow-lg shadow-[#3B82F6]/20 active:scale-95 transition-all outline-none"
          >
            Close Ledger
          </button>
        </div>
      </motion.div>
    </Portal>
  );
}
