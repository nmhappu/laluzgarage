import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, auth } from '../lib/firebase';
import { Car, Search, Plus, User, Hash, History, X, Wrench, Package, ShieldCheck, Edit2, Trash2, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Vehicle, Customer, ServiceRecord } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/CustomSelect";

export function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    customerId: '',
    make: '',
    model: '',
    color: '',
    plateNumber: '',
    vin: ''
  });

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const [useKeyForNew, setUseKeyForNew] = useState(false);
  const [useKeyForEdit, setUseKeyForEdit] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const vSnap = await getDocs(query(collection(db, 'vehicles'), orderBy('createdAt', 'desc')));
      const cSnap = await getDocs(collection(db, 'customers'));
      const sSnap = await getDocs(query(collection(db, 'serviceRecords'), orderBy('date', 'desc')));
      
      setVehicles(vSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
      setCustomers(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      setServiceRecords(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.customerId || !newVehicle.make || !newVehicle.plateNumber) return;

    try {
      await addDoc(collection(db, 'vehicles'), {
        ...newVehicle,
        technicianId: auth.currentUser?.uid,
        passwordOrPin: useKeyForNew ? 'Key' : newVehicle.passwordOrPin,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewVehicle({ customerId: '', make: '', model: '', color: '', plateNumber: '', passwordOrPin: '' });
      setUseKeyForNew(false);
      fetchData();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'create', 'vehicles');
    }
  };

  const handleEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle || !editingVehicle.customerId || !editingVehicle.make || !editingVehicle.plateNumber) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, technicianId, createdAt, updatedAt: _oldUpdatedAt, ...data } = editingVehicle;
      await updateDoc(doc(db, 'vehicles', id), {
        ...data,
        passwordOrPin: useKeyForEdit ? 'Key' : data.passwordOrPin,
        updatedAt: serverTimestamp()
      });
      setShowEditModal(false);
      setEditingVehicle(null);
      setUseKeyForEdit(false);
      fetchData();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'update', `vehicles/${editingVehicle.id}`);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;

    try {
      await deleteDoc(doc(db, 'vehicles', vehicleToDelete.id));
      setShowDeleteConfirm(false);
      setVehicleToDelete(null);
      fetchData();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'delete', `vehicles/${vehicleToDelete.id}`);
    }
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';

  const filteredVehicles = vehicles.filter(v => 
    v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-workshop-text tracking-tight uppercase">Vehicle Registry</h1>
          <p className="text-workshop-muted text-sm">Fleet management and client vehicle records.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-workshop-accent text-workshop-bg px-5 py-2.5 rounded shadow-lg shadow-workshop-accent/10 font-bold uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all font-black active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Register Vehicle</span>
        </button>
      </header>

      <div className="relative flex items-center">
        <Search className="absolute left-4 text-workshop-muted w-4 h-4" />
        <input 
          type="text" 
          placeholder="Search by plate, make, or model..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-workshop-accent focus:border-workshop-accent text-sm text-workshop-text shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredVehicles.map((vehicle) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-workshop-card rounded-xl border border-workshop-border shadow-sm overflow-hidden group hover:border-workshop-accent/30 transition-all relative"
            >
              <div className="bg-workshop-surface/50 p-6 border-b border-workshop-border flex items-center justify-between font-black uppercase tracking-tight">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-workshop-bg rounded border border-workshop-border text-workshop-text shadow-sm">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-workshop-text text-sm">{vehicle.make} {vehicle.model}</h3>
                    <p className="text-[10px] text-workshop-accent font-bold tracking-widest uppercase">{vehicle.plateNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-workshop-muted block uppercase tracking-tighter">Colour</span>
                  <span className="font-bold text-workshop-text text-sm">{vehicle.color}</span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-workshop-muted">
                    <User className="w-3.5 h-3.5 text-workshop-secondary" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">Owner</span>
                  </div>
                  <span className="font-bold text-workshop-text uppercase">{getCustomerName(vehicle.customerId)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-workshop-muted">
                    <Hash className="w-3.5 h-3.5 text-workshop-secondary" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">PIN / Security</span>
                  </div>
                  <span className="font-mono text-workshop-muted truncate ml-4 font-bold opacity-80">{vehicle.passwordOrPin === 'Key' ? 'Physical Key' : vehicle.passwordOrPin || '—'}</span>
                </div>
                <div className="mt-6 pt-4 border-t border-workshop-border flex items-center gap-2 relative z-20">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVehicleForHistory(vehicle);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-transparent border border-white/20 hover:border-white/40 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all group/btn"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>History</span>
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingVehicle(vehicle);
                        setShowEditModal(true);
                      }}
                      className="p-3 bg-workshop-surface text-workshop-secondary rounded-xl hover:text-blue-400 transition-all border border-workshop-border"
                      title="Edit Vehicle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setVehicleToDelete(vehicle);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-3 bg-workshop-surface text-rose-500 rounded-xl hover:bg-rose-500/10 transition-all border border-workshop-border"
                      title="Delete Vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {loading && filteredVehicles.length === 0 && (
        <div className="text-center py-20 text-workshop-muted text-sm">
          Fetching vehicle database...
        </div>
      )}

      {/* Service History Modal */}
      <AnimatePresence>
        {selectedVehicleForHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVehicleForHistory(null)}
              className="absolute inset-0 bg-workshop-bg/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-workshop-card w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-workshop-border"
            >
              <div className="bg-workshop-bg p-8 text-workshop-text relative border-b border-workshop-border">
                <button 
                  onClick={() => setSelectedVehicleForHistory(null)}
                  className="absolute top-6 right-6 p-2 hover:bg-workshop-surface rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-workshop-muted" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-workshop-accent rounded-xl flex items-center justify-center shadow-lg shadow-workshop-accent/20">
                    <History className="w-6 h-6 text-workshop-bg" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight uppercase">Service History</h2>
                    <p className="text-workshop-muted text-[10px] font-bold uppercase tracking-widest mt-0.5">
                      {selectedVehicleForHistory.make} {selectedVehicleForHistory.model} — {selectedVehicleForHistory.plateNumber}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-workshop-bg/30 scrollbar-hide">
                {serviceRecords.filter(r => r.vehicleId === selectedVehicleForHistory.id).length > 0 ? (
                  <div className="space-y-4">
                    {serviceRecords
                      .filter(r => r.vehicleId === selectedVehicleForHistory.id)
                      .map((record) => (
                        <div key={record.id} className="bg-workshop-card rounded-xl border border-workshop-border p-6 shadow-sm hover:border-workshop-accent/30 transition-all">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-workshop-surface rounded-xl border border-workshop-border flex flex-col items-center justify-center">
                                <span className="text-[8px] font-bold text-workshop-muted uppercase">{format(new Date(record.date), 'MMM')}</span>
                                <span className="text-sm font-black text-workshop-text leading-none">{format(new Date(record.date), 'dd')}</span>
                              </div>
                              <div>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest mb-1 inline-block border",
                                  record.status === 'completed' ? "bg-workshop-accent/10 text-workshop-accent border-workshop-accent/20" :
                                  record.status === 'in-progress' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                  "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                )}>
                                  {record.status}
                                </span>
                                <p className="text-xs font-bold text-workshop-muted">{format(new Date(record.date), 'yyyy')}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-bold text-workshop-muted uppercase tracking-widest">Service Cost</p>
                              <p className="text-lg font-black text-workshop-text tracking-tighter">{formatCurrency(record.totalCost)}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="p-3 bg-workshop-surface/50 rounded-xl border border-workshop-border">
                              <p className="text-xs text-workshop-text font-medium opacity-90">"{record.description}"</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center gap-2 text-workshop-muted">
                                <Wrench className="w-3.5 h-3.5 text-workshop-secondary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{record.mileage.toLocaleString()} KM</span>
                              </div>
                              <div className="flex items-center gap-2 text-workshop-muted justify-end">
                                <Package className="w-3.5 h-3.5 text-workshop-secondary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{record.partsUsed.length} Parts Allocated</span>
                              </div>
                            </div>

                            {record.partsUsed.length > 0 && (
                              <div className="pt-3 border-t border-workshop-border flex flex-wrap gap-2">
                                {record.partsUsed.map((p, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-workshop-surface border border-workshop-border rounded text-[9px] font-bold text-workshop-muted uppercase tracking-tighter shadow-sm">
                                    {p.name} (x{p.quantity})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 px-8">
                    <div className="w-20 h-20 bg-workshop-surface rounded-xl flex items-center justify-center mx-auto mb-6 text-workshop-muted border border-workshop-border">
                      <ShieldCheck className="w-10 h-10 opacity-30" />
                    </div>
                    <h3 className="text-workshop-text font-bold uppercase">No records</h3>
                    <p className="text-workshop-muted text-sm mt-2 max-w-xs mx-auto">This vehicle hasn't been brought in for maintenance services yet.</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-workshop-card border-t border-workshop-border flex justify-end">
                 <button 
                  onClick={() => setSelectedVehicleForHistory(null)}
                  className="px-6 py-2 bg-workshop-surface text-workshop-muted text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-workshop-surface/80 transition-all border border-workshop-border"
                 >
                   Close Registry
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-workshop-bg/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-workshop-card w-full max-w-lg rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-workshop-text uppercase tracking-tight">Edit Specification</h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-workshop-surface rounded-full transition-colors">
                  <X className="w-5 h-5 text-workshop-muted" />
                </button>
              </div>
              <form onSubmit={handleEditVehicle} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Customer (Owner)</label>
                  <Select 
                    value={editingVehicle.customerId} 
                    onValueChange={(val) => setEditingVehicle({...editingVehicle, customerId: val})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select current client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id!}>
                          {c.name} ({c.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Manufacturer</label>
                    <input 
                      required
                      type="text" 
                      value={editingVehicle.make}
                      onChange={e => setEditingVehicle({...editingVehicle, make: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Model Name</label>
                    <input 
                      required
                      type="text" 
                      value={editingVehicle.model}
                      onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Reg Plate</label>
                    <input 
                      required
                      type="text" 
                      value={editingVehicle.plateNumber}
                      onChange={e => setEditingVehicle({...editingVehicle, plateNumber: e.target.value.toUpperCase()})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none font-mono text-workshop-text uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Vehicle Colour</label>
                    <input 
                      required
                      type="text" 
                      value={editingVehicle.color}
                      onChange={e => setEditingVehicle({...editingVehicle, color: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                      placeholder="e.g. Red, Blue"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Security: Password / PIN</label>
                  <div className="relative">
                    <input 
                      disabled={useKeyForEdit}
                      type={useKeyForEdit ? "text" : "number"} 
                      value={useKeyForEdit ? 'Key' : (editingVehicle.passwordOrPin || '')}
                      onChange={e => setEditingVehicle({...editingVehicle, passwordOrPin: e.target.value})}
                      className={cn(
                        "w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none font-mono text-workshop-text uppercase transition-all",
                        useKeyForEdit && "opacity-50 font-bold"
                      )}
                      placeholder={useKeyForEdit ? "" : "Enter numeric PIN..."}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = !useKeyForEdit;
                        setUseKeyForEdit(newMode);
                        if (newMode) {
                          setEditingVehicle({...editingVehicle, passwordOrPin: 'Key'});
                        } else {
                          setEditingVehicle({...editingVehicle, passwordOrPin: ''});
                        }
                      }}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
                        useKeyForEdit ? "bg-workshop-accent text-workshop-bg shadow-lg" : "bg-workshop-surface text-workshop-muted hover:text-workshop-text"
                      )}
                      title="Toggle between Pin and physical Key"
                    >
                      <Key className={cn("w-4 h-4", useKeyForEdit && "animate-pulse")} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2.5 border border-workshop-border rounded-xl text-sm font-bold text-workshop-muted hover:bg-workshop-surface transition-colors uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-2.5 bg-workshop-accent text-workshop-bg rounded-xl text-sm font-black shadow-lg shadow-workshop-accent/10 hover:bg-emerald-500 transition-all font-bold uppercase tracking-widest"
                  >
                    Update registry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && vehicleToDelete && (
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
              <h2 className="text-xl font-bold text-workshop-text mb-2 tracking-tight uppercase">Remove entry?</h2>
              <p className="text-workshop-muted text-sm mb-8">
                Are you sure you want to de-register <span className="font-bold text-workshop-text underline">{vehicleToDelete.plateNumber}</span>?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-workshop-border rounded-xl text-sm font-bold text-workshop-muted hover:bg-workshop-surface transition-all uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteVehicle}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-black shadow-lg shadow-rose-900/20 hover:bg-rose-700 transition-all uppercase tracking-widest"
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
              className="relative bg-workshop-card w-full max-w-lg rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-xl font-bold mb-6 text-workshop-text uppercase tracking-tight">New Entry</h2>
              <form onSubmit={handleAddVehicle} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Customer (Owner)</label>
                  <Select 
                    value={newVehicle.customerId} 
                    onValueChange={(val) => setNewVehicle({...newVehicle, customerId: val})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select current client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id!}>
                          {c.name} ({c.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Manufacturer</label>
                    <input 
                      required
                      type="text" 
                      value={newVehicle.make}
                      onChange={e => setNewVehicle({...newVehicle, make: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                      placeholder="e.g. BMW"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Model Name</label>
                    <input 
                      required
                      type="text" 
                      value={newVehicle.model}
                      onChange={e => setNewVehicle({...newVehicle, model: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                      placeholder="e.g. M3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Reg Plate</label>
                    <input 
                      required
                      type="text" 
                      value={newVehicle.plateNumber}
                      onChange={e => setNewVehicle({...newVehicle, plateNumber: e.target.value.toUpperCase()})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none font-mono text-workshop-text uppercase"
                      placeholder="MH 12 AB 0000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Vehicle Colour</label>
                    <input 
                      required
                      type="text" 
                      value={newVehicle.color}
                      onChange={e => setNewVehicle({...newVehicle, color: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                      placeholder="e.g. Red, Blue"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Security: Password / PIN</label>
                  <div className="relative">
                    <input 
                      disabled={useKeyForNew}
                      type={useKeyForNew ? "text" : "number"} 
                      value={useKeyForNew ? 'Key' : (newVehicle.passwordOrPin || '')}
                      onChange={e => setNewVehicle({...newVehicle, passwordOrPin: e.target.value})}
                      className={cn(
                        "w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none font-mono text-workshop-text uppercase transition-all",
                        useKeyForNew && "opacity-50 font-bold"
                      )}
                      placeholder={useKeyForNew ? "" : "Enter numeric PIN..."}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = !useKeyForNew;
                        setUseKeyForNew(newMode);
                        if (newMode) {
                          setNewVehicle({...newVehicle, passwordOrPin: 'Key'});
                        } else {
                          setNewVehicle({...newVehicle, passwordOrPin: ''});
                        }
                      }}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
                        useKeyForNew ? "bg-workshop-accent text-workshop-bg shadow-lg" : "bg-workshop-surface text-workshop-muted hover:text-workshop-text"
                      )}
                      title="Toggle between Pin and physical Key"
                    >
                      <Key className={cn("w-4 h-4", useKeyForNew && "animate-pulse")} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-xs font-bold text-workshop-muted hover:bg-workshop-surface transition-all uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-3 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black shadow-lg shadow-workshop-accent/10 hover:bg-emerald-500 transition-all uppercase tracking-widest"
                  >
                    Register Entry
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
