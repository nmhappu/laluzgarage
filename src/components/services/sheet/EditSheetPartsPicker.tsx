import React, { useState, useMemo } from "react";
import { ChevronDown, Search, X, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Part, ServiceRecord } from "../../../types";
import { formatCurrency, cn } from "../../../lib/utils";
import { useBackHandler } from "../../../contexts/UIContext";

export interface EditSheetPartsPickerProps {
  parts: Part[];
  partsUsed?: ServiceRecord["partsUsed"];
  onChangePartsUsed: (updated: NonNullable<ServiceRecord["partsUsed"]>) => void;
}

export function EditSheetPartsPicker({
  parts,
  partsUsed = [],
  onChangePartsUsed,
}: EditSheetPartsPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close parts picker dropdown before closing the parent sheet
  useBackHandler(() => {
    setDropdownOpen(false);
    return true;
  }, dropdownOpen, 70);

  const filteredParts = useMemo(() => {
    if (!searchQuery.trim()) return parts;
    const q = searchQuery.toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [parts, searchQuery]);

  const addPart = (partId: string) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;

    const existing = partsUsed.find((p) => p.partId === partId);
    if (existing) {
      onChangePartsUsed(
        partsUsed.map((p) =>
          p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p
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

  return (
    <div className="space-y-3">
      <label className="text-[11px] font-bold uppercase tracking-wider text-workshop-muted block px-1">
        Replaced Parts and Spares
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full h-11 px-4 bg-workshop-surface/40 hover:bg-workshop-surface/60 border border-workshop-border rounded-xl shadow-sm text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-workshop-accent flex items-center justify-between group text-left"
        >
          <span className="text-workshop-muted/80 font-medium truncate">
            Select parts...
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-workshop-muted transition-transform duration-300 shrink-0",
              dropdownOpen && "rotate-180"
            )}
          />
        </button>

        {dropdownOpen && (
          <div
            className="fixed inset-0 z-[120]"
            onClick={() => {
              setDropdownOpen(false);
              setSearchQuery("");
            }}
          />
        )}

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.99 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 w-full bg-workshop-card border border-workshop-border rounded-2xl shadow-2xl z-[130] overflow-hidden flex flex-col max-h-72"
            >
              <div className="p-2 border-b border-workshop-border bg-workshop-bg/50 flex items-center gap-2">
                <Search className="w-4 h-4 text-workshop-muted shrink-0 ml-1.5" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type parts name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-sm text-workshop-text focus:outline-none placeholder:text-workshop-muted/60 py-1"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1 hover:bg-workshop-surface rounded-md transition-colors"
                  >
                    <X className="w-3 h-3 text-workshop-muted hover:text-workshop-text" />
                  </button>
                )}
              </div>

              <div className="overflow-y-auto max-h-56 p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-workshop-border">
                {filteredParts.length > 0 ? (
                  filteredParts.map((p) => {
                    const isOutOfStock = p.stockQuantity <= 0;
                    const isLowStock = !isOutOfStock && p.stockQuantity < 10;

                    return (
                      <button
                        type="button"
                        key={p.id}
                        disabled={isOutOfStock}
                        onClick={() => addPart(p.id!)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group/item",
                          isOutOfStock
                            ? "opacity-4 relative shadow-none cursor-not-allowed bg-transparent"
                            : "hover:bg-workshop-surface/60 active:scale-[0.98]"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-workshop-text uppercase group-hover/item:text-workshop-accent transition-colors">
                              {p.name}
                            </span>
                            {p.category && (
                              <span className="text-[9px] bg-workshop-surface text-workshop-muted px-1.5 py-0.5 rounded-md font-mono tracking-wider uppercase">
                                {p.category}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1.5">
                            {isOutOfStock ? (
                              <span className="flex items-center gap-1.5 text-[10px] font-black text-status-urgent uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 bg-status-urgent rounded-full animate-pulse" />
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                Low Stock: {p.stockQuantity} rem.
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-workshop-secondary uppercase tracking-widest opacity-80">
                                <span className="w-1.5 h-1.5 bg-workshop-accent rounded-full" />
                                In Stock: {p.stockQuantity}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right pl-3 shrink-0">
                          <span className="text-xs font-black text-workshop-accent bg-workshop-accent/5 px-2 py-1 rounded-lg border border-workshop-accent/15">
                            {formatCurrency(p.price)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-xs text-workshop-muted italic">
                    No parts match "{searchQuery}"
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
        {partsUsed && partsUsed.length > 0 ? (
          partsUsed.map((up, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-workshop-surface/20 rounded-2xl border border-workshop-border/60 hover:bg-workshop-surface/30 transition-all shadow-sm"
            >
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs font-bold text-workshop-text truncate">
                  {up.name}
                </p>
                <p className="text-[10px] font-bold text-workshop-muted tracking-wide flex items-center gap-1.5 mt-0.5">
                  <span className="text-workshop-accent">{formatCurrency(up.unitPrice)}</span>
                  <span>×</span>
                  <span>{up.quantity} units</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(idx, -1)}
                  className="w-7 h-7 bg-workshop-surface border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-status-urgent hover:bg-status-urgent/15 hover:border-status-urgent/30 transition-all text-sm outline-none"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-5 text-center font-black text-xs text-workshop-text">
                  {up.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(idx, 1)}
                  className="w-7 h-7 bg-workshop-surface border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-workshop-accent hover:bg-workshop-accent/15 hover:border-workshop-accent/30 transition-all text-sm outline-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-5 border border-dashed border-workshop-border/60 rounded-2xl bg-workshop-surface/5">
            <p className="text-xs text-workshop-muted italic">
              No spare parts assigned to this repair.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
