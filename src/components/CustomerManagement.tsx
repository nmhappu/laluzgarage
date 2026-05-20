import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, auth } from '../lib/firebase';
import { Plus, Search, Phone, Edit2, Trash2, X, History, Wrench, Package, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Customer, Vehicle, ServiceRecord } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { Portal } from './Portal';

export function CustomerManagement() {
  // --- State: Data ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- State: UI Control ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCustomerForTransactions, setSelectedCustomerForTransactions] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- State: Active Models ---
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    phone: ''
  });
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // --- Effects: Handlers ---
  useEffect(() => {
    fetchCustomers();
  }, []);

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
      } else if (selectedCustomerForTransactions) {
        setSelectedCustomerForTransactions(null);
        e.preventDefault();
      }
    };

    window.addEventListener("appBackButton", handleBackButton);
    return () => window.removeEventListener("appBackButton", handleBackButton);
  }, [showEditModal, showAddModal, showDeleteConfirm, selectedCustomerForTransactions]);

  /**
   * Fetches all customers, their vehicles, and service history logs.
   */
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
      const customerSnap = await getDocs(q);
      const vehicleSnap = await getDocs(collection(db, 'vehicles'));
      const serviceSnap = await getDocs(query(collection(db, 'serviceRecords'), orderBy('date', 'desc')));

      setCustomers(customerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      setVehicles(vehicleSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
      setServiceRecords(serviceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) return;

    try {
      await addDoc(collection(db, 'customers'), {
        ...newCustomer,
        technicianId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewCustomer({ name: '', phone: '' });
      fetchCustomers();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'create', 'customers');
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name || !editingCustomer.phone) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, technicianId, createdAt, updatedAt: _oldUpdatedAt, ...data } = editingCustomer;
      await updateDoc(doc(db, 'customers', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      setShowEditModal(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'update', `customers/${editingCustomer.id}`);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      await deleteDoc(doc(db, 'customers', customerToDelete.id));
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'delete', `customers/${customerToDelete.id}`);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-workshop-text tracking-tight uppercase">Customer Directory</h1>
          <p className="text-workshop-muted text-sm">Manage and track workshop clients.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-workshop-accent text-workshop-bg px-5 py-2.5 rounded shadow-lg shadow-workshop-accent/10 font-bold uppercase text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </header>

      <div className="relative flex items-center">
        <Search className="absolute left-4 text-workshop-muted w-4 h-4" />
        <input 
          type="text" 
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-workshop-accent focus:border-workshop-accent text-sm text-workshop-text"
        />
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
            <motion.div
              key="skeletons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-workshop-card p-4 rounded-xl border border-workshop-border shadow-sm animate-pulse h-[180px] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-workshop-surface rounded-lg opacity-40" />
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-workshop-surface rounded-lg opacity-40" />
                      <div className="w-8 h-8 bg-workshop-surface rounded-lg opacity-40" />
                    </div>
                  </div>
                  <div className="h-4 bg-workshop-surface rounded w-3/4 mb-4 opacity-40" />
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-workshop-accent/20 rounded-full" />
                    <div className="h-3 bg-workshop-surface rounded w-1/2 opacity-40" />
                  </div>
                </div>
                <div className="pt-4 border-t border-workshop-border flex justify-end">
                  <div className="h-3 bg-workshop-accent/20 rounded w-1/4" />
                </div>
              </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="customer-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filteredCustomers.map((customer) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="bg-workshop-card p-4 rounded-xl border border-workshop-border shadow-sm hover:border-workshop-accent/30 transition-all group relative h-[180px] flex flex-col justify-between overflow-hidden bg-clip-padding"
                >
                  <div>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-start justify-between mb-2"
                    >
                      <div className="w-10 h-10 bg-workshop-surface rounded-lg border border-workshop-border flex items-center justify-center text-workshop-muted group-hover:bg-workshop-accent/10 group-hover:text-workshop-accent transition-colors font-black text-xs">
                        {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div className="flex gap-2 relative z-20">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCustomer(customer);
                            setShowEditModal(true);
                          }}
                          className="p-3 text-workshop-muted hover:text-workshop-accent hover:bg-workshop-surface rounded-lg transition-all"
                          aria-label="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomerToDelete(customer);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-3 text-workshop-muted hover:text-status-urgent hover:bg-workshop-surface rounded-lg transition-all"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                    <motion.h3 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-bold text-workshop-text mb-2 uppercase tracking-tight"
                    >
                      {customer.name}
                    </motion.h3>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3 text-xs text-workshop-muted"
                    >
                      <div className="flex items-center gap-3">
                        <a 
                          href={`tel:${customer.phone}`}
                          className="flex items-center gap-1.5 group/phone hover:no-underline"
                        >
                          <Phone className="w-4 h-4 text-workshop-accent transition-all" />
                          <span className="font-bold text-workshop-accent tracking-wider">{customer.phone}</span>
                        </a>
                      </div>
                    </motion.div>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pt-2 border-t border-workshop-border flex justify-end relative z-10"
                  >
                    <button 
                      onClick={() => setSelectedCustomerForTransactions(customer)}
                      className="text-[10px] font-bold uppercase tracking-widest text-workshop-accent hover:brightness-110 active:scale-95 p-2"
                    >
                      View History
                    </button>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      {!loading && filteredCustomers.length === 0 && (
        <div className="text-center py-20 text-workshop-muted text-sm italic">
          No records found match your criteria.
        </div>
      )}

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
                className="relative bg-workshop-card w-full max-w-md rounded-xl p-8 shadow-2xl border border-workshop-border"
              >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-workshop-text uppercase tracking-tight">New Customer</h2>
                <button onClick={() => setShowAddModal(false)} className="text-workshop-muted hover:text-workshop-text transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddCustomer} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                    placeholder="e.g. Jonathan Vickers"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Primary Phone</label>
                  <input 
                    required
                    type="tel" 
                    inputMode="tel"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                    placeholder="+91 00000 00000"
                  />
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
                    className="flex-1 px-4 py-2.5 bg-workshop-accent text-workshop-bg rounded-xl text-sm font-black uppercase tracking-widest shadow-sm hover:brightness-110 transition-all"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingCustomer && (
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
                className="relative bg-workshop-card w-full max-w-md rounded-xl p-8 shadow-2xl border border-workshop-border"
              >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-workshop-text uppercase tracking-tight">Edit Client</h2>
                <button onClick={() => setShowEditModal(false)} className="text-workshop-muted hover:text-workshop-text">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEditCustomer} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={editingCustomer.name}
                    onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}
                    className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Primary Phone</label>
                  <input 
                    required
                    type="tel" 
                    inputMode="tel"
                    value={editingCustomer.phone}
                    onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                    className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2.5 border border-workshop-border rounded-xl text-sm font-bold text-workshop-muted hover:bg-workshop-surface"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-2.5 bg-workshop-accent text-workshop-bg rounded-xl text-sm font-black uppercase tracking-widest shadow-sm hover:brightness-110 transition-all"
                  >
                    Update
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && customerToDelete && (
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
              <h2 className="text-xl font-bold text-workshop-text mb-2 tracking-tight">Delete Client?</h2>
              <p className="text-workshop-muted text-sm mb-8">
                Are you sure you want to remove <span className="font-bold text-workshop-text underline">{customerToDelete.name}</span>?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-workshop-border rounded-xl text-sm font-bold text-workshop-muted hover:bg-workshop-surface transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteCustomer}
                  className="flex-1 px-4 py-2.5 bg-status-urgent text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-status-urgent/20 hover:brightness-110 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Billing History Modal */}
      <AnimatePresence>
        {selectedCustomerForTransactions && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedCustomerForTransactions(null)}
                className="absolute inset-0 bg-workshop-bg/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-workshop-card w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-workshop-border"
              >
              <div className="bg-workshop-surface p-6 sm:p-8 text-workshop-text relative border-b border-workshop-border">
                <button 
                  onClick={() => setSelectedCustomerForTransactions(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-workshop-accent/10 rounded-full transition-colors text-workshop-muted hover:text-workshop-accent"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-workshop-accent/10 rounded-2xl flex items-center justify-center border border-workshop-accent/20">
                      <History className="w-7 h-7 text-workshop-accent" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight uppercase leading-none mb-1">History</h2>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-workshop-accent" />
                        <p className="text-workshop-muted text-[10px] font-black uppercase tracking-widest leading-none">
                          {selectedCustomerForTransactions.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="flex items-center gap-6 sm:border-l border-workshop-border sm:pl-8">
                    <div>
                      <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest mb-1">Lifetime Value</p>
                      <p className="text-xl font-black text-workshop-accent tracking-tighter leading-none">
                        {formatCurrency(
                          serviceRecords
                            .filter(r => r.customerId === selectedCustomerForTransactions.id)
                            .reduce((sum, r) => sum + r.totalCost, 0)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest mb-1">Services</p>
                      <p className="text-xl font-black text-workshop-text tracking-tighter leading-none">
                        {serviceRecords.filter(r => r.customerId === selectedCustomerForTransactions.id).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-workshop-bg/50">
                {serviceRecords.filter(r => r.customerId === selectedCustomerForTransactions.id).length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {serviceRecords
                      .filter(r => r.customerId === selectedCustomerForTransactions.id)
                      .map((record) => (
                        <motion.div 
                          key={record.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-workshop-card rounded-2xl border border-workshop-border overflow-hidden shadow-sm hover:border-workshop-accent/30 transition-all group"
                        >
                          <div className="flex flex-col">
                            {/* Main Content */}
                            <div className="flex-1 p-6">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-6">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-workshop-accent uppercase tracking-widest leading-none">{format(new Date(record.date), 'dd MMM yyyy')}</span>
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                      record.status === 'completed' ? "bg-status-success/10 text-status-success border-status-success/20" :
                                      record.status === 'in-progress' ? "bg-status-pending/10 text-status-pending border-status-pending/20" :
                                      record.status === 'pending' ? "bg-status-urgent/10 text-status-urgent border-status-urgent/20" :
                                      "bg-workshop-muted/10 text-workshop-muted border-workshop-border"
                                    )}>
                                      {record.status}
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider leading-none mb-1.5">
                                      {vehicles.find(v => v.id === record.vehicleId)?.make} {vehicles.find(v => v.id === record.vehicleId)?.model}
                                    </h4>
                                    <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest leading-none">
                                      {vehicles.find(v => v.id === record.vehicleId)?.plateNumber}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end shrink-0 sm:mt-1">
                                  <p className="text-[9px] font-black text-workshop-muted uppercase tracking-[0.2em] mb-1">Settled Amount</p>
                                  <p className="text-2xl font-black text-workshop-accent tracking-tighter leading-none">{formatCurrency(record.totalCost)}</p>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="p-4 bg-workshop-surface/50 rounded-xl border border-workshop-border/30 relative">
                                  <div className="text-workshop-text/90 text-xs font-medium leading-relaxed space-y-1">
                                    {record.description.split("\n").map((line, i) => {
                                      const cleanLine = line.replace(/^\[[x ]\]\s*/, "");
                                      return cleanLine ? (
                                        <div key={i} className="flex items-start gap-2">
                                          <span className="text-workshop-accent mt-1">•</span>
                                          <span>{cleanLine}</span>
                                        </div>
                                      ) : null;
                                    })}
                                  </div>
                                </div>

                                {record.personalItems && (
                                  <div className="p-3 bg-status-success/5 rounded-xl border border-status-success/10 flex items-center gap-3 ring-1 ring-status-success/5">
                                    <Package className="w-5 h-5 text-status-success shrink-0" />
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-[10px] font-black text-status-success uppercase tracking-widest leading-none shrink-0">Personal Items:</span>
                                      <p className="text-xs text-workshop-text/90 font-bold leading-relaxed whitespace-pre-line">
                                        {record.personalItems}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                  <div className="bg-workshop-surface/30 p-2 rounded-lg border border-workshop-border flex flex-col">
                                    <span className="text-[8px] font-bold text-workshop-muted uppercase tracking-widest mb-1">Mileage</span>
                                    <div className="flex items-center gap-1.5">
                                      <Wrench className="w-3 h-3 text-workshop-accent" />
                                      <span className="text-xs font-black text-workshop-text leading-none">{record.mileage.toLocaleString()}</span>
                                    </div>
                                  </div>
                                  <div className="bg-workshop-surface/30 p-2 rounded-lg border border-workshop-border flex flex-col">
                                    <span className="text-[8px] font-bold text-workshop-muted uppercase tracking-widest mb-1">Inventory</span>
                                    <div className="flex items-center gap-1.5">
                                      <Package className="w-3 h-3 text-workshop-secondary" />
                                      <span className="text-xs font-black text-workshop-text leading-none">{record.partsUsed.length} SKU</span>
                                    </div>
                                  </div>
                                  <div className="bg-workshop-surface/30 p-2 rounded-lg border border-workshop-border flex flex-col">
                                    <span className="text-[8px] font-bold text-workshop-muted uppercase tracking-widest mb-1">Labor</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black text-workshop-text leading-none">{formatCurrency(record.laborCost)}</span>
                                    </div>
                                  </div>
                                  <div className="bg-workshop-surface/30 p-2 rounded-lg border border-workshop-border flex flex-col">
                                    <span className="text-[8px] font-bold text-workshop-muted uppercase tracking-widest mb-1">Parts</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black text-workshop-text leading-none">{formatCurrency(record.partsCost)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 px-8">
                    <div className="w-20 h-20 bg-workshop-surface rounded-2xl flex items-center justify-center mx-auto mb-6 text-workshop-muted border border-workshop-border">
                      <ShieldCheck className="w-10 h-10 opacity-20" />
                    </div>
                    <h3 className="text-workshop-text font-black uppercase tracking-tight">No Financial Footprint</h3>
                    <p className="text-workshop-muted text-sm mt-3 max-w-xs mx-auto leading-relaxed">This customer has no recorded service transactions or billing history in the directory.</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-workshop-surface border-t border-workshop-border flex justify-end">
                 <button 
                  onClick={() => setSelectedCustomerForTransactions(null)}
                  className="px-8 py-3 bg-workshop-accent text-workshop-bg text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 shadow-lg shadow-workshop-accent/10 active:scale-95 transition-all"
                 >
                   Close Ledger
                 </button>
              </div>
            </motion.div>
          </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}
