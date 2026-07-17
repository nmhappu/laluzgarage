import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, auth } from '../lib/firebase';
import { Search, Phone, MessageSquare, Edit2, Trash2, X, History, Wrench, Package, ShieldCheck, Car, Key, PlusCircle, Check, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Customer, Vehicle, ServiceRecord } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { Portal } from './Portal';
import { WhatsAppPopup } from './WhatsAppPopup';

const capitalizeName = (name?: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function VehicleHistory() {
  // --- State: Data ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // --- State: UI Control ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedVehicleForLedger, setSelectedVehicleForLedger] = useState<Vehicle | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearchInput, setLocalSearchInput] = useState(() => searchParams.get('q') || '');
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');

  // Debounce search input to avoid lag
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(localSearchInput);
      setSearchParams(prev => {
        if (!localSearchInput) {
          prev.delete('q');
        } else {
          prev.set('q', localSearchInput);
        }
        return prev;
      }, { replace: true });
    }, 250);

    return () => clearTimeout(handler);
  }, [localSearchInput, setSearchParams]);
  const [whatsAppRedirect, setWhatsAppRedirect] = useState<{ name: string; phone: string; url: string } | null>(null);

  // --- State: Active Models for Add/Edit ---
  const [newVehicle, setNewVehicle] = useState({
    make: '',
    model: '',
    color: '',
    plateNumber: '',
    passwordOrPin: '',
    customerId: '',
    // New owner fields if registering together
    createNewOwner: false,
    ownerName: '',
    ownerPhone: ''
  });
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [useKey, setUseKey] = useState(false);

  // --- Effects: Handlers ---
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    let scrollContainer: Element | null = null;
    
    const handleScroll = () => {
      if (scrollContainer) {
        setScrollTop(scrollContainer.scrollTop);
      }
    };

    const bindScroll = () => {
      scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        setScrollTop(scrollContainer.scrollTop);
        return true;
      }
      return false;
    };

    if (!bindScroll()) {
      const interval = setInterval(() => {
        if (bindScroll()) {
          clearInterval(interval);
        }
      }, 100);
      return () => {
        clearInterval(interval);
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', handleScroll);
        }
      };
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    fetchData();
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
      } else if (selectedVehicleForLedger) {
        setSelectedVehicleForLedger(null);
        e.preventDefault();
      }
    };

    window.addEventListener("appBackButton", handleBackButton);
    return () => window.removeEventListener("appBackButton", handleBackButton);
  }, [showEditModal, showAddModal, showDeleteConfirm, selectedVehicleForLedger]);

  /**
   * Fetches all vehicles, customers, and service record history.
   */
  const fetchData = async () => {
    setLoading(true);
    try {
      const vehicleSnap = await getDocs(query(collection(db, 'vehicles'), orderBy('createdAt', 'desc')));
      const customerSnap = await getDocs(collection(db, 'customers'));
      const serviceSnap = await getDocs(query(collection(db, 'serviceRecords'), orderBy('date', 'desc')));

      setVehicles(vehicleSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
      setCustomers(customerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      setServiceRecords(serviceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFieldToggle = (mode: boolean) => {
    setUseKey(mode);
    setNewVehicle(prev => ({
      ...prev,
      passwordOrPin: mode ? 'Key' : ''
    }));
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.make || !newVehicle.model || !newVehicle.plateNumber) return;

    try {
      let finalCustomerId = newVehicle.customerId;

      // 1. Create a customer if registering a new owner along the way
      if (newVehicle.createNewOwner) {
        if (!newVehicle.ownerName || !newVehicle.ownerPhone) return;
        const formattedPhone = newVehicle.ownerPhone.trim().startsWith('+91')
          ? newVehicle.ownerPhone.trim()
          : `+91 ${newVehicle.ownerPhone.trim()}`;
        const customerRef = await addDoc(collection(db, 'customers'), {
          name: newVehicle.ownerName,
          phone: formattedPhone,
          technicianId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        finalCustomerId = customerRef.id;
      }

      if (!finalCustomerId) return;

      const owner = newVehicle.createNewOwner
        ? {
            name: newVehicle.ownerName || '',
            phone: newVehicle.ownerPhone.trim().startsWith('+91')
              ? newVehicle.ownerPhone.trim()
              : `+91 ${newVehicle.ownerPhone.trim()}`
          }
        : customers.find(c => c.id === finalCustomerId);

      // 2. Add the vehicle itself
      await addDoc(collection(db, 'vehicles'), {
        make: newVehicle.make,
        model: newVehicle.model,
        color: newVehicle.color,
        plateNumber: newVehicle.plateNumber.toUpperCase(),
        passwordOrPin: useKey ? 'Key' : newVehicle.passwordOrPin,
        customerId: finalCustomerId,
        technicianId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Automated WhatsApp dispatch upon successful vehicle submission
      if (owner && owner.phone) {
        const cleanPhone = owner.phone.replace(/[^0-9]/g, "");
        const greeting = `Hello ${owner.name ? capitalizeName(owner.name) : 'Customer'},\n\nWe have successfully registered your vehicle *${newVehicle.make} ${newVehicle.model}* [${newVehicle.plateNumber.toUpperCase() || 'No Plate'}] in our system.\n\n`;
        const signOff = `If you have any questions or would like to request general maintenance, please let us know. Thank you!`;
        const fullText = `${greeting}${signOff}`;
        const waUrl = `https://wa.me/${cleanPhone}/?text=${encodeURIComponent(fullText)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }

      setShowAddModal(false);
      setNewVehicle({
        make: '',
        model: '',
        color: '',
        plateNumber: '',
        passwordOrPin: '',
        customerId: '',
        createNewOwner: false,
        ownerName: '',
        ownerPhone: ''
      });
      setUseKey(false);
      fetchData();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'create', 'vehicles');
    }
  };

  const handleEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle || !editingVehicle.make || !editingVehicle.model || !editingVehicle.plateNumber || !editingVehicle.customerId) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, technicianId, createdAt, updatedAt: _oldUpdatedAt, ...data } = editingVehicle;
      await updateDoc(doc(db, 'vehicles', id), {
        ...data,
        plateNumber: data.plateNumber.toUpperCase(),
        updatedAt: serverTimestamp()
      });
      setShowEditModal(false);
      setEditingVehicle(null);
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

  // --- Derived vehicle metadata matching search terms ---
  const mappedVehicles = useMemo(() => {
    return vehicles.map(v => {
      const owner = customers.find(c => c.id === v.customerId);
      const vehicleServices = serviceRecords.filter(r => r.vehicleId === v.id);
      const cumulativeSpent = vehicleServices.reduce((sum, r) => sum + (r.totalCost || 0), 0);
      const latestService = vehicleServices.length > 0 ? vehicleServices[0] : null;

      return {
        ...v,
        ownerName: capitalizeName(owner?.name) || 'Unknown Owner',
        ownerPhone: owner?.phone || '',
        servicesCount: vehicleServices.length,
        cumulativeSpent,
        latestServiceDate: latestService ? latestService.date : null
      };
    });
  }, [vehicles, customers, serviceRecords]);

  // Filter vehicles by search term (Make, Model, Plate, Owner name, Phone number)
  const filteredVehicles = useMemo(() => {
    if (!searchTerm.trim()) return mappedVehicles;
    const query = searchTerm.toLowerCase();
    return mappedVehicles.filter(v =>
      v.make.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query) ||
      v.plateNumber.toLowerCase().includes(query) ||
      v.ownerName.toLowerCase().includes(query) ||
      v.ownerPhone.includes(query)
    );
  }, [mappedVehicles, searchTerm]);

  return (
    <div className="space-y-6 pb-24 md:pb-0 font-sans">
      <header 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity duration-75"
        style={{ opacity: Math.max(0, 1 - scrollTop / 60) }}
      >
        <div>
          <h1 className="text-2xl font-bold text-workshop-text tracking-tight uppercase font-sans">Vehicle Registry</h1>
          <p className="text-workshop-muted text-sm font-medium font-sans">Manage workshop vehicles.</p>
        </div>
      </header>

      {/* Database Search Filter */}
      <div className="relative flex items-center col-span-1 borderless">
        <Search className="absolute left-4 text-workshop-muted w-4 h-4 font-bold" />
        <input 
          type="text" 
          placeholder="Search by registration plate, manufacturer, model, or owner..."
          value={localSearchInput}
          onChange={(e) => setLocalSearchInput(e.target.value)}
          className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] text-sm text-workshop-text font-sans font-medium"
        />
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeletons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="space-y-4 accelerate-gpu will-change-transform-opacity"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="skeleton-card-m3 p-5 min-h-[140px] flex flex-col sm:flex-row sm:items-center justify-between gap-6"
              >
                {/* Left section: Icon and Titles */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 skeleton-element-m3 shrink-0" />
                  <div className="space-y-2.5">
                    <div className="h-4 w-36 sm:w-48 skeleton-element-m3" />
                    <div className="h-3 w-20 sm:w-28 skeleton-element-m3" />
                  </div>
                </div>

                {/* Middle section: Owner, PIN, and Jobs Done info placeholders */}
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2.5 flex-1 max-w-md sm:justify-center">
                  <div className="space-y-2 min-w-[100px]">
                    <div className="h-2 w-10 skeleton-element-m3" />
                    <div className="h-3.5 w-20 skeleton-element-m3" />
                    <div className="h-2 w-14 skeleton-element-m3" />
                  </div>
                  <div className="space-y-2 min-w-[100px]">
                    <div className="h-2 w-12 skeleton-element-m3" />
                    <div className="h-3.5 w-24 skeleton-element-m3" />
                  </div>
                  <div className="space-y-2 min-w-[100px]">
                    <div className="h-2 w-14 skeleton-element-m3" />
                    <div className="h-3.5 w-16 skeleton-element-m3" />
                  </div>
                </div>

                {/* Right section: Action button placeholders */}
                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  <div className="w-8 h-8 skeleton-element-m3 rounded-lg" />
                  <div className="w-8 h-8 skeleton-element-m3 rounded-lg" />
                  <div className="h-10 w-28 skeleton-element-m3" style={{ borderRadius: '0.75rem' }} />
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="vehicle-list"
            initial="enter"
            animate="center"
            exit="exit"
            variants={{
              enter: { opacity: 0 },
              center: { opacity: 1, transition: { staggerChildren: 0.03 } },
              exit: { opacity: 0 }
            }}
            className="space-y-4 font-sans accelerate-gpu will-change-transform-opacity"
          >
            {filteredVehicles.map((vehicle) => (
              <motion.div
                key={vehicle.id}
                variants={{
                  enter: { opacity: 0, y: 16 },
                  center: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: -8 }
                }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="bg-workshop-surface/25 hover:bg-workshop-surface/50 p-5 rounded-xl transition-all group relative flex flex-col justify-between gap-5 overflow-hidden bg-clip-padding font-sans cursor-pointer border border-transparent hover:border-[#3B82F6]/30 hover:shadow-lg hover:shadow-[#3B82F6]/10 active:scale-[0.995] accelerate-gpu will-change-transform-opacity"
                onClick={() => setSelectedVehicleForLedger(vehicle)}
              >
                {/* Row 1: Vehicle Identity with Plate opposite */}
                <div className="flex items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center text-[#3B82F6] shrink-0 border-0">
                      <Car className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-workshop-text text-lg sm:text-2xl uppercase tracking-tight group-hover:text-[#3B82F6] transition-colors leading-tight font-sans truncate">
                      {vehicle.make} {vehicle.model}
                    </h3>
                  </div>
                  {vehicle.plateNumber && (
                    <span 
                      style={{ fontFamily: "'Google Sans', sans-serif" }}
                      className="text-base sm:text-lg text-[#3B82F6] font-black uppercase tracking-wider shrink-0 text-right"
                    >
                      {vehicle.plateNumber}
                    </span>
                  )}
                </div>

                {/* Row 2: Owner Relationship and Security */}
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs font-sans bg-workshop-surface/10 p-4 rounded-xl border border-workshop-border/10 w-full animate-fade-in">
                  {/* Item 1: Owner */}
                  <div className="flex flex-col items-start">
                    <p className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-widest leading-none mb-1.5 font-sans">Owner</p>
                    <p className="font-black text-workshop-text truncate max-w-[140px] font-sans uppercase">{capitalizeName(vehicle.ownerName)}</p>
                  </div>

                  {/* Item 2: Services Done */}
                  <div className="flex flex-col items-start">
                    <p className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-widest leading-none mb-1.5 font-sans">Services Done</p>
                    <div className="flex items-center gap-1 text-[#3B82F6] font-sans">
                      <History className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wider font-sans">
                        {vehicle.servicesCount} {vehicle.servicesCount === 1 ? 'Service' : 'Services'}
                      </span>
                    </div>
                  </div>

                  {/* Item 3: Security - Key or Pin in Google Sans font-sans */}
                  <div className="flex flex-col items-start justify-center">
                    <div className="flex items-center gap-1 text-workshop-text font-extrabold uppercase font-sans mt-3.5">
                      {vehicle.passwordOrPin === 'Key' ? (
                        <>
                          <Key className="w-3.5 h-3.5 text-status-success shrink-0" />
                          <span className="text-xs font-sans font-black text-workshop-text uppercase tracking-wider">Key</span>
                        </>
                      ) : vehicle.passwordOrPin ? (
                        <>
                          <Key className="w-3.5 h-3.5 text-status-success shrink-0" />
                          <span className="text-xs font-sans font-black tracking-widest text-white">#{vehicle.passwordOrPin}</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-3.5 h-3.5 text-workshop-muted/30 shrink-0" />
                          <span className="text-xs text-workshop-muted/60 font-sans font-black tracking-wider uppercase leading-none">No Security</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                 {/* Row 3: Call Option on bottom-left, Actions on bottom-right */}
                <div className="flex items-center justify-between w-full relative z-20 font-sans">
                  {/* Left: Call & WhatsApp option buttons */}
                  <div className="flex-1 flex flex-wrap items-center gap-2 text-left">
                    {vehicle.ownerPhone ? (
                      <>
                        <a 
                          href={`tel:${vehicle.ownerPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 bg-status-success/15 hover:bg-status-success/25 text-status-success px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm shadow-status-success/10 active:scale-95"
                          title={`Call ${capitalizeName(vehicle.ownerName)}`}
                        >
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>Call</span>
                        </a>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (vehicle.ownerPhone) {
                              const cleanPhone = vehicle.ownerPhone.replace(/[^0-9]/g, "");
                              setWhatsAppRedirect({
                                name: vehicle.ownerName ? capitalizeName(vehicle.ownerName) : 'Customer',
                                phone: vehicle.ownerPhone,
                                url: `https://wa.me/${cleanPhone}`
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1.5 bg-[#128C7E]/15 hover:bg-[#128C7E]/25 text-[#128C7E] px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm shadow-[#128C7E]/10 active:scale-95 border-0 outline-none"
                          title={`Send WhatsApp Message to ${capitalizeName(vehicle.ownerName)}`}
                        >
                          <MessageSquare className="w-3 h-3 shrink-0 fill-[#128C7E]/10" />
                          <span>WhatsApp</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-workshop-muted/40 uppercase tracking-widest font-black font-sans">No Phone Number</span>
                    )}
                  </div>

                  {/* Right: yellow edit, red delete */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingVehicle(vehicle);
                        setShowEditModal(true);
                      }}
                      className="p-2 text-yellow-500 hover:text-yellow-400 hover:scale-110 active:scale-90 transition-all font-sans"
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
                      className="p-2 text-status-urgent hover:text-red-400 hover:scale-110 active:scale-90 transition-all font-sans"
                      title="Delete Vehicle Schema"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && filteredVehicles.length === 0 && (
        <div className="text-center py-20 bg-workshop-card/30 border border-workshop-border border-dashed rounded-xl max-w-xl mx-auto p-10 mt-12">
          <Car className="w-12 h-12 text-workshop-muted mx-auto opacity-20 mb-4" />
          <h3 className="text-workshop-text font-black uppercase tracking-tight mb-1">No Vehicles Registered</h3>
          <p className="text-workshop-muted text-sm max-w-xs mx-auto leading-relaxed">No vehicle files found matching your search term. Register a vehicle to initiate tracking.</p>
        </div>
      )}

      {/* Add Vehicle Modal */}
      <AnimatePresence>
        {showAddModal && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                onClick={() => {
                  setShowAddModal(false);
                  setUseKey(false);
                }}
                className="absolute inset-0 bg-workshop-bg/85"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ willChange: "transform, opacity" }}
                className="relative bg-workshop-card w-full max-w-lg rounded-xl p-6 md:p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[92vh] no-scrollbar"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2.5">
                    <Car className="w-5 h-5 text-workshop-accent shrink-0" />
                    <h2 className="text-xl font-bold text-workshop-text uppercase tracking-tight">Register Vehicle File</h2>
                  </div>
                  <button 
                    onClick={() => {
                      setShowAddModal(false);
                      setUseKey(false);
                    }} 
                    className="text-workshop-muted hover:text-workshop-text transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddVehicle} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Manufacturer</label>
                      <input 
                        required
                        type="text" 
                        value={newVehicle.make}
                        onChange={e => setNewVehicle({...newVehicle, make: e.target.value})}
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text font-bold"
                        placeholder="e.g. Ford, Toyota"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted flex items-center gap-1">Model <span className="text-status-urgent">*</span></label>
                      <input 
                        required
                        type="text" 
                        value={newVehicle.model}
                        onChange={e => setNewVehicle({...newVehicle, model: e.target.value})}
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text font-bold"
                        placeholder="e.g. Mustang, Prius"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Plate Registration</label>
                      <input 
                        required
                        type="text" 
                        value={newVehicle.plateNumber}
                        onChange={e => setNewVehicle({...newVehicle, plateNumber: e.target.value.toUpperCase()})}
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm font-mono font-black text-workshop-accent focus:ring-1 focus:ring-workshop-accent outline-none tracking-widest uppercase"
                        placeholder="MH12AB1234"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Colour</label>
                      <input 
                        type="text" 
                        value={newVehicle.color}
                        onChange={e => setNewVehicle({...newVehicle, color: e.target.value})}
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text font-bold"
                        placeholder="e.g. Midnight Black"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted flex items-center gap-1.5">
                      Security Password or Access PIN
                      <span className="text-status-urgent">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        disabled={useKey}
                        type="text" 
                        inputMode="numeric"
                        maxLength={6}
                        value={useKey ? "Key" : newVehicle.passwordOrPin}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (useKey) return;
                          if (val === "" || (/^\d+$/.test(val) && val.length <= 6)) {
                            setNewVehicle({ ...newVehicle, passwordOrPin: val });
                          }
                        }}
                        className={cn(
                          "w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm font-mono focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text transition-all",
                          useKey && "opacity-50 font-bold"
                        )}
                        placeholder="Enter 4-6 digit numeric PIN..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const toKey = !useKey;
                          handleAddFieldToggle(toKey);
                        }}
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all",
                          useKey 
                            ? "bg-workshop-accent text-workshop-bg shadow-lg" 
                            : "bg-workshop-surface text-workshop-muted"
                        )}
                        title="Require physical physical key"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Registered Owner Selection */}
                  <div className="border-t border-workshop-border/30 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-workshop-text">
                        Vehicle Owner Association
                      </h3>
                      <button 
                        type="button"
                        onClick={() => setNewVehicle(prev => ({ ...prev, createNewOwner: !prev.createNewOwner }))}
                        className={cn(
                          "flex items-center gap-1 text-[10px] uppercase font-black tracking-widest transition-colors",
                          newVehicle.createNewOwner ? "text-workshop-accent" : "text-workshop-muted hover:text-workshop-text"
                        )}
                      >
                        {newVehicle.createNewOwner ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Selected Existing
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3.5 h-3.5" /> Plus Register New Client
                          </>
                        )}
                      </button>
                    </div>

                    {!newVehicle.createNewOwner ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Select Client From Directory</label>
                        <select
                          required={!newVehicle.createNewOwner}
                          value={newVehicle.customerId}
                          onChange={e => setNewVehicle({ ...newVehicle, customerId: e.target.value })}
                          className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm outline-none text-workshop-text font-bold focus:ring-1 focus:ring-workshop-accent"
                        >
                          <option value="">-- Choose Client File --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>
                              {capitalizeName(c.name)} ({c.phone})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 bg-workshop-surface/20 border border-workshop-border/40 p-4 rounded-xl space-y-0">
                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">Full Name</label>
                          <input 
                            required={newVehicle.createNewOwner}
                            type="text" 
                            value={newVehicle.ownerName}
                            onChange={e => setNewVehicle({...newVehicle, ownerName: e.target.value})}
                            className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-workshop-accent outline-none text-workshop-text font-bold"
                            placeholder="e.g. David Miller"
                          />
                        </div>
                        <div className="relative pt-2 py-0.5 col-span-2 md:col-span-1">
                          <div className="flex items-center w-full bg-workshop-surface border-2 border-[#3B82F6] rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#3B82F6]/30 transition-all">
                            {/* Floating notched label */}
                            <span className="absolute left-4 top-0 bg-workshop-card px-2 text-[10px] font-black uppercase tracking-wider text-[#3B82F6] select-none">
                              Phone number
                            </span>
                            
                            {/* Prefix */}
                            <span className="text-workshop-text font-mono font-bold text-sm select-none pr-3 shrink-0">
                              +91
                            </span>
                            
                            {/* Separator / Divider Line */}
                            <div className="h-5 w-px bg-workshop-border/40 mr-3 shrink-0" />
                            
                            {/* Actual Input */}
                            <input 
                              required={newVehicle.createNewOwner}
                              type="tel" 
                              inputMode="tel"
                              value={newVehicle.ownerPhone}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (val.startsWith("+91")) {
                                  val = val.substring(3);
                                } else if (val.startsWith("91") && val.length > 10) {
                                  val = val.substring(2);
                                }
                                setNewVehicle({...newVehicle, ownerPhone: val});
                              }}
                              className="w-full bg-transparent border-none p-0 outline-none focus:ring-0 text-workshop-text font-mono font-bold text-sm tracking-wide placeholder-workshop-muted/40"
                              placeholder="85471 87345"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-workshop-border/30">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAddModal(false);
                        setUseKey(false);
                      }}
                      className="flex-1 px-4 py-2.5 border border-workshop-border rounded-xl text-sm font-bold text-workshop-muted hover:bg-workshop-surface hover:text-workshop-text transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 px-4 py-2.5 bg-workshop-accent text-workshop-bg rounded-xl text-sm font-black uppercase tracking-widest shadow-sm hover:brightness-110 active:scale-95 transition-all"
                    >
                      Save Vehicle
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Edit Vehicle Modal */}
      <AnimatePresence>
        {showEditModal && editingVehicle && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                onClick={() => setShowEditModal(false)}
                className="absolute inset-0 bg-workshop-bg/95"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ willChange: "transform, opacity" }}
                className="relative bg-workshop-surface w-full max-w-lg rounded-xl p-8 shadow-2xl border border-workshop-border/40 font-sans"
              >
                <div className="flex justify-between items-center mb-6 font-sans">
                  <div className="flex items-center gap-2.5 text-workshop-text font-bold">
                    <Edit2 className="w-5 h-5 text-[#3B82F6] shrink-0" />
                    <h2 className="text-lg font-black uppercase tracking-tight font-sans">Edit Vehicle Details</h2>
                  </div>
                  <button onClick={() => setShowEditModal(false)} className="text-workshop-muted hover:text-workshop-text transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleEditVehicle} className="space-y-6 font-sans">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">Manufacturer</label>
                      <input 
                        required
                        type="text" 
                        value={editingVehicle.make}
                        onChange={e => setEditingVehicle({...editingVehicle, make: e.target.value})}
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none text-workshop-text font-bold transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">Model</label>
                      <input 
                        required
                        type="text" 
                        value={editingVehicle.model}
                        onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})}
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none text-workshop-text font-bold transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 font-sans">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">Plate Registration</label>
                      <input 
                        required
                        type="text" 
                        value={editingVehicle.plateNumber}
                        onChange={e => setEditingVehicle({...editingVehicle, plateNumber: e.target.value.toUpperCase()})}
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm font-mono font-black text-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none uppercase tracking-widest transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1">Colour</label>
                      <input 
                        type="text" 
                        value={editingVehicle.color || ''}
                        onChange={e => setEditingVehicle({...editingVehicle, color: e.target.value})}
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none text-workshop-text font-bold transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1 flex items-center justify-between">
                      <span>Access Security Pin / PIN</span>
                      <button 
                        type="button" 
                        onClick={() => setEditingVehicle({
                          ...editingVehicle,
                          passwordOrPin: editingVehicle.passwordOrPin === "Key" ? "" : "Key"
                        })}
                        className="text-[9px] font-black uppercase text-[#3B82F6] border-b border-[#3B82F6]/20 hover:opacity-85 transition-all"
                      >
                        {editingVehicle.passwordOrPin === "Key" ? "Use Code Pin" : "Set Physical Key"}
                      </button>
                    </label>
                    <input 
                      type="text" 
                      value={editingVehicle.passwordOrPin || ''}
                      maxLength={6}
                      onChange={e => {
                        const val = e.target.value;
                        if (editingVehicle.passwordOrPin === 'Key') return;
                        setEditingVehicle({...editingVehicle, passwordOrPin: val});
                      }}
                      disabled={editingVehicle.passwordOrPin === 'Key'}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm font-mono focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none text-workshop-text font-bold transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] px-1 font-bold">Assigned Owner File</label>
                    <select
                      value={editingVehicle.customerId}
                      onChange={e => setEditingVehicle({ ...editingVehicle, customerId: e.target.value })}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl text-sm outline-none text-workshop-text font-bold focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-all shadow-sm"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {capitalizeName(c.name)} ({c.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-4 pt-4 px-1">
                    <button 
                      type="button" 
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface transition-all active:scale-[0.98]"
                    >
                      Discard
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 px-4 py-3 bg-[#3B82F6] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#3B82F6]/25 hover:brightness-110 transition-all active:scale-[0.98]"
                    >
                      Update Database
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
        {showDeleteConfirm && vehicleToDelete && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute inset-0 bg-workshop-bg/95"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ willChange: "transform, opacity" }}
                className="relative bg-workshop-surface w-full max-w-sm rounded-xl p-8 shadow-2xl border border-workshop-border/40 text-center font-sans"
              >
                <div className="w-16 h-16 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-status-urgent border border-status-urgent/20">
                  <Trash2 className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-black text-workshop-text mb-2 tracking-tight uppercase font-sans">Delete Vehicle?</h2>
                <p className="text-workshop-muted text-sm mb-5 leading-relaxed font-sans">
                  Are you sure you want to delete this vehicle?
                </p>
                
                {/* Visually appealing vehicle profile card */}
                <div className="bg-workshop-surface/40 p-4 rounded-xl mb-6 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center text-[#3B82F6]">
                    <Car className="w-5 h-5" />
                  </div>
                  <div className="font-sans">
                    <h4 className="font-black text-workshop-text text-base uppercase tracking-tight">
                      {vehicleToDelete.make} {vehicleToDelete.model}
                    </h4>
                    {vehicleToDelete.plateNumber && (
                      <span className="block mt-1 text-sm text-[#3B82F6] font-black uppercase tracking-widest font-sans">
                        {vehicleToDelete.plateNumber}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-grow px-4 py-3 border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteVehicle}
                    className="flex-grow px-4 py-3 bg-status-urgent text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-status-urgent/25 hover:brightness-110 transition-all active:scale-[0.98]"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Vehicle Service Ledger / History Grid Modal */}
      <AnimatePresence>
        {selectedVehicleForLedger && (
          <Portal>
            <motion.div
              initial={{ x: "100%", opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed inset-0 z-[100] bg-workshop-bg flex flex-col h-screen w-full overflow-hidden font-sans text-workshop-text"
            >
              {/* Header of the Ledger (Top Bar) */}
              <div className="flex justify-between items-center pl-2 pr-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 bg-workshop-bg shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setSelectedVehicleForLedger(null)}
                  className="flex items-center justify-center p-2 rounded-2xl text-workshop-muted hover:text-workshop-text transition-all duration-200 outline-none active:scale-95 group"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-[#3B82F6]" />
                </button>

                <div className="flex-grow pl-2">
                  <h2 
                    style={{ fontFamily: "'Google Sans', 'Inter', sans-serif" }}
                    className="text-lg sm:text-2xl font-black text-[#10B981] tracking-tight uppercase leading-none"
                  >
                    {selectedVehicleForLedger.make} {selectedVehicleForLedger.model}
                  </h2>
                </div>

                <div className="flex flex-col items-end select-none text-right">
                  <span 
                    style={{ fontFamily: "'Google Sans', 'Inter', sans-serif" }}
                    className="text-lg sm:text-2xl font-black text-[#3B82F6] uppercase tracking-tight leading-none"
                  >
                    {selectedVehicleForLedger.plateNumber}
                  </span>
                </div>
              </div>

              {/* Ledger Summary Dashboard Strip */}
              <div className="bg-workshop-surface/40 px-6 py-5 border-b border-workshop-border/20 shrink-0">
                <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-6">
                  <div>
                    <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest mb-1 leading-none">Total Maintenance Value</p>
                    <p className="text-2xl font-black text-[#3B82F6] tracking-tighter leading-none">
                      {formatCurrency(
                        serviceRecords
                          .filter(r => r.vehicleId === selectedVehicleForLedger.id)
                          .reduce((sum, r) => sum + (r.totalCost || 0), 0)
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest mb-1 leading-none font-sans">Recorded Jobs</p>
                    <p className="text-2xl font-black text-workshop-text tracking-tighter leading-none font-sans">
                      {serviceRecords.filter(r => r.vehicleId === selectedVehicleForLedger.id).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service list Container -- CARDLESS, FLAT, STREAMLINED */}
              <div className="flex-1 overflow-y-auto px-6 py-8 bg-workshop-bg scrollbar-thin">
                <div className="max-w-4xl mx-auto w-full space-y-10">
                  {serviceRecords.filter(r => r.vehicleId === selectedVehicleForLedger.id).length > 0 ? (
                    <div className="space-y-8">
                      {serviceRecords
                        .filter(r => r.vehicleId === selectedVehicleForLedger.id)
                        .map((record, index) => (
                          <div key={record.id} className="space-y-8">
                            {index > 0 && (
                              <div className="h-px bg-workshop-border/40 w-full" />
                            )}
                            <motion.div 
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.04 }}
                              className="space-y-6"
                            >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-3">
                                  <span className="text-base font-black text-[#3B82F6] uppercase tracking-widest leading-none">
                                    {format(new Date(record.date), 'dd MMM yyyy')}
                                  </span>
                                  <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    record.status === 'completed' ? "text-status-success" :
                                    record.status === 'in-progress' ? "text-status-pending" :
                                    record.status === 'pending' ? "text-status-urgent" :
                                    "text-workshop-muted"
                                  )}>
                                    {record.status}
                                  </span>
                                </div>

                                <div>
                                  <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest leading-none font-sans">
                                    Owned By <span className="text-workshop-text font-black uppercase">{capitalizeName(customers.find(c => c.id === record.customerId)?.name) || "Unknown Owner"}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col items-start sm:items-end shrink-0 select-none">
                                <p className="text-[8px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-1">Invoiced Amount</p>
                                <p className="text-xl sm:text-2xl font-black text-[#3B82F6] tracking-tight leading-none font-sans">{formatCurrency(record.totalCost)}</p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              {/* Maintenance Description without box frames, clean border bar */}
                              <div className="pl-4 border-l-2 border-[#3B82F6]/30 py-1">
                                <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest mb-2 font-sans">COMPLAINT / REPAIR NOTES</p>
                                <div className="text-workshop-text/90 text-xs font-medium leading-relaxed space-y-1.5 font-sans">
                                  {record.description.split("\n").map((line, i) => {
                                    const cleanLine = line.replace(/^\[[x ]\]\s*/, "");
                                    return cleanLine ? (
                                      <div key={i} className="flex items-start gap-2">
                                        <span className="text-[#3B82F6] mt-0.5">•</span>
                                        <span>{cleanLine}</span>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              </div>

                              {record.personalItems && (
                                <div className="p-3 bg-status-success/5 rounded-xl border border-status-success/10 flex items-center gap-3">
                                  <Package className="w-5 h-5 text-status-success shrink-0" />
                                  <div className="flex items-center gap-2 flex-1 min-w-0 font-sans">
                                    <span className="text-[10px] font-black text-status-success uppercase tracking-widest leading-none shrink-0 font-sans">Personal Items:</span>
                                    <p className="text-xs text-workshop-text/90 font-bold leading-relaxed whitespace-pre-line truncate font-sans">
                                      {record.personalItems}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Split Metrics with subtle borders */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                                <div className="border border-workshop-border/30 bg-workshop-surface/25 p-3 rounded-xl flex flex-col justify-between">
                                  <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-sans">Mileage Recorded</span>
                                  <div className="flex items-center gap-1.5">
                                    <Wrench className="w-3.5 h-3.5 text-[#3B82F6]" />
                                    <span className="text-xs font-black text-workshop-text leading-none font-sans">{record.mileage.toLocaleString()} KM</span>
                                  </div>
                                </div>
                                <div className="border border-workshop-border/30 bg-workshop-surface/25 p-3 rounded-xl flex flex-col justify-between">
                                  <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-sans">Inventory Consumed</span>
                                  <div className="flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 text-[#3B82F6]" />
                                    <span className="text-xs font-black text-workshop-text leading-none font-sans">{record.partsUsed.length} SKU items</span>
                                  </div>
                                </div>
                                <div className="border border-workshop-border/30 bg-workshop-surface/25 p-3 rounded-xl flex flex-col justify-between">
                                  <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-sans">Labour Charges</span>
                                  <span className="text-xs font-black text-workshop-text leading-none mt-1 font-sans">{formatCurrency(record.laborCost)}</span>
                                </div>
                                <div className="border border-workshop-border/30 bg-workshop-surface/25 p-3 rounded-xl flex flex-col justify-between">
                                  <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5 font-sans">Materials Cost</span>
                                  <span className="text-xs font-black text-workshop-text leading-none mt-1 font-sans">{formatCurrency(record.partsCost)}</span>
                                </div>
                              </div>

                              {/* Custom allocated parts list breakdown */}
                              {record.partsUsed && record.partsUsed.length > 0 && (
                                <div className="bg-workshop-surface/20 border border-workshop-border/20 rounded-xl p-4 space-y-2.5">
                                  <p className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest font-sans">Itemized Parts Consumption</p>
                                  <div className="space-y-2 font-sans">
                                    {record.partsUsed.map((parts, i) => (
                                      <div key={i} className="flex items-center justify-between text-xs px-1 py-0.5 hover:bg-workshop-surface/30 rounded transition-colors font-sans">
                                        <span className="text-workshop-text font-bold">{parts.name} <span className="text-[10px] text-workshop-muted font-normal ml-1">x{parts.quantity}</span></span>
                                        <span className="text-[#3B82F6] font-mono text-xs font-black">{formatCurrency(parts.unitPrice * parts.quantity)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-24 select-none">
                      <div className="w-16 h-16 bg-workshop-surface/50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-workshop-muted border border-workshop-border/20">
                        <ShieldCheck className="w-8 h-8 opacity-30 text-[#3B82F6]" />
                      </div>
                      <h3 className="text-workshop-text font-black uppercase tracking-tight text-sm font-sans">Clean Service History</h3>
                      <p className="text-workshop-muted text-xs mt-3 max-w-xs mx-auto leading-relaxed font-sans">No previous maintenance operations or workshop transactions are cataloged for this vehicle in the cloud database.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Sticky Action Header */}
              <div className="pt-6 px-6 pb-14 sm:pb-6 bg-workshop-bg border-t border-workshop-border/30 flex justify-end shrink-0">
                <button 
                  onClick={() => setSelectedVehicleForLedger(null)}
                  className="px-8 py-3.5 bg-[#3B82F6] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:brightness-110 shadow-lg shadow-[#3B82F6]/20 active:scale-95 transition-all outline-none"
                >
                  Close Ledger
                </button>
              </div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      <WhatsAppPopup
        isOpen={whatsAppRedirect !== null}
        onClose={() => setWhatsAppRedirect(null)}
        customerName={whatsAppRedirect?.name || ''}
        customerPhone={whatsAppRedirect?.phone || ''}
        url={whatsAppRedirect?.url || ''}
      />
    </div>
  );
}
