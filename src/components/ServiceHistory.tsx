import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, auth } from '../lib/firebase';
import { Plus, Search, User, Car, ScanHeart, ChevronRight, Trash2, ArrowRight, RefreshCw, Phone, Eye, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ServiceRecord, Vehicle, Customer, Part } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { format, differenceInDays, isAfter, parseISO, isSameDay, startOfDay } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/CustomSelect";

export function ServiceHistory() {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [lookupStep, setLookupStep] = useState<'search' | 'form'>('search');
  const [searchType, setSearchType] = useState<'plate' | 'phone'>('plate');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{customer: Customer, vehicle?: Vehicle}[]>([]);
  
  const [newRecord, setNewRecord] = useState<Partial<ServiceRecord>>({
    vehicleId: '',
    description: '',
    remarks: '',
    mileage: 0,
    status: 'pending',
    laborCost: 0,
    expectedDeliveryDate: '',
    isDeadVehicle: false,
    partsUsed: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rSnap = await getDocs(query(collection(db, 'serviceRecords'), orderBy('date', 'desc')));
      const vSnap = await getDocs(collection(db, 'vehicles'));
      const cSnap = await getDocs(collection(db, 'customers'));
      const pSnap = await getDocs(collection(db, 'parts'));
      
      setRecords(rSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord)));
      setVehicles(vSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
      setCustomers(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      setParts(pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Part)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Real-time lookup
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      return;
    }

    if (searchType === 'plate') {
      const filteredVehicles = vehicles.filter(v => 
        v.plateNumber.toLowerCase().includes(q)
      );
      
      const results = filteredVehicles.map(v => ({
        vehicle: v,
        customer: customers.find(c => c.id === v.customerId)!
      })).filter(r => r.customer);
      setSearchResults(results);
    } else {
      const filteredCustomers = customers.filter(c => 
        c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        c.name.toLowerCase().includes(q)
      );

      const results: {customer: Customer, vehicle?: Vehicle}[] = [];
      filteredCustomers.forEach(c => {
        const cVehicles = vehicles.filter(v => v.customerId === c.id);
        if (cVehicles.length > 0) {
          cVehicles.forEach(v => results.push({ customer: c, vehicle: v }));
        } else {
          results.push({ customer: c });
        }
      });
      setSearchResults(results);
    }
  }, [searchQuery, searchType, vehicles, customers]);

  const handleSelectResult = (customer: Customer, vehicle?: Vehicle) => {
    if (vehicle) {
      setNewRecord({ ...newRecord, vehicleId: vehicle.id });
      setLookupStep('form');
    } else {
      // Just Move to form, the vehicle select will be available and filtered by customer if we added that logic, 
      // but for now we follow the existing pattern where they pick vehicle in form
      setNewRecord({ ...newRecord, vehicleId: '' });
      setLookupStep('form');
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.vehicleId || !newRecord.description) return;

    const vehicle = vehicles.find(v => v.id === newRecord.vehicleId);
    if (!vehicle) return;

    try {
      // Calculate total costs
      const partsTotal = (newRecord.partsUsed || []).reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0);
      const totalCost = Number(newRecord.laborCost) + partsTotal;

      await runTransaction(db, async (transaction) => {
        // 1. Gather all READS first
        const uniquePartIds = Array.from(new Set((newRecord.partsUsed || []).map(p => p.partId))) as string[];
        const partReads = uniquePartIds.map(pid => transaction.get(doc(db, 'parts', pid)));
        
        const partDocs = await Promise.all(partReads);
        const partDataMap: Record<string, number> = {};
        
        partDocs.forEach(pd => {
          if (pd.exists()) {
            partDataMap[pd.id] = pd.data().stockQuantity;
          }
        });

        // 2. Perform all WRITES last
        const recordRef = doc(collection(db, 'serviceRecords'));
        transaction.set(recordRef, {
          ...newRecord,
          technicianId: auth.currentUser?.uid,
          technicianName: auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown Advisor',
          customerId: vehicle.customerId,
          date: new Date().toISOString(),
          partsCost: partsTotal,
          totalCost: totalCost,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        for (const usedPart of (newRecord.partsUsed || [])) {
          const currentStock = partDataMap[usedPart.partId];
          if (typeof currentStock === 'number') {
            transaction.update(doc(db, 'parts', usedPart.partId), {
              stockQuantity: currentStock - usedPart.quantity
            });
          }
        }
      });

      setShowAddModal(false);
      setNewRecord({ vehicleId: '', description: '', remarks: '', mileage: 0, status: 'pending', laborCost: 0, partsUsed: [] });
      setLookupStep('search');
      setSearchType('plate');
      setSearchQuery('');
      // No searchError anymore
      fetchData();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`Job Card creation failed: ${errorMessage}`);
      handleFirestoreError(e, 'create', 'serviceRecords');
    }
  };

  const handleDeleteRecord = async (record: ServiceRecord) => {
    if (!window.confirm('Are you certain you want to purge this record? This action will revert used parts to inventory.')) return;

    try {
      await runTransaction(db, async (transaction) => {
        // ... reads
        const recordRef = doc(db, 'serviceRecords', record.id!);
        const recordDoc = await transaction.get(recordRef);
        if (!recordDoc.exists()) return;

        const recordData = recordDoc.data() as ServiceRecord;
        const partIds = new Set((recordData.partsUsed || []).map(p => p.partId));
        
        const partReads = Array.from(partIds).map(pid => transaction.get(doc(db, 'parts', pid)));
        const partDocs = await Promise.all(partReads);
        
        const stockMap: Record<string, number> = {};
        partDocs.forEach(pd => {
          if (pd.exists()) stockMap[pd.id] = pd.data().stockQuantity;
        });

        // 2. WRITES
        // Revert parts
        for (const usedPart of (recordData.partsUsed || [])) {
          const currentStock = stockMap[usedPart.partId];
          if (typeof currentStock === 'number') {
            transaction.update(doc(db, 'parts', usedPart.partId), {
              stockQuantity: currentStock + usedPart.quantity
            });
          }
        }

        // Delete record
        transaction.delete(recordRef);
      });

      fetchData();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`Delete failed: ${errorMessage}`);
      handleFirestoreError(e, 'delete', `serviceRecords/${record.id}`);
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || isUpdating) return;

    setIsUpdating(true);
    try {
      const partsTotal = (editingRecord.partsUsed || []).reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0);
      const totalCost = Number(editingRecord.laborCost) + partsTotal;

      await runTransaction(db, async (transaction) => {
        const recordRef = doc(db, 'serviceRecords', editingRecord.id!);
        const oldRecordDoc = await transaction.get(recordRef);
        
        if (!oldRecordDoc.exists()) throw new Error("Record not found in database.");
        const oldRecord = oldRecordDoc.data() as ServiceRecord;

        const allPartIds = new Set<string>();
        (oldRecord.partsUsed || []).forEach(p => allPartIds.add(p.partId));
        (editingRecord.partsUsed || []).forEach(p => allPartIds.add(p.partId));

        const partDocsPromises = Array.from(allPartIds).map(pid => transaction.get(doc(db, 'parts', pid as string)));
        const partDocs = await Promise.all(partDocsPromises);
        
        const stockMap: Record<string, number> = {};
        partDocs.forEach(pd => {
          if (pd.exists()) stockMap[pd.id] = pd.data().stockQuantity;
        });

        // 2. LOGIC (Local calculations)
        const newStockLevels: Record<string, number> = { ...stockMap };
        
        // Revert old impact
        for (const oldPart of (oldRecord.partsUsed || [])) {
          if (newStockLevels[oldPart.partId] !== undefined) {
            newStockLevels[oldPart.partId] += oldPart.quantity;
          }
        }

        // Apply new impact
        for (const newPart of (editingRecord.partsUsed || [])) {
          if (newStockLevels[newPart.partId] === undefined) continue;
          if (newStockLevels[newPart.partId] < newPart.quantity) {
             throw new Error(`Insufficient stock for ${newPart.name}. Available: ${newStockLevels[newPart.partId]}`);
          }
          newStockLevels[newPart.partId] -= newPart.quantity;
        }

        // 3. EXECUTE ALL WRITES
        for (const pid in newStockLevels) {
           transaction.update(doc(db, 'parts', pid), {
             stockQuantity: newStockLevels[pid]
           });
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, vehicleId, customerId, technicianId, date, createdAt, updatedAt: _oldUpdatedAt, ...dataToUpdate } = editingRecord;
        transaction.update(recordRef, {
          ...dataToUpdate,
          partsCost: partsTotal,
          totalCost: totalCost,
          updatedAt: serverTimestamp()
        });
      });

      setEditingRecord(null);
      await fetchData();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`Update failed: ${errorMessage}`);
      handleFirestoreError(e, 'update', `serviceRecords/${editingRecord.id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const addPartToEditingRecord = (partId: string) => {
    if (!editingRecord) return;
    const part = parts.find(p => p.id === partId);
    if (!part) return;

    const existing = editingRecord.partsUsed?.find(p => p.partId === partId);
    if (existing) {
      setEditingRecord({
        ...editingRecord,
        partsUsed: editingRecord.partsUsed?.map(p => 
          p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p
        )
      });
    } else {
      setEditingRecord({
        ...editingRecord,
        partsUsed: [...(editingRecord.partsUsed || []), { 
          partId: part.id as string, 
          name: part.name, 
          quantity: 1, 
          unitPrice: part.price 
        }]
      });
    }
  };

  const getVehicleInfo = (id: string) => vehicles.find(v => v.id === id);
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';

  const addPartToRecord = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;

    const existing = newRecord.partsUsed?.find(p => p.partId === partId);
    if (existing) {
      setNewRecord({
        ...newRecord,
        partsUsed: newRecord.partsUsed?.map(p => 
          p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p
        )
      });
    } else {
      setNewRecord({
        ...newRecord,
        partsUsed: [...(newRecord.partsUsed || []), { 
          partId: part.id as string, 
          name: part.name, 
          quantity: 1, 
          unitPrice: part.price 
        }]
      });
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-workshop-text tracking-tight uppercase">Service History</h1>
          <p className="text-workshop-muted text-sm">Track and manage vehicle maintenance history.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-workshop-accent text-workshop-bg px-5 py-2.5 rounded shadow-lg shadow-workshop-accent/10 font-bold uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all font-black active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>New Job Card</span>
        </button>
      </header>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 bg-workshop-surface p-1 rounded-xl w-fit border border-workshop-border">
        {[
          { id: 'all', label: 'All Logs', count: records.length, color: 'text-workshop-secondary', bg: 'bg-workshop-secondary/20', border: 'border-workshop-secondary/20' },
          { id: 'pending', label: 'Pending', count: records.filter(r => r.status === 'pending' || r.status === 'in-progress').length, color: 'text-workshop-warning', bg: 'bg-workshop-warning/20', border: 'border-workshop-warning/20' },
          { id: 'completed', label: 'Completed', count: records.filter(r => r.status === 'completed').length, color: 'text-workshop-accent', bg: 'bg-workshop-accent/20', border: 'border-workshop-accent/20' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'all' | 'pending' | 'completed')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2",
              activeTab === tab.id ? cn("bg-workshop-card shadow-sm", tab.color) : "text-workshop-muted hover:text-workshop-text"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "text-sm font-black font-sans ml-2 tabular-nums",
                activeTab === tab.id ? tab.color : "text-workshop-muted/40"
              )}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className={cn("absolute inset-0 rounded-lg border pointer-events-none", tab.border)}
              />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {records
          .filter(r => {
            if (activeTab === 'all') return true;
            if (activeTab === 'pending') return r.status === 'pending' || r.status === 'in-progress';
            if (activeTab === 'completed') return r.status === 'completed';
            return true;
          }).length === 0 && !loading && (
          <div className="text-center py-20 text-workshop-muted text-sm">
            No {activeTab === 'all' ? '' : activeTab} records found in the logbook.
          </div>
        )}
        {records
          .filter(r => {
            if (activeTab === 'all') return true;
            if (activeTab === 'pending') return r.status === 'pending' || r.status === 'in-progress';
            if (activeTab === 'completed') return r.status === 'completed';
            return true;
          })
          .map((record, i) => {
          const v = getVehicleInfo(record.vehicleId);
          const customer = customers.find(c => c.id === record.customerId);
          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative bg-workshop-card rounded-xl border border-workshop-border shadow-sm overflow-hidden hover:border-workshop-accent/30 transition-all group"
            >
              {v?.make?.toUpperCase() === 'OLA' && (
                <div className="absolute inset-y-0 left-0 w-1/2 pointer-events-none opacity-[0.03] overflow-hidden grayscale brightness-200">
                  <img 
                    src="https://logos-world.net/wp-content/uploads/2023/11/Ola-Logo.png" 
                    alt="OLA Background" 
                    className="h-full w-full object-contain object-left scale-150 -translate-x-1/4"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="relative z-10 pt-5 pb-5 px-4 md:pt-6 md:pb-6 md:px-5 flex flex-col gap-3">
                 <div className="flex items-center gap-4 mb-1">
                    <div className="flex items-center gap-2 shrink-0">
                       <span className="text-[10px] font-black text-workshop-muted uppercase tracking-widest">{format(new Date(record.date), 'MMM')}</span>
                       <span className="text-xl font-black text-workshop-text tracking-tighter">{format(new Date(record.date), 'dd')}</span>
                    </div>
                    <div className="flex-1 h-px bg-workshop-border" />
                    <span className={cn(
                      "px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border",
                      record.status === 'completed' ? "bg-workshop-accent/10 text-workshop-accent border-workshop-accent/20" :
                      "bg-workshop-warning/10 text-workshop-warning border-workshop-warning/20"
                    )}>
                      {record.status}
                    </span>
                 </div>

                 <div className="flex flex-col gap-3">
                   <div className="flex-1 space-y-3">
                     <div className="flex flex-col gap-1">
                           <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs md:text-sm font-bold uppercase tracking-tight">
                              <span className="text-workshop-text">{getCustomerName(record.customerId)}</span>
                              <span className="text-workshop-muted opacity-30">|</span>
                              <span className="text-workshop-text">{v?.make} {v?.model}</span>
                              <span className="text-workshop-muted opacity-30">|</span>
                              <span className="text-workshop-secondary">{v?.plateNumber}</span>
                           </div>
                           <div className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-tight">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                 <span className={cn("font-mono whitespace-nowrap", record.isDeadVehicle ? "text-rose-500 italic opacity-80" : "text-workshop-warning")}>
                                   {record.isDeadVehicle ? "DEAD" : `${record.mileage.toLocaleString()} KM`}
                                 </span>
                                 {record.completionMileage && (
                                   <>
                                     <ArrowRight className="w-2 h-2 text-workshop-muted opacity-30 shrink-0" />
                                     <span className="text-[#4ade80] font-mono whitespace-nowrap">{record.completionMileage.toLocaleString()} KM</span>
                                   </>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="max-w-md bg-workshop-surface/30 rounded-lg p-2.5 border border-workshop-border/20">
                        <p className="text-workshop-text/90 text-[10px] md:text-xs font-bold tracking-tight whitespace-pre-wrap italic">
                          "{record.description}"
                        </p>
                     </div>
                   </div>

                   {record.expectedDeliveryDate && record.status !== 'completed' && (() => {
                     const dueDate = parseISO(record.expectedDeliveryDate);
                     const today = startOfDay(new Date());
                     const normalizedDueDate = startOfDay(dueDate);
                     const isToday = isSameDay(normalizedDueDate, today);
                     const isPast = isAfter(today, normalizedDueDate);
                     const diff = Math.abs(differenceInDays(normalizedDueDate, today));

                     return (
                       <div className="flex items-center gap-4 px-1 -mb-1">
                         <div className="flex items-center gap-1.5 text-workshop-muted/90">
                            <ScanHeart className="w-2.5 h-2.5 opacity-60 text-workshop-accent" />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Due: {format(dueDate, 'dd MMM')}</span>
                         </div>
                         <div className={cn(
                           "text-[10px] font-black uppercase tracking-widest leading-none",
                           isToday ? "text-workshop-warning" : isPast ? "text-rose-500" : "text-workshop-accent"
                         )}>
                           {isToday ? "Due Today" : isPast ? `${diff} Days Overdue` : `${diff} Days Left`}
                         </div>
                       </div>
                     );
                   })()}

                   <div className="flex items-center justify-between gap-4 pt-1 mb-1 px-1">
                      {record.technicianName && (
                        <div className="flex items-center gap-2 text-workshop-muted/60">
                           <User className="w-2.5 h-2.5 opacity-40" />
                           <span className="text-[10px] font-black uppercase tracking-widest leading-none">Advisor: {record.technicianName}</span>
                        </div>
                      )}

                      {customer?.phone && (
                        <a 
                          href={`tel:${customer.phone}`} 
                          className="flex items-center gap-2 text-[#10B981] hover:brightness-110 active:scale-95 transition-all outline-none"
                        >
                           <Phone className="w-3.5 h-3.5 fill-[#10B981]/10" />
                           <p className="text-sm font-black tracking-tight uppercase leading-none">
                             {customer.phone}
                           </p>
                        </a>
                      )}
                   </div>

                   <div className="h-px bg-workshop-border/30 w-full" />

                   <div className="flex items-center justify-between gap-4 pt-1 px-1">
                     <div className="flex flex-col translate-x-1">
                       <p className="text-[9px] font-bold text-workshop-muted uppercase tracking-widest leading-none mb-1.5">Job Total</p>
                       <p className="text-xl font-black text-workshop-text tracking-tighter leading-none">{formatCurrency(record.totalCost)}</p>
                     </div>

                     <div className="flex items-center gap-2">
                       <button 
                         onClick={() => setSelectedRecord(record)}
                         className="p-2 bg-[#0d0f11] border border-workshop-border/30 rounded-lg text-workshop-accent hover:bg-workshop-card transition-all active:scale-95 shadow-sm"
                         title="Details"
                       >
                         <Eye className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => setEditingRecord({...record})}
                         className="p-2 bg-[#0d0f11] border border-workshop-border/30 rounded-lg text-workshop-muted hover:text-workshop-secondary hover:border-workshop-secondary/20 transition-all active:scale-95 shadow-sm"
                         title="Edit"
                       >
                         <Edit3 className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => handleDeleteRecord(record)}
                         className="p-2 bg-[#0d0f11] border border-workshop-border/30 rounded-lg text-rose-500/60 hover:text-rose-500 hover:border-rose-500/20 transition-all active:scale-95 shadow-sm"
                         title="Delete"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 </div>
             </motion.div>
          );
        })}
      </div>

      {loading && (
         <div className="text-center py-20 text-workshop-muted text-sm">
          Fetching comprehensive history...
        </div>
      )}

      {/* Add Record Modal */}
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-workshop-card w-full max-w-2xl rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[95vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-workshop-text tracking-tight uppercase">
                    {lookupStep === 'search' ? 'Vehicle Discovery' : 'Initiate Maintenance Card'}
                  </h2>
                  <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest mt-1">
                    {lookupStep === 'search' ? 'Search records before intake' : 'Fill job requirements details'}
                  </p>
                </div>
                {lookupStep === 'form' && (
                  <button 
                    onClick={() => setLookupStep('search')}
                    className="text-[10px] font-bold text-workshop-accent uppercase tracking-widest hover:underline"
                  >
                    Back to Search
                  </button>
                )}
              </div>

              {lookupStep === 'search' ? (
                <div className="space-y-8 py-4">
                  <div className="flex bg-workshop-surface p-1 rounded-xl border border-workshop-border">
                    <button 
                      onClick={() => { setSearchType('plate'); setSearchQuery(''); setSearchResults([]); }}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                        searchType === 'plate' ? "bg-workshop-card text-workshop-accent shadow-sm" : "text-workshop-muted hover:text-workshop-text"
                      )}
                    >
                      Plate Number
                    </button>
                    <button 
                      onClick={() => { setSearchType('phone'); setSearchQuery(''); setSearchResults([]); }}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                        searchType === 'phone' ? "bg-workshop-card text-workshop-accent shadow-sm" : "text-workshop-muted hover:text-workshop-text"
                      )}
                    >
                      Phone Number / Name
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">
                         Enter {searchType === 'plate' ? 'Vehicle Plate' : 'Customer Phone or Name'}
                       </label>
                       <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-workshop-muted w-4 h-4" />
                          <input 
                            autoFocus
                            type="text"
                            placeholder={searchType === 'plate' ? "Start typing plate..." : "Search by phone or name..."}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-5 py-4 rounded-xl outline-none focus:border-workshop-accent focus:bg-workshop-surface/50 transition-all text-sm font-bold text-workshop-text shadow-sm uppercase placeholder:normal-case placeholder:text-workshop-muted/50"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
                    {searchQuery.length > 0 && searchResults.length === 0 && (
                      <div className="p-8 text-center bg-workshop-surface/30 rounded-xl border border-workshop-border border-dashed">
                        <p className="text-workshop-muted text-sm font-medium tracking-tight">Record does not exist</p>
                      </div>
                    )}

                    {searchResults.map((res, i) => (
                      <button
                        key={`${res.customer.id}-${res.vehicle?.id || i}`}
                        onClick={() => handleSelectResult(res.customer, res.vehicle)}
                        className="w-full flex items-center justify-between p-4 bg-workshop-surface hover:bg-workshop-surface/80 border border-workshop-border rounded-xl transition-all group text-left shadow-sm hover:border-workshop-accent/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-workshop-bg rounded-xl flex items-center justify-center font-black text-workshop-text uppercase text-xs border border-workshop-border">
                            {res.vehicle ? res.vehicle.plateNumber.slice(-4) : res.customer.name[0]}
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-workshop-accent uppercase tracking-widest mb-0.5">
                               {res.vehicle ? `${res.vehicle.make} ${res.vehicle.model}` : 'New Vehicle Entry Needed'}
                             </p>
                             <p className="text-sm font-bold text-workshop-text leading-tight uppercase flex items-center gap-2">
                               {res.customer.name}
                               {res.vehicle && (
                                 <>
                                   <span className="text-workshop-muted font-normal opacity-40">|</span>
                                   <span className="font-mono text-sm text-workshop-secondary uppercase tracking-tighter">{res.vehicle.plateNumber}</span>
                                 </>
                               )}
                             </p>
                             <div className="flex items-center gap-2 mt-1">
                               <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-wider">{res.customer.phone}</p>
                             </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-accent transition-all group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-workshop-border">
                     {[
                       { icon: ScanHeart, label: 'Plate Search', active: searchType === 'plate' },
                       { icon: User, label: 'Phone Search', active: searchType === 'phone' }
                     ].map((t, i) => (
                       <div 
                         key={i} 
                         onClick={() => setSearchType(i === 0 ? 'plate' : 'phone')}
                         className={cn(
                           "flex flex-col items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer",
                           t.active ? "bg-workshop-accent/10 border-workshop-accent/30 text-workshop-accent" : "bg-workshop-surface border-workshop-border text-workshop-muted opacity-60"
                         )}
                       >
                          <t.icon className="w-5 h-5" />
                          <span className="text-[8px] font-black uppercase tracking-[0.2em]">{t.label}</span>
                       </div>
                     ))}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-workshop-border pt-8 text-center">
                     <button 
                        onClick={() => setLookupStep('form')}
                        className="w-full py-2 text-workshop-muted text-[10px] font-black uppercase tracking-[0.3em] hover:text-workshop-accent transition-colors"
                     >
                        Skip to manual entry
                     </button>
                     <button 
                        onClick={() => setShowAddModal(false)}
                        className="w-full py-2 text-workshop-muted/50 text-[10px] font-black uppercase tracking-[0.3em] hover:text-rose-400 transition-colors"
                     >
                        Cancel Intake
                     </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddRecord} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Service Vehicle</label>
                      <Select 
                        value={newRecord.vehicleId} 
                        onValueChange={(val) => setNewRecord({...newRecord, vehicleId: val})}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select current vehicle..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.id!}>
                              {v.plateNumber} — {v.make} {v.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Current KM Reading</label>
                    <div className="relative">
                      <input 
                        required
                        type="number" 
                        disabled={newRecord.isDeadVehicle}
                        value={newRecord.isDeadVehicle ? '' : newRecord.mileage}
                        onChange={e => setNewRecord({...newRecord, mileage: Number(e.target.value)})}
                        className={cn(
                          "w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text",
                          newRecord.isDeadVehicle && "opacity-40"
                        )}
                        placeholder={newRecord.isDeadVehicle ? "Vehicle Dead" : "0"}
                      />
                      <button
                        type="button"
                        onClick={() => setNewRecord({...newRecord, isDeadVehicle: !newRecord.isDeadVehicle, mileage: 0})}
                        className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[8px] font-black uppercase transition-all",
                          newRecord.isDeadVehicle ? "bg-rose-500 text-white" : "bg-workshop-bg text-workshop-muted border border-workshop-border"
                        )}
                      >
                        {newRecord.isDeadVehicle ? "Dead" : "Alive"}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Expected Delivery Date</label>
                    <input 
                      type="date"
                      value={newRecord.expectedDeliveryDate || ''}
                      onChange={e => setNewRecord({...newRecord, expectedDeliveryDate: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Service Breakdown</label>
                  <textarea 
                    required
                    value={newRecord.description}
                    onChange={e => setNewRecord({...newRecord, description: e.target.value})}
                    className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none h-24 resize-none text-sm focus:ring-1 focus:ring-workshop-accent text-workshop-text"
                    placeholder="Enter maintenance details..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Technical Remarks</label>
                  <textarea 
                    value={newRecord.remarks}
                    onChange={e => setNewRecord({...newRecord, remarks: e.target.value})}
                    className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none h-20 resize-none text-sm focus:ring-1 focus:ring-workshop-accent text-workshop-text"
                    placeholder="Additional technician observations or advice..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-workshop-border pt-6">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <h3 className="font-bold text-workshop-muted uppercase tracking-widest text-[10px]">Parts Allocation</h3>
                      </div>
                      <div className="relative">
                        <Select onValueChange={(val) => addPartToRecord(val)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="+ Allocate part..." />
                          </SelectTrigger>
                          <SelectContent>
                            {parts.map(p => (
                              <SelectItem key={p.id} value={p.id!} disabled={p.stockQuantity <= 0}>
                                {p.name} ({p.stockQuantity} rem.)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                        {newRecord.partsUsed?.map((up, idx) => (
                           <div key={idx} className="flex items-center justify-between p-3 bg-workshop-surface/30 rounded-xl border border-workshop-border">
                              <div className="flex-1">
                               <p className="text-xs font-bold text-workshop-text uppercase">{up.name}</p>
                                 <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">{formatCurrency(up.unitPrice)} x {up.quantity}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button 
                                   type="button" 
                                   onClick={() => {
                                       const updated = [...(newRecord.partsUsed || [])];
                                       if (updated[idx].quantity > 1) {
                                          updated[idx].quantity -= 1;
                                          setNewRecord({...newRecord, partsUsed: updated});
                                       } else {
                                          setNewRecord({...newRecord, partsUsed: updated.filter((_, i) => i !== idx)});
                                       }
                                   }}
                                   className="w-7 h-7 border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all text-sm"
                                  >
                                    -
                                  </button>
                                  <span className="w-5 text-center font-black text-xs text-workshop-text">{up.quantity}</span>
                                  <button 
                                   type="button" 
                                   onClick={() => {
                                       const updated = [...(newRecord.partsUsed || [])];
                                       updated[idx].quantity += 1;
                                       setNewRecord({...newRecord, partsUsed: updated});
                                   }}
                                   className="w-7 h-7 border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-workshop-accent hover:bg-workshop-accent/10 transition-all text-sm"
                                  >
                                    +
                                  </button>
                              </div>
                           </div>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h3 className="font-bold text-workshop-muted uppercase tracking-widest text-[10px]">Financial Summary</h3>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">Labor Fees (INR)</label>
                        <input 
                          type="number" 
                          value={newRecord.laborCost}
                          onChange={e => setNewRecord({...newRecord, laborCost: Number(e.target.value)})}
                          className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-sm font-black text-workshop-text tracking-tight"
                        />
                      </div>
                      <div className="p-5 bg-workshop-bg border border-workshop-border rounded-xl space-y-4">
                         <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-workshop-muted/50">
                            <span>Description</span>
                            <span>Calculated</span>
                         </div>
                         <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span className="text-workshop-muted">Total Labor</span>
                            <span className="text-workshop-text">{formatCurrency(newRecord.laborCost || 0)}</span>
                         </div>
                         <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                            <span className="text-workshop-muted">Total Parts</span>
                            <span className="text-workshop-text">{formatCurrency((newRecord.partsUsed || []).reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0))}</span>
                         </div>
                         <div className="pt-3 border-t border-workshop-border flex justify-between font-black text-lg items-end">
                            <span className="text-workshop-accent text-[10px] uppercase tracking-[0.2em]">Grand Total</span>
                            <span className="tracking-tighter text-workshop-text">{formatCurrency((newRecord.laborCost || 0) + (newRecord.partsUsed || []).reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0))}</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 px-4 py-4 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-workshop-accent/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      'Authorize Job Card'
                    )}
                  </button>
                </div>
              </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Service Details Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="absolute inset-0 bg-workshop-bg/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-workshop-card w-full max-w-xl rounded-xl shadow-2xl border border-workshop-border overflow-hidden"
            >
              <div className="bg-workshop-accent p-6 text-workshop-bg text-center">
                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Maintenance Summary</p>
                 <h2 className="text-2xl font-black tracking-tighter uppercase">Job Card #{selectedRecord.id.slice(-6).toUpperCase()}</h2>
              </div>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
                 <div className="grid grid-cols-2 gap-8 pb-8 border-b border-workshop-border">
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">Service Date</p>
                       <p className="font-bold text-workshop-text">{format(new Date(selectedRecord.date), 'MMMM dd, yyyy')}</p>
                       {selectedRecord.technicianName && (
                         <div className="flex items-center gap-1.5 mt-2 transition-opacity">
                            <User className="w-3 h-3 text-workshop-accent opacity-50" />
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-workshop-muted">Issued by {selectedRecord.technicianName}</span>
                         </div>
                       )}
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">Current Status</p>
                       <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border inline-block mt-1",
                          selectedRecord.status === 'completed' ? "bg-workshop-accent/10 text-workshop-accent border-workshop-accent/20" :
                          "bg-workshop-warning/10 text-workshop-warning border-workshop-warning/20"
                        )}>
                          {selectedRecord.status}
                        </span>
                       <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest mt-4">Expected Delivery</p>
                       <p className="font-bold text-workshop-secondary">
                         {selectedRecord.expectedDeliveryDate 
                           ? format(new Date(selectedRecord.expectedDeliveryDate), 'MMMM dd, yyyy')
                           : 'Not Specified'}
                       </p>
                       {selectedRecord.expectedDeliveryDate && selectedRecord.status !== 'completed' && (
                         <span className="text-[9px] font-black uppercase text-workshop-warning animate-pulse mt-1 inline-block">
                           {Math.max(0, Math.ceil((new Date(selectedRecord.expectedDeliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Business Days Remaining
                         </span>
                       )}
                    </div>
                 </div>

                 {/* Vehicle & Customer */}
                 <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-workshop-surface/30 rounded-xl border border-workshop-border">
                       <div className="w-10 h-10 bg-workshop-bg rounded-lg flex items-center justify-center border border-workshop-border shadow-sm">
                          <Car className="w-5 h-5 text-workshop-secondary" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">Vehicle Details</p>
                          <p className="font-bold text-workshop-text text-sm">
                             {getVehicleInfo(selectedRecord.vehicleId)?.make} {getVehicleInfo(selectedRecord.vehicleId)?.model}
                             <span className="text-workshop-muted font-normal opacity-40"> | </span><span className="font-mono text-workshop-secondary uppercase tracking-widest">{getVehicleInfo(selectedRecord.vehicleId)?.plateNumber}</span>
                             {getVehicleInfo(selectedRecord.vehicleId)?.color && (
                               <>
                                 <span className="text-workshop-muted font-normal opacity-40"> | </span>
                                 <span className="text-white font-bold uppercase tracking-widest">{getVehicleInfo(selectedRecord.vehicleId)?.color}</span>
                               </>
                             )}
                          </p>
                          <p className="text-[10px] font-semibold text-workshop-muted mt-1 tracking-tight">Owned by {getCustomerName(selectedRecord.customerId)}</p>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">Technician Notes</p>
                       <p className="text-sm text-workshop-text/80 leading-relaxed bg-workshop-secondary/5 p-4 rounded-lg border border-workshop-secondary/10">
                          "{selectedRecord.description}"
                       </p>
                    </div>

                 </div>

                 {/* Parts Used */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">Parts & Materials</p>
                       <p className="text-[10px] font-black text-workshop-text">{selectedRecord.partsUsed?.length || 0} ITEMS</p>
                    </div>
                    <div className="space-y-2">
                       {selectedRecord.partsUsed?.map((part, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs py-2 border-b border-workshop-border/30 last:border-0 border-dashed">
                             <div className="flex items-center gap-3">
                                <span className="w-5 h-5 bg-workshop-surface text-workshop-muted flex items-center justify-center rounded text-[10px] font-bold">{part.quantity}x</span>
                                <span className="font-medium text-workshop-text whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{part.name}</span>
                             </div>
                             <span className="font-bold text-workshop-text">{formatCurrency(part.unitPrice * part.quantity)}</span>
                          </div>
                       ))}
                       {!selectedRecord.partsUsed?.length && (
                          <p className="text-xs text-workshop-muted py-2">No parts were billed for this service.</p>
                       )}
                    </div>
                 </div>

                 {/* Financials */}
                 <div className="pt-6 border-t border-workshop-border space-y-3">
                    <div className="flex justify-between text-xs font-semibold">
                       <span className="text-workshop-muted">Labor & Service Fees</span>
                       <span className="text-workshop-text">{formatCurrency(selectedRecord.laborCost)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                       <span className="text-workshop-muted">Parts & Hardware</span>
                       <span className="text-workshop-text">{formatCurrency(selectedRecord.partsCost)}</span>
                    </div>
                    <div className="flex justify-between items-end pt-4">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-secondary">Total Billed</p>
                       <p className="text-2xl font-black text-workshop-text leading-none tracking-tighter">{formatCurrency(selectedRecord.totalCost)}</p>
                    </div>
                 </div>
              </div>

              <div className="p-4 bg-workshop-surface/50 border-t border-workshop-border">
                 <button 
                  onClick={() => setSelectedRecord(null)}
                  className="w-full bg-workshop-card border border-workshop-border text-workshop-text py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-workshop-surface transition-all shadow-sm"
                 >
                    Close Log View
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Record Modal */}
      <AnimatePresence>
        {editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingRecord(null)}
              className="absolute inset-0 bg-workshop-bg/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-workshop-card w-full max-w-2xl rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[95vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-workshop-text tracking-tight uppercase">Update Service Entry</h2>
                <div className="flex items-center gap-2">
                   <button 
                     type="button"
                     onClick={() => setEditingRecord({...editingRecord, status: 'pending'})}
                     className={cn(
                       "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                       editingRecord.status === 'pending' || editingRecord.status === 'in-progress' 
                        ? "bg-workshop-warning text-workshop-bg border-workshop-warning shadow-md" 
                        : "bg-workshop-surface text-workshop-muted border-workshop-border hover:border-workshop-warning/30"
                     )}
                   >
                     Pending
                   </button>
                   <button 
                     type="button"
                     onClick={() => setEditingRecord({...editingRecord, status: 'completed'})}
                     className={cn(
                       "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                       editingRecord.status === 'completed' 
                        ? "bg-workshop-accent text-workshop-bg border-workshop-accent shadow-md" 
                        : "bg-workshop-surface text-workshop-muted border-workshop-border hover:border-workshop-accent/30"
                     )}
                   >
                     Completed
                   </button>
                </div>
              </div>

              <form onSubmit={handleUpdateRecord} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="p-4 bg-workshop-secondary/10 rounded-xl border border-workshop-secondary/20">
                       <p className="text-[10px] font-bold text-workshop-secondary uppercase tracking-widest mb-1">Vehicle Reference</p>
                       <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="font-bold text-workshop-text text-sm flex items-center gap-2">
                             {getVehicleInfo(editingRecord.vehicleId)?.make} {getVehicleInfo(editingRecord.vehicleId)?.model} 
                             <span className="text-workshop-muted font-normal opacity-40">|</span>
                             <span className="font-mono text-sm text-workshop-secondary uppercase">{getVehicleInfo(editingRecord.vehicleId)?.plateNumber}</span>
                             {getVehicleInfo(editingRecord.vehicleId)?.color && (
                               <>
                                 <span className="text-workshop-muted font-normal opacity-40">|</span>
                                 <span className="text-white text-sm font-bold uppercase tracking-tight">{getVehicleInfo(editingRecord.vehicleId)?.color}</span>
                               </>
                             )}
                          </p>
                          <span className="text-workshop-muted font-normal opacity-40">|</span>
                          <span className={cn(
                            "font-mono text-sm font-black uppercase tracking-tight",
                            editingRecord.isDeadVehicle ? "text-rose-500 italic" : "text-workshop-warning"
                          )}>
                            {editingRecord.isDeadVehicle ? "DEAD" : `${editingRecord.mileage.toLocaleString()} KM`}
                          </span>
                       </div>
                    </div>
                    {(editingRecord.status === 'completed' || (editingRecord.completionMileage && editingRecord.completionMileage > 0)) && (
                       <div className="p-4 bg-workshop-surface rounded-xl border border-[#4ade80]/30 shadow-sm shadow-[#4ade80]/5 animate-in fade-in slide-in-from-top-1 duration-300">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-[#4ade80] block mb-1 font-black">Completion Odometer</label>
                         <input 
                           required={editingRecord.status === 'completed'}
                           type="number" 
                           value={editingRecord.completionMileage || ''}
                           onChange={e => setEditingRecord({...editingRecord, completionMileage: Number(e.target.value)})}
                           className="w-full bg-workshop-bg border border-[#4ade80]/20 px-3 py-1.5 rounded-lg outline-none text-sm font-black focus:ring-1 focus:ring-[#4ade80] text-workshop-text"
                           placeholder="Reading at finish..."
                         />
                       </div>
                    )}
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Maintenance & Execution Remarks</label>
                   <textarea 
                     required
                     value={editingRecord.description}
                     onChange={e => setEditingRecord({...editingRecord, description: e.target.value})}
                     className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none h-24 resize-none text-sm focus:ring-1 focus:ring-workshop-accent text-workshop-text"
                     placeholder="Enter maintenance details..."
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Final Observations (Optional)</label>
                   <textarea 
                     value={editingRecord.remarks || ''}
                     onChange={e => setEditingRecord({...editingRecord, remarks: e.target.value})}
                     className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none h-20 resize-none text-sm focus:ring-1 focus:ring-workshop-accent text-workshop-text"
                     placeholder="Any additional remarks for the customer..."
                   />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h3 className="font-bold text-workshop-muted uppercase tracking-widest text-[10px]">Adjust Parts Used</h3>
                       <div className="relative">
                         <Select onValueChange={(val) => addPartToEditingRecord(val)}>
                           <SelectTrigger className="w-full shadow-sm">
                             <SelectValue placeholder="+ Add or Replace part..." />
                           </SelectTrigger>
                           <SelectContent>
                             {parts.map(p => (
                               <SelectItem key={p.id} value={p.id!}>
                                 {p.name} (Stock: {p.stockQuantity})
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       
                       <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                         {editingRecord.partsUsed?.map((up, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-workshop-surface/30 rounded-xl border border-workshop-border shadow-sm">
                               <div className="flex-1">
                                  <p className="text-xs font-bold text-workshop-text uppercase">{up.name}</p>
                                  <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">{formatCurrency(up.unitPrice)} x {up.quantity}</p>
                               </div>
                               <div className="flex items-center gap-2">
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                       const updated = [...(editingRecord.partsUsed || [])];
                                       if (updated[idx].quantity > 1) {
                                          updated[idx].quantity -= 1;
                                          setEditingRecord({...editingRecord, partsUsed: updated});
                                       } else {
                                          setEditingRecord({...editingRecord, partsUsed: updated.filter((_, i) => i !== idx)});
                                       }
                                    }}
                                    className="w-6 h-6 border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all text-xs"
                                   >
                                     -
                                   </button>
                                   <span className="w-4 text-center font-black text-xs text-workshop-text">{up.quantity}</span>
                                   <button 
                                    type="button" 
                                    onClick={() => {
                                       const updated = [...(editingRecord.partsUsed || [])];
                                       updated[idx].quantity += 1;
                                       setEditingRecord({...editingRecord, partsUsed: updated});
                                    }}
                                    className="w-6 h-6 border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-workshop-accent hover:bg-workshop-accent/10 transition-all text-xs"
                                   >
                                     +
                                   </button>
                               </div>
                            </div>
                         ))}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="font-bold text-workshop-muted uppercase tracking-widest text-[10px]">Billing Adjustment</h3>
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">Labor Fees (INR)</label>
                         <input 
                           type="number" 
                           value={editingRecord.laborCost}
                           onChange={e => setEditingRecord({...editingRecord, laborCost: Number(e.target.value)})}
                           className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none text-sm font-black focus:ring-1 focus:ring-workshop-accent text-workshop-text transition-all"
                         />
                       </div>
                       <div className="p-5 bg-workshop-accent/90 text-workshop-bg rounded-xl shadow-lg space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
                          <div className="flex justify-between text-xs font-medium opacity-80">
                             <span>Labor Subtotal</span>
                             <span className="font-bold">{formatCurrency(editingRecord.laborCost || 0)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium opacity-80">
                             <span>Parts Subtotal</span>
                             <span className="font-bold">{formatCurrency((editingRecord.partsUsed || []).reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0))}</span>
                          </div>
                          <div className="pt-3 border-t border-workshop-bg/10 flex justify-between font-black text-xl items-end">
                             <span className="text-workshop-bg/60 text-[10px] uppercase tracking-[0.2em]">Updated Total</span>
                             <span className="tracking-tighter">{formatCurrency((editingRecord.laborCost || 0) + (editingRecord.partsUsed || []).reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0))}</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-6">
                   <button 
                     type="button" 
                     onClick={() => setEditingRecord(null)}
                     className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-sm font-bold text-workshop-muted hover:bg-workshop-surface transition-all uppercase tracking-widest"
                   >
                     Discard Changes
                   </button>
                   <button 
                     type="submit" 
                     className="flex-1 px-4 py-3 bg-workshop-accent text-workshop-bg rounded-xl text-sm font-black shadow-md hover:bg-emerald-500 transition-all uppercase tracking-widest"
                   >
                     {isUpdating ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Apply Update"}
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
