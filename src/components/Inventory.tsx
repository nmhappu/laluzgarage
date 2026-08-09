import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Tag, Trash2, MapPin, AlertCircle, ArrowLeft, Package, Layers, DollarSign, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Part } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Portal } from './Portal';
import { inventoryService } from '../services/inventoryService';
import { handleFirestoreError } from '../lib/firebase';

export function Inventory() {
  // --- State Management ---
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  
  const [newPart, setNewPart] = useState<Partial<Part>>({
    name: '',
    category: '',
    stockQuantity: 0,
    price: 0,
    minStockLevel: 5,
    location: ''
  });

  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);

  // --- Data Subscription ---

  useEffect(() => {
    setLoading(true);
    const unsubscribe = inventoryService.subscribeToParts((updatedParts) => {
      setParts(updatedParts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Handlers ---
  useEffect(() => {
    const handleBackButton = (e: Event) => {
      if (showEditModal) {
        setShowEditModal(false);
        e.preventDefault();
      } else if (showAddModal) {
        setShowAddModal(false);
        e.preventDefault();
      } else if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        e.preventDefault();
      }
    };

    window.addEventListener("appBackButton", handleBackButton);
    return () => window.removeEventListener("appBackButton", handleBackButton);
  }, [showEditModal, showAddModal, showDeleteConfirm]);

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.name) return;

    try {
      await inventoryService.addPart(newPart);
      setShowAddModal(false);
      setNewPart({ 
        name: '', 
        category: '', 
        stockQuantity: 0, 
        price: 0, 
        minStockLevel: 5, 
        location: '' 
      });
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'create', 'parts');
    }
  };

  const handleEditPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart || !editingPart.name) return;

    try {
      await inventoryService.updatePart(editingPart.id, editingPart);
      setShowEditModal(false);
      setEditingPart(null);
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(errorMessage);
      handleFirestoreError(e, 'update', `parts/${editingPart.id}`);
    }
  };

  const handleDeletePart = async () => {
    if (!partToDelete) return;

    try {
      await inventoryService.deletePart(partToDelete.id);
      setShowDeleteConfirm(false);
      setPartToDelete(null);
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'delete', `parts/${partToDelete.id}`);
    }
  };

  // --- Filter Logic ---
  const filteredParts = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return parts;
    return parts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.category && p.category.toLowerCase().includes(query))
    );
  }, [parts, searchTerm]);

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-workshop-text tracking-tight uppercase">Parts Inventory</h1>
          <p className="text-workshop-muted text-sm">Track and manage shop supplies and spare parts.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-workshop-accent text-workshop-bg px-5 py-2.5 rounded shadow-lg shadow-workshop-accent/10 font-black uppercase text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>ADD PART</span>
        </button>
      </header>



      <div className="-mx-4 md:-mx-8 lg:-mx-10 overflow-hidden">
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.01,
                delayChildren: 0.05
              }
            }
          }}
          className="divide-y divide-workshop-border/30 accelerate-gpu will-change-transform-opacity"
        >
          <AnimatePresence mode="popLayout">
            {filteredParts.map((part) => {
              const isLowStock = part.stockQuantity <= part.minStockLevel;
              return (
                <motion.div 
                  key={part.id} 
                  variants={{
                    hidden: { opacity: 0, y: 12, scale: 0.98 },
                    show: { 
                      opacity: 1, 
                      y: 0,
                      scale: 1,
                      transition: {
                        duration: 0.3,
                        ease: [0.2, 0, 0, 1.0]
                      }
                    }
                  }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0.98,
                    y: 8,
                    transition: { duration: 0.2, ease: [0.2, 0, 0, 1.0] } 
                  }}
                  className="flex items-center justify-between px-4 md:px-8 lg:px-10 py-5 md:py-6 hover:bg-workshop-surface transition-colors cursor-pointer group accelerate-gpu will-change-transform-opacity"
                  onClick={() => {
                    setEditingPart(part);
                    setShowEditModal(true);
                  }}
                >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-[15px] font-bold text-workshop-text tracking-tight uppercase group-hover:text-workshop-accent transition-colors flex items-center gap-2">
                      {part.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-workshop-muted font-bold uppercase tracking-widest opacity-60">
                        {part.category || 'General'}
                      </span>

                      {isLowStock && (
                        <span className="flex items-center gap-1 text-[8px] bg-status-urgent/10 text-status-urgent px-1.5 py-0.5 rounded border border-status-urgent/20 animate-pulse">
                          <AlertCircle className="w-2 h-2" />
                          LOW STOCK
                        </span>
                      )}

                      {part.location && (
                        <>
                          <span className="w-1 h-1 bg-workshop-border rounded-full" />
                          <span className="text-[10px] text-secondary font-bold uppercase tracking-widest flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {part.location}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end text-right">
                  <p className="text-[15px] md:text-lg font-black text-workshop-text tracking-tight tabular-nums">
                    {formatCurrency(part.price)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                     <span className={cn(
                       "text-[10px] md:text-sm font-black tabular-nums",
                       isLowStock ? "text-status-urgent" : "text-status-success"
                     )}>
                       Stock: {part.stockQuantity}
                     </span>
                  </div>
                </div>
              </motion.div>
            )})}
          </AnimatePresence>
        </motion.div>

        {filteredParts.length === 0 && !loading && (
          <div className="py-24 text-center">
            <Tag className="w-12 h-12 text-workshop-muted/20 mx-auto mb-4" />
            <p className="text-workshop-muted text-sm font-bold uppercase tracking-widest">No matching assets in inventory</p>
          </div>
        )}
      </div>

      {/* Edit Modal Fullscreen Sheet */}
      <AnimatePresence>
        {showEditModal && editingPart && (
          <Portal>
            <motion.div
              initial={{ x: "100%", opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              style={{ willChange: "transform, opacity" }}
              className="fixed inset-0 z-[100] bg-workshop-bg flex flex-col h-screen w-full overflow-hidden font-sans text-workshop-text"
            >
              {/* Premium Clean Top Bar Header */}
              <div className="flex justify-between items-center pl-2 pr-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 bg-workshop-bg border-b border-workshop-border/30 shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex items-center justify-center p-2 rounded-2xl text-workshop-muted hover:text-workshop-text transition-all duration-200 outline-none active:scale-95 group"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-[#3B82F6]" />
                </button>

                <div className="flex-1 pl-1">
                  <h2 className="text-base font-black text-[#3B82F6] tracking-tight uppercase leading-none font-sans">
                    Edit Asset
                  </h2>
                </div>

                <div className="flex flex-col items-end gap-0.5 text-right select-none">
                  <span className="text-[9px] font-black text-workshop-muted uppercase tracking-widest leading-none">
                    REGISTRY REF
                  </span>
                  <span className="text-[11px] font-mono font-black text-[#3B82F6] leading-none">
                    ID: {editingPart.id.substring(0, 8)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleEditPart} className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Scrollable Layout Container */}
                <div className="flex-grow overflow-y-auto px-6 py-6 space-y-6 bg-workshop-surface/10 scrollbar-thin">
                  <div className="max-w-4xl mx-auto w-full space-y-6">

                    {/* Section 1: Specifications & Core Registry */}
                    <div className="space-y-5 text-left font-sans">
                      <div className="flex items-center gap-2 border-b border-workshop-border/30 pb-3">
                        <Package className="w-4 h-4 text-[#3B82F6] shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider text-workshop-text">
                          Specifications & Core Registry
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">
                            Part Name
                          </label>
                          <input 
                            required
                            type="text" 
                            value={editingPart.name}
                            onChange={e => setEditingPart({...editingPart, name: e.target.value})}
                            className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text transition-all text-sm font-sans font-bold shadow-sm"
                            placeholder="Specify part or asset name..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">
                            Category Tag
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-3 text-workshop-muted/60 select-none">
                              <Layers className="w-4 h-4" />
                            </span>
                            <input 
                              type="text" 
                              value={editingPart.category || ''}
                              onChange={e => setEditingPart({...editingPart, category: e.target.value})}
                              className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] pl-11 pr-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text text-sm transition-all font-sans font-bold shadow-sm"
                              placeholder="e.g., Engine, Brakes..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Stock Allocation & Valuation */}
                    <div className="space-y-5 text-left font-sans">
                      <div className="flex items-center gap-2 border-b border-workshop-border/30 pb-3">
                        <DollarSign className="w-4 h-4 text-[#3B82F6] shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider text-workshop-text">
                          Stock Allocation & Valuation
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Current Stock */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">
                            Current Stock
                          </label>
                          <input 
                            required
                            type="number" 
                            value={editingPart.stockQuantity === 0 ? '' : (editingPart.stockQuantity ?? '')}
                            onChange={e => setEditingPart({...editingPart, stockQuantity: e.target.value === '' ? 0 : Number(e.target.value)})}
                            className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text font-sans text-sm font-bold tabular-nums transition-all shadow-sm"
                            placeholder="0"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">
                            Unit Price (INR)
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-3 text-sm font-bold text-workshop-muted select-none">
                              ₹
                            </span>
                            <input 
                              required
                              type="number" 
                              value={editingPart.price === 0 ? '' : (editingPart.price ?? '')}
                              onChange={e => setEditingPart({...editingPart, price: e.target.value === '' ? 0 : Number(e.target.value)})}
                              className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] pl-8 pr-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text font-sans text-sm font-bold tabular-nums transition-all shadow-sm"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {/* Alert Threshold */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1 flex items-center gap-1.5">
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
                            value={editingPart.minStockLevel === 0 ? '' : (editingPart.minStockLevel ?? '')}
                            onChange={e => setEditingPart({...editingPart, minStockLevel: e.target.value === '' ? 0 : Number(e.target.value)})}
                            className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text text-sm font-sans font-bold tabular-nums transition-all shadow-sm"
                            placeholder="5"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Storage & Placement Location */}
                    <div className="space-y-5 text-left font-sans">
                      <div className="flex items-center gap-2 border-b border-workshop-border/30 pb-3">
                        <MapPin className="w-4 h-4 text-[#3B82F6] shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider text-workshop-text">
                          Storage & Placement Placement
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">
                          Inventory Location Info
                        </label>
                        <input 
                          type="text" 
                          value={editingPart.location || ''}
                          onChange={e => setEditingPart({...editingPart, location: e.target.value})}
                          className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text text-sm transition-all font-sans font-bold shadow-sm"
                          placeholder="e.g., Cabinet B, Shelf 3, Drawer 1..."
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Fixed Premium Action Bar Footer */}
                <div className="px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] bg-workshop-bg border-t border-workshop-border/40 flex items-center justify-between gap-3.5 shrink-0 z-20 shadow-lg select-none font-sans">
                  <button 
                    type="button" 
                    onClick={() => {
                      setPartToDelete(editingPart);
                      setShowDeleteConfirm(true);
                      setShowEditModal(false);
                    }}
                    className="p-3 border border-status-urgent/25 rounded-xl text-status-urgent hover:bg-status-urgent/10 hover:border-status-urgent/45 active:scale-95 transition-all outline-none cursor-pointer"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>

                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => setShowEditModal(false)}
                      className="px-5 py-3 border border-workshop-border rounded-xl text-[10px] font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface/50 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Discard
                    </button>
                    <button 
                      type="submit" 
                      className="px-6 py-3 bg-[#3B82F6] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#3B82F6]/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Update Asset Info
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && partToDelete && (
          <Portal>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setEditingPart(partToDelete);
                  setShowEditModal(true);
                }}
                className="absolute inset-0 bg-workshop-bg/95"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ willChange: "transform, opacity" }}
                className="relative bg-workshop-card w-full max-w-sm rounded-[24px] p-8 shadow-2xl border border-workshop-border text-center z-10"
              >
                <div className="w-16 h-16 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-status-urgent border border-status-urgent/20">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-workshop-text mb-2 tracking-tight uppercase">Liquidate Asset?</h2>
                <p className="text-workshop-muted text-sm mb-8 leading-relaxed">
                  Are you sure you want to permanently delete <span className="font-bold text-workshop-text underline">{partToDelete.name}</span> from the inventory log?
                </p>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setEditingPart(partToDelete);
                      setShowEditModal(true);
                    }}
                    className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-[10px] font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface/50 active:scale-95 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleDeletePart}
                    className="flex-1 px-4 py-3 bg-status-urgent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-status-urgent/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Add Modal Fullscreen Sheet */}
      <AnimatePresence>
        {showAddModal && (
          <Portal>
            <motion.div
              initial={{ x: "100%", opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              style={{ willChange: "transform, opacity" }}
              className="fixed inset-0 z-[100] bg-workshop-bg flex flex-col h-screen w-full overflow-hidden font-sans text-workshop-text"
            >
              {/* Premium Clean Top Bar Header */}
              <div className="flex justify-between items-center pl-2 pr-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 bg-workshop-bg border-b border-workshop-border/30 shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex items-center justify-center p-2 rounded-2xl text-workshop-muted hover:text-workshop-text transition-all duration-200 outline-none active:scale-95 group"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-[#3B82F6]" />
                </button>

                <div className="flex-1 pl-1">
                  <h2 className="text-base font-black text-[#3B82F6] tracking-tight uppercase leading-none font-sans">
                    New Asset
                  </h2>
                </div>

                <div className="flex flex-col items-end gap-0.5 text-right select-none">
                  <span className="text-[9px] font-black text-workshop-muted uppercase tracking-widest leading-none">
                    INVENTORY LOG
                  </span>
                  <span className="text-[11px] font-mono font-black text-[#3B82F6] leading-none">
                    REGISTRATION
                  </span>
                </div>
              </div>

              <form onSubmit={handleAddPart} className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Scrollable Layout Container */}
                <div className="flex-grow overflow-y-auto px-6 py-6 space-y-6 bg-workshop-surface/10 scrollbar-thin">
                  <div className="max-w-4xl mx-auto w-full space-y-6">

                    {/* Section 1: Specifications & Core Registry */}
                    <div className="space-y-5 text-left font-sans">
                      <div className="flex items-center gap-2 border-b border-workshop-border/30 pb-3">
                        <Package className="w-4 h-4 text-[#3B82F6] shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider text-workshop-text">
                          Specifications & Core Registry
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">
                            Part Name
                          </label>
                          <input 
                            required
                            type="text" 
                            value={newPart.name}
                            onChange={e => setNewPart({...newPart, name: e.target.value})}
                            className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text transition-all text-sm font-sans font-bold shadow-sm"
                            placeholder="Specify part or asset name (e.g. Front Brake Pads)..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">
                            Category Tag
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-3 text-workshop-muted/60 select-none">
                              <Layers className="w-4 h-4" />
                            </span>
                            <input 
                              type="text" 
                              value={newPart.category || ''}
                              onChange={e => setNewPart({...newPart, category: e.target.value})}
                              className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] pl-11 pr-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text text-sm transition-all font-sans font-bold shadow-sm"
                              placeholder="e.g., Engine, Brakes..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Stock Allocation & Valuation */}
                    <div className="space-y-5 text-left font-sans">
                      <div className="flex items-center gap-2 border-b border-workshop-border/30 pb-3">
                        <DollarSign className="w-4 h-4 text-[#3B82F6] shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider text-workshop-text">
                          Stock Allocation & Valuation
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Initial Stock */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">
                            Initial Stock
                          </label>
                          <input 
                            required
                            type="number" 
                            value={newPart.stockQuantity === 0 ? '' : (newPart.stockQuantity ?? '')}
                            onChange={e => setNewPart({...newPart, stockQuantity: e.target.value === '' ? 0 : Number(e.target.value)})}
                            className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text font-sans text-sm font-bold tabular-nums transition-all shadow-sm"
                            placeholder="0"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">
                            Unit Price (INR)
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-3 text-sm font-bold text-workshop-muted select-none">
                              ₹
                            </span>
                            <input 
                              required
                              type="number" 
                              value={newPart.price === 0 ? '' : (newPart.price ?? '')}
                              onChange={e => setNewPart({...newPart, price: e.target.value === '' ? 0 : Number(e.target.value)})}
                              className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] pl-8 pr-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text font-sans text-sm font-bold tabular-nums transition-all shadow-sm"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {/* Alert Threshold */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1 flex items-center gap-1.5">
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
                            value={newPart.minStockLevel === undefined ? '' : newPart.minStockLevel}
                            onChange={e => setNewPart({...newPart, minStockLevel: e.target.value === '' ? 5 : Number(e.target.value)})}
                            className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text text-sm font-sans font-bold tabular-nums transition-all shadow-sm"
                            placeholder="5"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Storage & Placement Location */}
                    <div className="space-y-5 text-left font-sans">
                      <div className="flex items-center gap-2 border-b border-workshop-border/30 pb-3">
                        <MapPin className="w-4 h-4 text-[#3B82F6] shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider text-workshop-text">
                          Storage & Placement Placement
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">
                          Inventory Location Info
                        </label>
                        <input 
                          type="text" 
                          value={newPart.location || ''}
                          onChange={e => setNewPart({...newPart, location: e.target.value})}
                          className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-[#3B82F6] px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#3B82F6] text-workshop-text text-sm transition-all font-sans font-bold shadow-sm"
                          placeholder="e.g., Cabinet A, Shelf 2, Row B..."
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Fixed Premium Action Bar Footer */}
                <div className="px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] bg-workshop-bg border-t border-workshop-border/40 flex items-center justify-end gap-4 shrink-0 z-20 shadow-lg select-none font-sans">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-3 border border-workshop-border rounded-xl text-[10px] font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface/50 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-3 bg-[#3B82F6] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#3B82F6]/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Register New Asset
                  </button>
                </div>
              </form>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}
