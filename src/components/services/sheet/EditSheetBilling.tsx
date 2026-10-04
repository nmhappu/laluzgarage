import React from "react";
import { Receipt, IndianRupee, Sparkles } from "lucide-react";
import NumberFlow, { type Format } from "@number-flow/react";
import type { ServiceRecord } from "../../../types";

export interface EditSheetBillingProps {
  laborCost: number;
  partsUsed?: ServiceRecord["partsUsed"];
  onChangeLaborCost: (cost: number) => void;
}

const inrFormat: Format = {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
};

export function EditSheetBilling({
  laborCost,
  partsUsed = [],
  onChangeLaborCost,
}: EditSheetBillingProps) {
  const partsSubtotal = partsUsed.reduce(
    (acc, p) => acc + p.unitPrice * p.quantity,
    0
  );
  const totalPartsQuantity = partsUsed.reduce(
    (acc, p) => acc + p.quantity,
    0
  );
  const estimatedTotal = (laborCost || 0) + partsSubtotal;

  return (
    <div className="bg-workshop-card/80 border border-workshop-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 font-sans">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-workshop-surface border border-workshop-border/60 flex items-center justify-center text-workshop-accent shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-workshop-text leading-tight">
            Billing & Charges
          </h3>
        </div>

        <span className="text-[11px] font-black text-workshop-accent bg-workshop-accent/10 border border-workshop-accent/20 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-workshop-accent shrink-0" />
          <span>Payable:</span>
          <NumberFlow value={estimatedTotal} locales="en-IN" format={inrFormat} />
        </span>
      </div>

      {/* Labor Input Field */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-workshop-muted uppercase tracking-wider block px-0.5">
          Labor & Service Fee (INR)
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-xs font-black text-workshop-muted pointer-events-none select-none flex items-center">
            <IndianRupee className="w-3.5 h-3.5" />
          </span>
          <input
            type="number"
            min="0"
            value={laborCost === 0 ? "" : laborCost || ""}
            onChange={(e) => {
              const val = e.target.value;
              onChangeLaborCost(val === "" ? 0 : Number(val));
            }}
            className="w-full bg-workshop-surface/50 border border-workshop-border/80 focus:border-workshop-accent pl-9 pr-4 py-2.5 rounded-xl outline-none text-sm font-black text-workshop-text focus:ring-1 focus:ring-workshop-accent transition-all placeholder:text-workshop-muted/40"
            placeholder="0"
          />
        </div>
      </div>

      {/* Invoice Breakdown Container */}
      <div className="p-4 bg-workshop-surface/50 border border-workshop-border/60 rounded-xl space-y-3 relative overflow-hidden">
        <div className="space-y-2 text-xs font-semibold">
          <div className="flex justify-between items-center text-workshop-muted">
            <span>Labor Charges:</span>
            <span className="text-workshop-text font-bold">
              <NumberFlow value={laborCost || 0} locales="en-IN" format={inrFormat} />
            </span>
          </div>

          <div className="flex justify-between items-center text-workshop-muted">
            <span className="flex items-center gap-1.5">
              <span>Parts & Spares:</span>
              {totalPartsQuantity > 0 && (
                <span className="text-[10px] text-workshop-muted/70 font-mono">
                  ({totalPartsQuantity} {totalPartsQuantity === 1 ? "unit" : "units"})
                </span>
              )}
            </span>
            <span className="text-workshop-text font-bold">
              <NumberFlow value={partsSubtotal} locales="en-IN" format={inrFormat} />
            </span>
          </div>
        </div>

        {/* Dashed Total Separator */}
        <div className="pt-2.5 border-t border-dashed border-workshop-border/80 flex justify-between items-baseline">
          <span className="text-[10px] font-black uppercase tracking-wider text-workshop-muted">
            Estimated Total
          </span>
          <span className="text-lg sm:text-xl font-black text-workshop-accent tracking-tight">
            <NumberFlow value={estimatedTotal} locales="en-IN" format={inrFormat} />
          </span>
        </div>
      </div>
    </div>
  );
}
