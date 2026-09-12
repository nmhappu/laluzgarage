import React from "react";
import { Receipt } from "lucide-react";
import type { ServiceRecord } from "../../../types";
import { formatCurrency } from "../../../lib/utils";

export interface EditSheetBillingProps {
  laborCost: number;
  partsUsed?: ServiceRecord["partsUsed"];
  onChangeLaborCost: (cost: number) => void;
}

export function EditSheetBilling({
  laborCost,
  partsUsed = [],
  onChangeLaborCost,
}: EditSheetBillingProps) {
  const partsSubtotal = partsUsed.reduce(
    (acc, p) => acc + p.unitPrice * p.quantity,
    0
  );
  const estimatedTotal = (laborCost || 0) + partsSubtotal;

  return (
    <div className="space-y-4 font-sans">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-workshop-muted uppercase tracking-wider block px-1">
          Labor Fee (INR)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-xs font-bold text-workshop-muted">
            ₹
          </span>
          <input
            type="number"
            value={laborCost === 0 ? "" : laborCost || ""}
            onChange={(e) => onChangeLaborCost(Number(e.target.value))}
            className="w-full bg-workshop-card border border-workshop-border pl-8 pr-4 py-3 rounded-2xl outline-none text-sm font-black focus:ring-1 focus:ring-workshop-accent text-workshop-text transition-all"
            placeholder="0"
          />
        </div>
      </div>

      {/* M3 Invoice Tonal Receipt Container */}
      <div className="p-5 bg-workshop-card border border-workshop-border/80 text-workshop-text rounded-2xl shadow-md space-y-3.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-workshop-accent/5 rounded-full -mr-10 -mt-10" />

        <div className="flex items-center gap-2 border-b border-workshop-border/40 pb-2">
          <Receipt className="w-4 h-4 text-workshop-accent" />
          <span className="text-[10px] font-black uppercase tracking-wider text-workshop-muted">
            Billing Invoice Breakdown
          </span>
        </div>

        <div className="space-y-2 text-xs font-medium">
          <div className="flex justify-between">
            <span className="text-workshop-muted">Labor Subtotal:</span>
            <span className="font-semibold">{formatCurrency(laborCost || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-workshop-muted">Parts Subtotal:</span>
            <span className="font-semibold">
              {formatCurrency(partsSubtotal)}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-dashed border-workshop-border/80 flex justify-between font-black text-lg items-baseline">
          <span className="text-workshop-accent text-[10px] uppercase tracking-wider">
            ESTIMATED TOTAL
          </span>
          <span className="font-sans font-black text-xl tracking-tight text-workshop-accent">
            {formatCurrency(estimatedTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
