import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, auth } from '../lib/firebase';
import { Plus, Search, Phone, Mail, MapPin, Edit2, Trash2, X, History, Wrench, Package, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Customer, Vehicle, ServiceRecord } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCustomerForTransactions, setSelectedCustomerForTransactions] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

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
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
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

  const getVehicleInfo = (vehicleId: string) => {
    const v = vehicles.find(veh => veh.id === vehicleId);
    return v ? `${v.make} ${v.model} (${v.plateNumber})` : 'Unknown Vehicle';
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
          className="flex items-center justify-center gap-2 bg-workshop-accent text-workshop-bg px-5 py-2.5 rounded shadow-lg shadow-workshop-accent/10 font-bold uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all active:scale-95"
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredCustomers.map((customer) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-workshop-card p-6 rounded-xl border border-workshop-border shadow-sm hover:border-workshop-accent/30 transition-all group relative"
            >
              <div className="flex items-start justify-between mb-4">
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
                    className="p-3 text-workshop-muted hover:text-rose-500 hover:bg-workshop-surface rounded-lg transition-all"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-workshop-text mb-4 uppercase tracking-tight">{customer.name}</h3>
              <div className="space-y-3 text-xs text-workshop-muted">
                <div className="flex items-center gap-3">
                  <Phone className="w-3.5 h-3.5 text-workshop-secondary" />
                  <span className="font-medium text-workshop-text">{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-3.5 h-3.5 text-workshop-secondary" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                   <MapPin className="w-3.5 h-3.5 text-workshop-secondary" />
                   <span className="truncate">{customer.address || 'No address provided'}</span>
                </div>
              </div>
                <div className="mt-6 pt-4 border-t border-workshop-border flex justify-end relative z-10">
                  <button 
                    onClick={() => setSelectedCustomerForTransactions(customer)}
                    className="text-[10px] font-bold uppercase tracking-widest text-workshop-accent hover:text-emerald-400 p-2"
                  >
                    View History
                  </button>
                </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {loading && filteredCustomers.length === 0 && (
        <div className="text-center py-20 text-workshop-muted text-sm">
          Fetching customer records...
        </div>
      )}

      {/* Add Modal */}
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
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                    placeholder="+91 00000 00000"
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Email Address</label>
                    <input 
                      type="email" 
                      value={newCustomer.email}
                      onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                      placeholder="client@domain.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Postal Address</label>
                    <textarea 
                      value={newCustomer.address}
                      onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none h-20 resize-none text-workshop-text"
                      placeholder="Enter street and city details..."
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
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingCustomer && (
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
                    value={editingCustomer.phone}
                    onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                    className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                  />
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Email Address</label>
                    <input 
                      type="email" 
                      value={editingCustomer.email || ''}
                      onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Postal Address</label>
                    <textarea 
                      value={editingCustomer.address || ''}
                      onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none h-20 resize-none text-workshop-text"
                    />
                  </div>
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
                    className="flex-1 px-4 py-2.5 bg-workshop-accent text-workshop-bg rounded-xl text-sm font-black uppercase tracking-widest shadow-sm hover:bg-emerald-500 transition-all"
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
        {showDeleteConfirm && customerToDelete && (
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
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 hover:bg-rose-700 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Transactions Modal */}
      <AnimatePresence>
        {selectedCustomerForTransactions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomerForTransactions(null)}
              className="absolute inset-0 bg-workshop-bg/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-workshop-card w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-workshop-border"
            >
              <div className="bg-workshop-surface p-8 text-workshop-text relative border-b border-workshop-border">
                <button 
                  onClick={() => setSelectedCustomerForTransactions(null)}
                  className="absolute top-6 right-6 p-2 hover:bg-workshop-accent/10 rounded-full transition-colors text-workshop-muted hover:text-workshop-accent"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-workshop-accent/10 rounded-xl flex items-center justify-center border border-workshop-accent/20">
                    <History className="w-6 h-6 text-workshop-accent" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight uppercase">Billing History</h2>
                    <p className="text-workshop-muted text-[10px] font-bold uppercase tracking-widest">
                      Client: {selectedCustomerForTransactions.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {serviceRecords.filter(r => r.customerId === selectedCustomerForTransactions.id).length > 0 ? (
                  <div className="space-y-4">
                    {serviceRecords
                      .filter(r => r.customerId === selectedCustomerForTransactions.id)
                      .map((record) => (
                        <div key={record.id} className="bg-workshop-surface rounded-xl border border-workshop-border p-6 shadow-sm hover:border-workshop-accent/20 transition-all">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-workshop-bg rounded-xl border border-workshop-border flex flex-col items-center justify-center">
                                <span className="text-[8px] font-bold text-workshop-muted uppercase">{format(new Date(record.date), 'MMM')}</span>
                                <span className="text-sm font-black text-workshop-text">{format(new Date(record.date), 'dd')}</span>
                              </div>
                              <div>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest mb-1 inline-block border",
                                  record.status === 'completed' ? "bg-workshop-accent/10 text-workshop-accent border-workshop-accent/20" :
                                  record.status === 'in-progress' ? "bg-workshop-secondary/10 text-workshop-secondary border-workshop-secondary/20" :
                                  "bg-workshop-warning/10 text-workshop-warning border-workshop-warning/20"
                                )}>
                                  {record.status}
                                </span>
                                <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-wider">{getVehicleInfo(record.vehicleId)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-bold text-workshop-muted uppercase tracking-widest">Amount Paid</p>
                              <p className="text-lg font-black text-workshop-text tracking-tighter">{formatCurrency(record.totalCost)}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="p-3 bg-workshop-bg rounded-xl border border-workshop-border">
                              <p className="text-xs text-workshop-muted font-medium">"{record.description}"</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center gap-2 text-workshop-muted">
                                <Wrench className="w-3.5 h-3.5 text-workshop-accent" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{record.mileage.toLocaleString()} KM</span>
                              </div>
                              <div className="flex items-center gap-2 text-workshop-muted justify-end">
                                <Package className="w-3.5 h-3.5 text-workshop-secondary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{record.partsUsed.length} Items Used</span>
                              </div>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 px-8">
                    <div className="w-20 h-20 bg-workshop-surface rounded-xl flex items-center justify-center mx-auto mb-6 text-workshop-muted border border-workshop-border">
                      <ShieldCheck className="w-10 h-10 opacity-20" />
                    </div>
                    <h3 className="text-workshop-text font-bold uppercase tracking-tight">No Transactions</h3>
                    <p className="text-workshop-muted text-sm mt-2 max-w-xs mx-auto">This customer has no recorded service transactions in the system.</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-workshop-surface border-t border-workshop-border flex justify-end">
                 <button 
                  onClick={() => setSelectedCustomerForTransactions(null)}
                  className="px-6 py-2 bg-workshop-accent text-workshop-bg text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-all"
                 >
                   Back
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
