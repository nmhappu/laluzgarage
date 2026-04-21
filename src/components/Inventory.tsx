import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Plus, Search, AlertCircle, Tag, Edit2, Trash2, X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Part } from '../types';
import { cn, formatCurrency } from '../lib/utils';

export function Inventory() {
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

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'parts'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setParts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Part)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPart.name || !newPart.sku) return;

    try {
      await addDoc(collection(db, 'parts'), {
        ...newPart,
        stockQuantity: Number(newPart.stockQuantity),
        price: Number(newPart.price),
        minStockLevel: Number(newPart.minStockLevel),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewPart({ name: '', sku: '', category: '', stockQuantity: 0, price: 0, minStockLevel: 5, location: '' });
      fetchParts();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'create', 'parts');
    }
  };

  const handleEditPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart || !editingPart.name || !editingPart.sku) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, updatedAt: _oldUpdatedAt, ...data } = editingPart;
      await updateDoc(doc(db, 'parts', id), {
        ...data,
        stockQuantity: Number(data.stockQuantity),
        price: Number(data.price),
        minStockLevel: Number(data.minStockLevel),
        updatedAt: serverTimestamp()
      });
      setShowEditModal(false);
      setEditingPart(null);
      fetchParts();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'update', `parts/${editingPart.id}`);
    }
  };

  const handleDeletePart = async () => {
    if (!partToDelete) return;

    try {
      await deleteDoc(doc(db, 'parts', partToDelete.id));
      setShowDeleteConfirm(false);
      setPartToDelete(null);
      fetchParts();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'delete', `parts/${partToDelete.id}`);
    }
  };

  const filteredParts = parts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-workshop-text tracking-tight uppercase">Parts Inventory</h1>
          <p className="text-workshop-muted text-sm">Track and manage shop supplies and spare parts.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-workshop-accent text-workshop-bg px-5 py-2.5 rounded shadow-lg shadow-workshop-accent/10 font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Part</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="md:col-span-2 lg:col-span-2 relative flex items-center">
          <Search className="absolute left-4 text-workshop-muted w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-workshop-accent focus:border-workshop-accent text-sm text-workshop-text"
          />
        </div>
        <div className="bg-workshop-surface p-4 rounded-xl border border-workshop-warning/30 flex items-center justify-between shadow-sm overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-workshop-warning/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
           <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-workshop-warning/10 rounded-lg border border-workshop-warning/20 shadow-inner">
                <AlertCircle className="w-6 h-6 text-workshop-warning" />
              </div>
              <div>
                <p className="text-[10px] font-black text-workshop-warning uppercase tracking-[0.2em] mb-1">Low Stock Warning</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-workshop-text font-sans tabular-nums leading-none">
                    {parts.filter(p => p.stockQuantity <= p.minStockLevel).length}
                  </p>
                  <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest leading-none">Items</p>
                </div>
              </div>
           </div>
           <button className="relative z-10 bg-workshop-warning/10 text-workshop-warning font-black text-[10px] uppercase tracking-[0.2em] px-5 py-2.5 rounded-xl hover:bg-workshop-warning/20 transition-all active:scale-95 shadow-sm border border-workshop-warning/20">
             Reorder
           </button>
        </div>
      </div>

      <div className="bg-workshop-card rounded-xl border border-workshop-border shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-workshop-surface text-workshop-muted text-[10px] font-bold uppercase tracking-wider border-b border-workshop-border">
              <tr>
                <th className="px-6 py-4">Part Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Stock Level</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-workshop-border">
              {filteredParts.map((part) => (
                <tr key={part.id} className="hover:bg-workshop-surface/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-workshop-text text-sm uppercase tracking-tight">{part.name}</p>
                      <p className="font-mono text-[10px] text-workshop-secondary uppercase tracking-tighter opacity-70">{part.sku}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-workshop-surface border border-workshop-border text-workshop-muted text-[10px] font-bold uppercase tracking-wider">
                      <Tag className="w-3 h-3" />
                      {part.category || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-lg font-black font-sans tabular-nums",
                        part.stockQuantity <= 0 ? "text-rose-500" : 
                        part.stockQuantity <= part.minStockLevel ? "text-workshop-warning" : 
                        "text-workshop-accent"
                      )}>
                        {part.stockQuantity}
                      </span>
                      <span className="text-[9px] font-bold text-workshop-muted uppercase tracking-widest mt-0.5">
                        In Stock
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-workshop-text">
                    {formatCurrency(part.price)}
                  </td>
                  <td className="px-6 py-4 text-workshop-muted text-xs">
                    {part.location || '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 text-workshop-muted relative z-10">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPart(part);
                          setShowEditModal(true);
                        }}
                        className="hover:text-workshop-accent p-3 hover:bg-workshop-surface rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPartToDelete(part);
                          setShowDeleteConfirm(true);
                        }}
                        className="hover:text-rose-500 p-3 hover:bg-workshop-surface rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-workshop-border">
          {filteredParts.map((part) => (
            <div key={part.id} className="p-4 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-workshop-surface text-workshop-muted text-[8px] font-black uppercase tracking-widest border border-workshop-border">
                      {part.category || 'General'}
                    </span>
                    <span className="font-mono text-[9px] text-workshop-secondary uppercase tracking-tighter opacity-60">
                      {part.sku}
                    </span>
                  </div>
                  <p className="font-bold text-workshop-text text-sm leading-tight uppercase">{part.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-workshop-text tracking-tighter">{formatCurrency(part.price)}</p>
                  <p className="text-[9px] text-workshop-muted font-bold uppercase tracking-widest mt-0.5">Price</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-workshop-surface/30 p-3 rounded-xl border border-workshop-border">
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-base font-black font-sans tabular-nums",
                      part.stockQuantity <= 0 ? "text-rose-500" : 
                      part.stockQuantity <= part.minStockLevel ? "text-workshop-warning" : 
                      "text-workshop-accent"
                    )}>
                      {part.stockQuantity}
                    </span>
                    <span className="text-[8px] font-black text-workshop-muted uppercase tracking-widest leading-none">
                      Units
                    </span>
                  </div>
                  <div className="h-4 w-px bg-workshop-border" />
                  <div className="flex items-center gap-1.5 text-workshop-muted">
                    <MapPin className="w-3 h-3 text-workshop-secondary" />
                    <span className="text-[9px] font-bold uppercase tracking-tight truncate max-w-[80px]">
                      {part.location || 'NONE'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                     onClick={() => {
                       setEditingPart(part);
                       setShowEditModal(true);
                     }}
                     className="p-2 text-workshop-muted hover:text-workshop-accent active:scale-90 transition-all"
                     title="Edit Part"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                     onClick={() => {
                       setPartToDelete(part);
                       setShowDeleteConfirm(true);
                     }}
                     className="p-2 text-workshop-muted hover:text-rose-500 active:scale-90 transition-all"
                     title="Delete Part"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredParts.length === 0 && !loading && (
          <div className="py-20 text-center text-workshop-muted text-sm">
            No parts found in inventory records.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingPart && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-workshop-bg/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative bg-workshop-card w-full max-w-2xl rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-workshop-text uppercase tracking-tight">Edit Item</h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-workshop-surface rounded-full transition-colors">
                  <X className="w-5 h-5 text-workshop-muted" />
                </button>
              </div>
              <form onSubmit={handleEditPart} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-1.5">
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">SKU / BARCODE</label>
                    <input 
                      required
                      type="text" 
                      value={editingPart.sku}
                      onChange={e => setEditingPart({...editingPart, sku: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent text-workshop-text font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Stock Quantity</label>
                    <input 
                      required
                      type="number" 
                      value={editingPart.stockQuantity}
                      onChange={e => setEditingPart({...editingPart, stockQuantity: Number(e.target.value)})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Unit Price</label>
                    <input 
                      required
                      type="number" 
                      value={editingPart.price}
                      onChange={e => setEditingPart({...editingPart, price: Number(e.target.value)})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Category</label>
                    <input 
                      type="text" 
                      value={editingPart.category || ''}
                      onChange={e => setEditingPart({...editingPart, category: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Min Stock Warning</label>
                    <input 
                      type="number" 
                      value={editingPart.minStockLevel}
                      onChange={e => setEditingPart({...editingPart, minStockLevel: Number(e.target.value)})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Warehouse Location</label>
                    <input 
                      type="text" 
                      value={editingPart.location || ''}
                      onChange={e => setEditingPart({...editingPart, location: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                      placeholder="e.g. Shelf A-42"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2.5 border border-workshop-border rounded-xl text-sm font-bold text-workshop-muted hover:bg-workshop-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-2.5 bg-workshop-accent text-workshop-bg rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-workshop-accent/10 hover:bg-emerald-500 transition-all"
                  >
                    Update
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && partToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-workshop-bg/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-workshop-card w-full max-w-sm rounded-xl p-8 shadow-2xl border border-workshop-border text-center"
            >
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 border border-rose-500/20">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-workshop-text mb-2 tracking-tight uppercase">Remove Part?</h2>
              <p className="text-workshop-muted text-sm mb-8">
                Are you sure you want to delete <span className="font-bold text-workshop-text underline">{partToDelete.name}</span> from the catalog?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-workshop-border rounded-xl text-sm font-bold text-workshop-muted hover:bg-workshop-surface transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeletePart}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 hover:bg-rose-700 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-workshop-bg/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative bg-workshop-card w-full max-w-2xl rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-xl font-bold mb-6 text-workshop-text uppercase tracking-tight">Catalogue New Item</h2>
              <form onSubmit={handleAddPart} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Part Name</label>
                    <input 
                      required
                      type="text" 
                      value={newPart.name}
                      onChange={e => setNewPart({...newPart, name: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent text-workshop-text"
                      placeholder="e.g. Brake Rotor"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">SKU / BARCODE</label>
                    <input 
                      required
                      type="text" 
                      value={newPart.sku}
                      onChange={e => setNewPart({...newPart, sku: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent text-workshop-text font-mono"
                      placeholder="SKU-9022-X"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Initial Stock</label>
                    <input 
                      required
                      type="number" 
                      value={newPart.stockQuantity}
                      onChange={e => setNewPart({...newPart, stockQuantity: Number(e.target.value)})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Unit Price</label>
                    <input 
                      required
                      type="number" 
                      value={newPart.price}
                      onChange={e => setNewPart({...newPart, price: Number(e.target.value)})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 border border-workshop-border rounded-xl text-sm font-bold text-workshop-muted hover:bg-workshop-surface"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-2.5 bg-workshop-accent text-workshop-bg rounded-xl text-sm font-black uppercase tracking-widest shadow-sm hover:bg-emerald-500 transition-all"
                  >
                    Catalog Item
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
