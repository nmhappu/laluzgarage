import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Package, Layers, DollarSign, Info, MapPin, Trash2 } from 'lucide-react';
import { Portal } from '../Portal';
import type { Part } from '../../types';

export interface PartFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  partData: Partial<Part>;
  onChange: (updated: Partial<Part>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export function PartFormModal({
  isOpen,
  mode,
  partData,
  onChange,
  onSubmit,
  onClose,
  onDelete,
  readOnly = false,
}: PartFormModalProps) {
  if (!isOpen) return null;

  const isEdit = mode === 'edit';
  const title = readOnly ? 'View Asset' : isEdit ? 'Edit Asset' : 'New Asset';
  const subtitle = isEdit ? 'REGISTRY REF' : 'INVENTORY LOG';
  const subValue = isEdit ? `ID: ${(partData.id || '').substring(0, 8)}` : 'REGISTRATION';
  const submitText = isEdit ? 'Update Asset Info' : 'Register New Asset';

  return (
    <AnimatePresence>
      <Portal>
        <motion.div
          initial={{ x: '100%', opacity: 0.95 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.95 }}
          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
          style={{ willChange: 'transform, opacity' }}
          className="viewport-fill z-[100] bg-workshop-bg flex flex-col w-full overflow-hidden font-sans text-workshop-text"
        >
          {/* Top Bar Header */}
          <div className="flex justify-between items-center pl-2 pr-6 sheet-header-safe pb-4 bg-workshop-bg border-b border-workshop-border/30 shrink-0 select-none">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center p-2 rounded-2xl text-workshop-muted hover:text-workshop-text transition-all duration-200 outline-none active:scale-95 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-secondary" />
            </button>

            <div className="flex-1 pl-1">
              <h2 className="text-base font-black text-secondary tracking-tight uppercase leading-none font-sans">
                {title}
              </h2>
            </div>

            <div className="flex flex-col items-end gap-0.5 text-right select-none">
              <span className="text-[9px] font-black text-workshop-muted uppercase tracking-widest leading-none">
                {subtitle}
              </span>
              <span className="text-[11px] font-numeric font-black text-secondary leading-none">
                {subValue}
              </span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Scrollable Layout Container */}
            <div className="flex-grow overflow-y-auto px-6 py-6 space-y-6 bg-workshop-surface/10 scrollbar-thin">
              <div className="max-w-4xl mx-auto w-full space-y-6">

                {/* Section 1: Specifications & Core Registry */}
                <div className="space-y-5 text-left font-sans">
                  <div className="flex items-center gap-2 border-b border-workshop-border/30 pb-3">
                    <Package className="w-4 h-4 text-secondary shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-workshop-text">
                      Specifications & Core Registry
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted px-1">
                        Part Name
                      </label>
                      <input
                        required
                        type="text"
                        value={partData.name || ''}
                        onChange={e => onChange({ ...partData, name: e.target.value })}
                        className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-secondary px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-secondary text-workshop-text transition-all text-sm font-sans font-bold shadow-sm"
                        placeholder="Specify part or asset name..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted px-1">
                        Category Tag
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-workshop-muted/60 select-none">
                          <Layers className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={partData.category || ''}
                          onChange={e => onChange({ ...partData, category: e.target.value })}
                          className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-secondary pl-11 pr-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-secondary text-workshop-text text-sm transition-all font-sans font-bold shadow-sm"
                          placeholder="e.g., Engine, Brakes..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Stock Allocation & Valuation */}
                <div className="space-y-5 text-left font-sans">
                  <div className="flex items-center gap-2 border-b border-workshop-border/30 pb-3">
                    <DollarSign className="w-4 h-4 text-secondary shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-workshop-text">
                      Stock Allocation & Valuation
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Current / Initial Stock */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted px-1">
                        {isEdit ? 'Current Stock' : 'Initial Stock'}
                      </label>
                      <input
                        required
                        type="number"
                        value={partData.stockQuantity === 0 ? '' : (partData.stockQuantity ?? '')}
                        onChange={e =>
                          onChange({
                            ...partData,
                            stockQuantity: e.target.value === '' ? 0 : Number(e.target.value),
                          })
                        }
                        className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-secondary px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-secondary text-workshop-text font-sans text-sm font-bold tabular-nums transition-all shadow-sm"
                        placeholder="0"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted px-1">
                        Unit Price (INR)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-sm font-bold text-workshop-muted select-none">
                          ₹
                        </span>
                        <input
                          required
                          type="number"
                          value={partData.price === 0 ? '' : (partData.price ?? '')}
                          onChange={e =>
                            onChange({
                              ...partData,
                              price: e.target.value === '' ? 0 : Number(e.target.value),
                            })
                          }
                          className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-secondary pl-8 pr-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-secondary text-workshop-text font-sans text-sm font-bold tabular-nums transition-all shadow-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Alert Threshold */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted px-1 flex items-center gap-1.5">
                        <span>Alert Threshold</span>
                        <span className="group relative">
                          <Info className="w-3 h-3 text-workshop-muted/60 cursor-help" />
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-workshop-card border border-workshop-border text-[9px] text-workshop-text uppercase tracking-normal px-2 py-1 rounded w-36 text-center shadow-lg font-sans z-50 normal-case">
                            Triggers a warning when stock drops to or below this level.
                          </span>
                        </span>
                      </label>
                      <input
                        type="number"
                        required
                        value={partData.minStockLevel === undefined ? '' : partData.minStockLevel}
                        onChange={e =>
                          onChange({
                            ...partData,
                            minStockLevel: e.target.value === '' ? 5 : Number(e.target.value),
                          })
                        }
                        className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-secondary px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-secondary text-workshop-text text-sm font-sans font-bold tabular-nums transition-all shadow-sm"
                        placeholder="5"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Storage & Placement Location */}
                <div className="space-y-5 text-left font-sans">
                  <div className="flex items-center gap-2 border-b border-workshop-border/30 pb-3">
                    <MapPin className="w-4 h-4 text-secondary shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-workshop-text">
                      Storage & Placement
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted px-1">
                      Inventory Location Info
                    </label>
                    <input
                      type="text"
                      value={partData.location || ''}
                      onChange={e => onChange({ ...partData, location: e.target.value })}
                      className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-secondary px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-secondary text-workshop-text text-sm transition-all font-sans font-bold shadow-sm"
                      placeholder="e.g., Cabinet A, Shelf 2, Row B..."
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Action Bar Footer */}
            <div
              className={`px-6 pt-5 sheet-footer-safe bg-workshop-bg border-t border-workshop-border/40 flex items-center shrink-0 z-20 shadow-lg select-none font-sans ${
                !readOnly && isEdit && onDelete ? 'justify-between' : 'justify-end gap-4'
              }`}
            >
              {!readOnly && isEdit && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-3 border border-status-urgent/25 rounded-xl text-status-urgent hover:bg-status-urgent/10 hover:border-status-urgent/45 active:scale-95 transition-all outline-none cursor-pointer"
                  title="Delete Asset"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              )}

              <div className="flex gap-4">
                {readOnly ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 bg-workshop-surface border border-workshop-border rounded-xl text-[10px] font-black uppercase tracking-widest text-workshop-text hover:bg-workshop-surface/80 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Close
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-3 border border-workshop-border rounded-xl text-[10px] font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface/50 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-secondary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-secondary/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      {submitText}
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        </motion.div>
      </Portal>
    </AnimatePresence>
  );
}
