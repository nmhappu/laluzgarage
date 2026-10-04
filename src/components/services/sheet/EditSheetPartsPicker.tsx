import React, { useState } from "react";
import { Minus, Plus, Trash2, Package, X } from "lucide-react";
import NumberFlow, { type Format } from "@number-flow/react";
import type { Part, ServiceRecord } from "../../../types";
import { cn } from "../../../lib/utils";
import { InventoryPartPickerModal } from "./InventoryPartPickerModal";

export interface EditSheetPartsPickerProps {
  parts: Part[];
  partsUsed?: ServiceRecord["partsUsed"];
  onChangePartsUsed: (updated: NonNullable<ServiceRecord["partsUsed"]>) => void;
}

const inrFormat: Format = {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
};

export function EditSheetPartsPicker({
  parts,
  partsUsed = [],
  onChangePartsUsed,
}: EditSheetPartsPickerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const partsSubtotal = (partsUsed || []).reduce(
    (acc, p) => acc + p.unitPrice * p.quantity,
    0
  );
  const totalPartsCount = (partsUsed || []).reduce(
    (acc, p) => acc + p.quantity,
    0
  );

  const handleSelectPart = (part: Part) => {
    const existing = partsUsed.find((p) => p.partId === part.id);
    if (existing) {
      onChangePartsUsed(
        partsUsed.map((p) =>
          p.partId === part.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      onChangePartsUsed([
        ...partsUsed,
        {
          partId: part.id as string,
          name: part.name,
          quantity: 1,
          unitPrice: part.price,
        },
      ]);
    }
  };

  const updateQuantity = (idx: number, delta: number) => {
    const current = [...partsUsed];
    if (delta < 0 && current[idx].quantity <= 1) {
      onChangePartsUsed(current.filter((_, i) => i !== idx));
    } else {
      current[idx] = {
        ...current[idx],
        quantity: current[idx].quantity + delta,
      };
      onChangePartsUsed(current);
    }
  };

  const removePart = (idx: number) => {
    onChangePartsUsed(partsUsed.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-workshop-card/80 border border-workshop-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 font-sans">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-workshop-surface border border-workshop-border/60 flex items-center justify-center text-workshop-accent shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-workshop-text leading-tight">
            Parts & Spares
          </h3>
        </div>

        {totalPartsCount > 0 ? (
          <span className="text-[11px] font-black text-workshop-accent bg-workshop-accent/10 border border-workshop-accent/20 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
            <NumberFlow value={partsSubtotal} locales="en-IN" format={inrFormat} />
            <span className="opacity-40">•</span>
            <span>
              <NumberFlow value={totalPartsCount} />
              <span className="ml-0.5 uppercase tracking-wider text-[10px]">
                {totalPartsCount === 1 ? "unit" : "units"}
              </span>
            </span>
          </span>
        ) : (
          <span className="text-[10px] font-bold text-workshop-muted bg-workshop-surface px-2 py-0.5 rounded-full border border-workshop-border/40">
            0 items
          </span>
        )}
      </div>

      {/* Button to Open Inventory Screen */}
      <button
        type="button"
        onClick={() => setIsPickerOpen(true)}
        className="w-full h-11 px-4 bg-workshop-surface/50 hover:bg-workshop-surface/80 border border-dashed border-workshop-border/80 hover:border-workshop-accent/60 rounded-xl text-xs font-black text-workshop-accent uppercase tracking-wider transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-98 shadow-xs"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>Add Parts From Inventory</span>
      </button>

      {/* Selected Parts List */}
      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
        {partsUsed && partsUsed.length > 0 ? (
          partsUsed.map((up, idx) => {
            const lineTotal = up.unitPrice * up.quantity;

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 sm:p-3 bg-workshop-surface/40 hover:bg-workshop-surface/60 rounded-xl border border-workshop-border/60 transition-all shadow-xs"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-xs font-bold text-workshop-text truncate">
                    {up.name}
                  </p>
                  <p className="text-[10px] font-semibold text-workshop-muted tracking-wide flex items-center gap-1.5 mt-0.5">
                    <NumberFlow
                      value={up.unitPrice}
                      locales="en-IN"
                      format={inrFormat}
                      className="text-workshop-accent"
                    />
                    <span>×</span>
                    <span>{up.quantity}</span>
                    <span className="opacity-40">=</span>
                    <span className="font-bold text-workshop-text">
                      <NumberFlow value={lineTotal} locales="en-IN" format={inrFormat} />
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, -1)}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-all border outline-none cursor-pointer active:scale-95",
                      up.quantity <= 1
                        ? "bg-status-urgent/10 border-status-urgent/30 text-status-urgent hover:bg-status-urgent/20"
                        : "bg-workshop-card border-workshop-border/80 text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface"
                    )}
                    title={up.quantity <= 1 ? "Remove part" : "Decrease quantity"}
                  >
                    {up.quantity <= 1 ? (
                      <Trash2 className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <span className="w-6 text-center font-black text-xs text-workshop-text inline-flex justify-center select-none">
                    <NumberFlow value={up.quantity} />
                  </span>

                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, 1)}
                    className="w-7 h-7 bg-workshop-card border border-workshop-border/80 rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-workshop-accent hover:border-workshop-accent/40 hover:bg-workshop-accent/10 transition-all outline-none cursor-pointer active:scale-95"
                    title="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removePart(idx)}
                    className="p-1 rounded-lg text-workshop-muted/60 hover:text-status-urgent transition-colors cursor-pointer outline-none ml-1"
                    title="Delete item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-5 border border-dashed border-workshop-border/70 rounded-xl bg-workshop-surface/10">
            <p className="text-xs text-workshop-muted font-medium">
              No spare parts assigned to this job.
            </p>
          </div>
        )}
      </div>

      {/* Full-Screen Inventory Part Picker Screen */}
      <InventoryPartPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        parts={parts}
        partsUsed={partsUsed}
        onSelectPart={handleSelectPart}
      />
    </div>
  );
}
