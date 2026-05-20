import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Tag, Trash2, X, MapPin, AlertCircle } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newPart, setNewPart] = useState<Partial<Part>>({
    name: '',
    sku: '',
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
        sku: '', 
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
      (p.sku && p.sku.toLowerCase().includes(query)) ||
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

      <div className="relative flex items-center">
        <Search className="absolute left-4 text-workshop-muted w-4 h-4" />
        <input 
          type="text" 
          placeholder="Search by name, SKU or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-workshop-accent focus:border-workshop-accent text-sm text-workshop-text"
        />
      </div>

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
          className="divide-y divide-workshop-border/30"
        >
          <AnimatePresence mode="popLayout">
            {filteredParts.map((part) => {
              const isLowStock = part.stockQuantity <= part.minStockLevel;
              return (
                <motion.div 
                  key={part.id} 
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { 
                      opacity: 1, 
                      y: 0,
                      transition: {
                        duration: 0.2,
                        ease: [0.23, 1, 0.32, 1]
                      }
                    }
                  }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0.98,
                    transition: { duration: 0.15 } 
                  }}
                  className="flex items-center justify-between px-4 md:px-8 lg:px-10 py-5 md:py-6 hover:bg-workshop-surface transition-colors cursor-pointer group"
                  onClick={() => {
                    setEditingPart(part);
                    setShowEditModal(true);
                  }}
                >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-[15px] font-bold text-workshop-text tracking-tight uppercase group-hover:text-workshop-accent transition-colors flex items-center gap-2">
                      {part.name}
                      {isLowStock && (
                        <span className="flex items-center gap-1 text-[8px] bg-status-urgent/10 text-status-urgent px-1.5 py-0.5 rounded border border-status-urgent/20 animate-pulse">
                          <AlertCircle className="w-2 h-2" />
                          LOW STOCK
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-workshop-muted font-bold uppercase tracking-widest opacity-60">
                        {part.category || 'General'}
                      </span>
                      {part.sku && (
                        <>
                          <span className="w-1 h-1 bg-workshop-border rounded-full" />
                          <span className="text-[10px] text-workshop-secondary font-mono tracking-tighter uppercase opacity-70">
                            {part.sku}
                          </span>
                        </>
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

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingPart && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEditModal(false)}
                className="absolute inset-0 bg-workshop-bg/60"
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="relative bg-workshop-card w-full max-w-2xl rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[90vh] bg-clip-padding"
              >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-workshop-text uppercase tracking-tight">Edit Inventory Asset</h2>
                  <p className="text-workshop-muted text-[10px] font-bold uppercase tracking-widest mt-1">ID: {editingPart.id}</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-workshop-surface rounded-full transition-colors">
                  <X className="w-5 h-5 text-workshop-muted" />
                </button>
              </div>
              <form onSubmit={handleEditPart} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Part Name</label>
                    <input 
                      required
                      type="text" 
                      value={editingPart.name}
                      onChange={e => setEditingPart({...editingPart, name: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent text-workshop-text"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Current Stock</label>
                    <input 
                      required
                      type="number" 
                      value={editingPart.stockQuantity === 0 ? '' : (editingPart.stockQuantity ?? '')}
                      onChange={e => setEditingPart({...editingPart, stockQuantity: e.target.value === '' ? 0 : Number(e.target.value)})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text font-sans tabular-nums"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Price</label>
                    <input 
                      required
                      type="number" 
                      value={editingPart.price}
                      onChange={e => setEditingPart({...editingPart, price: Number(e.target.value)})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">SKU</label>
                    <input 
                      type="text" 
                      value={editingPart.sku}
                      onChange={e => setEditingPart({...editingPart, sku: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent text-workshop-text font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Category Tag</label>
                    <input 
                      type="text" 
                      value={editingPart.category || ''}
                      onChange={e => setEditingPart({...editingPart, category: e.target.value})}
                      placeholder="Engine, Brakes"
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Alert Threshold</label>
                    <input 
                      type="number" 
                      value={editingPart.minStockLevel}
                      onChange={e => setEditingPart({...editingPart, minStockLevel: Number(e.target.value)})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Location</label>
                    <input 
                      type="text" 
                      value={editingPart.location || ''}
                      onChange={e => setEditingPart({...editingPart, location: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                      placeholder="Rack B, Shelf 3"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setPartToDelete(editingPart);
                      setShowDeleteConfirm(true);
                      setShowEditModal(false);
                    }}
                    className="p-3 border border-status-urgent/20 rounded-xl text-status-urgent hover:bg-status-urgent/10 transition-colors"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex flex-1 gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface transition-colors"
                    >
                      Discard
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 px-4 py-3 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-workshop-accent/10 hover:brightness-110 transition-all"
                    >
                      Update Asset
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && partToDelete && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute inset-0 bg-workshop-bg/60"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-workshop-card w-full max-w-sm rounded-xl p-8 shadow-2xl border border-workshop-border text-center"
              >
              <div className="w-16 h-16 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-status-urgent border border-status-urgent/20">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-workshop-text mb-2 tracking-tight uppercase">Liquidate Asset?</h2>
              <p className="text-workshop-muted text-sm mb-8">
                Are you sure you want to delete <span className="font-bold text-workshop-text underline">{partToDelete.name}</span> from the inventory log?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-[10px] font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeletePart}
                  className="flex-1 px-4 py-3 bg-status-urgent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-status-urgent/20 hover:brightness-110 transition-all"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddModal(false)}
                className="absolute inset-0 bg-workshop-bg/60"
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="relative bg-workshop-card w-full max-w-2xl rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[90vh] bg-clip-padding"
              >
              <h2 className="text-xl font-bold mb-6 text-workshop-text uppercase tracking-tight">NEW ASSET</h2>
              <form onSubmit={handleAddPart} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Part Name</label>
                    <input 
                      required
                      type="text" 
                      value={newPart.name}
                      onChange={e => setNewPart({...newPart, name: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent text-workshop-text"
                      placeholder="Brake Rotor"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Initial Stock</label>
                    <input 
                      required
                      type="number" 
                      placeholder="0"
                      value={newPart.stockQuantity === 0 ? '' : (newPart.stockQuantity ?? '')}
                      onChange={e => setNewPart({...newPart, stockQuantity: e.target.value === '' ? 0 : Number(e.target.value)})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text font-sans tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Unit Price</label>
                    <input 
                      required
                      type="number" 
                      placeholder="0.00"
                      value={newPart.price === 0 ? '' : (newPart.price ?? '')}
                      onChange={e => setNewPart({...newPart, price: e.target.value === '' ? 0 : Number(e.target.value)})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text font-sans tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">SKU</label>
                    <input 
                      type="text" 
                      value={newPart.sku}
                      onChange={e => setNewPart({...newPart, sku: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent text-workshop-text font-mono"
                      placeholder="SKU-9022-X"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Category Tag</label>
                    <input 
                      type="text" 
                      value={newPart.category || ''}
                      onChange={e => setNewPart({...newPart, category: e.target.value})}
                      placeholder="Suspension"
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Location</label>
                    <input 
                      type="text" 
                      value={newPart.location || ''}
                      onChange={e => setNewPart({...newPart, location: e.target.value})}
                      placeholder="Rack A, Shelf 2"
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-3 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:brightness-110 transition-all"
                  >
                    ADD PART
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}
