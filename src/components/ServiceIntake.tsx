import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, auth } from '../lib/firebase';
import { 
  UserPlus, 
  ClipboardCheck, 
  ChevronRight, 
  Search, 
  ArrowLeft,
  X,
  CheckCircle2,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import type { Customer, Vehicle } from '../types';

interface ServiceIntakeProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ServiceIntake({ onClose, onSuccess }: ServiceIntakeProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data for lookup
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Search states
  const [searchType, setSearchType] = useState<'plate' | 'phone'>('plate');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{customer: Customer, vehicle?: Vehicle}[]>([]);
  
  // Selection states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Form states
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  
  const [vehicleForm, setVehicleForm] = useState({
    make: '',
    model: '',
    color: '',
    plateNumber: '',
    passwordOrPin: ''
  });
  
  const [jobForm, setJobForm] = useState({
    mileage: '',
    description: '',
    expectedDeliveryDate: '',
    isDeadVehicle: false
  });

  const [useKey, setUseKey] = useState(false);

  // Fetch basics for lookup
  useEffect(() => {
    const fetchBasics = async () => {
      const vSnap = await getDocs(collection(db, 'vehicles'));
      const cSnap = await getDocs(collection(db, 'customers'));
      setVehicles(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
      setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    };
    fetchBasics();
  }, []);

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
    setSelectedCustomer(customer);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      setStep(3); // Directly to job details if vehicle is selected
    } else {
      setSelectedVehicle(null);
      setStep(2); // Choose/Add vehicle if only customer is selected
    }
  };

  const handleCreateNewCustomer = () => {
    setSelectedCustomer(null);
    setStep(1.5); // New customer form
  };

  const handleBackStep = () => {
    setStep(prev => Math.floor(prev - 1));
  };

  const handleSubmitIntake = async () => {
    setLoading(true);
    try {
      let customerId = selectedCustomer?.id;
      let vehicleId = selectedVehicle?.id;

      // 1. Create Customer if needed
      if (!selectedCustomer) {
        const cDoc = await addDoc(collection(db, 'customers'), {
          ...customerForm,
          technicianId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        customerId = cDoc.id;
      }

      // 2. Create Vehicle if needed
      if (!selectedVehicle) {
        const vDoc = await addDoc(collection(db, 'vehicles'), {
          ...vehicleForm,
          passwordOrPin: useKey ? 'Key' : vehicleForm.passwordOrPin,
          customerId,
          technicianId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        vehicleId = vDoc.id;
      }

      // 3. Create Service Record (Job Card)
      await addDoc(collection(db, 'serviceRecords'), {
        vehicleId,
        customerId,
        technicianId: auth.currentUser?.uid,
        technicianName: auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown Advisor',
        date: new Date().toISOString(),
        expectedDeliveryDate: jobForm.expectedDeliveryDate,
        mileage: Number(jobForm.mileage),
        isDeadVehicle: jobForm.isDeadVehicle,
        description: jobForm.description,
        status: 'pending',
        laborCost: 0,
        partsCost: 0,
        totalCost: 0,
        partsUsed: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      onSuccess();
      onClose();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'create', 'intake_flow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-workshop-bg/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-workshop-card w-full max-w-2xl rounded-xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95dvh] md:max-h-[85vh] border border-workshop-border"
      >
        {/* Header */}
        <div className="bg-workshop-bg p-6 md:p-8 text-workshop-text relative border-b border-workshop-border shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 hover:bg-workshop-surface rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-workshop-muted hover:text-workshop-text" />
          </button>
          
          <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
             <div className="w-10 h-10 md:w-12 md:h-12 bg-workshop-accent rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-workshop-accent/20">
                <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6 text-workshop-bg" />
             </div>
             <div>
               <h2 className="text-lg md:text-xl font-black tracking-tight uppercase leading-none">Vehicle Intake</h2>
               <p className="text-workshop-muted text-[10px] font-bold uppercase tracking-widest mt-1.5">Job Card Digitalization</p>
             </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={cn(
                  "h-1 md:h-1.5 rounded-full transition-all duration-500",
                  Math.floor(step) >= s ? "bg-workshop-accent w-8 md:w-12 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-workshop-surface w-4 md:w-6"
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-workshop-bg/30">
          <AnimatePresence mode="wait">
            {/* STEP 1: DISCOVERY / SEARCH */}
            {Math.floor(step) === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {step === 1 ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">Identify Vehicle or Owner</h3>
                       <p className="text-workshop-muted text-sm">Locate existing records to streamline the intake process.</p>
                    </div>

                    <div className="flex bg-workshop-surface p-1 rounded-xl border border-workshop-border">
                      <button 
                        onClick={() => { setSearchType('plate'); setSearchQuery(''); setSearchResults([]); }}
                        className={cn(
                          "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                          searchType === 'plate' ? "bg-workshop-card text-workshop-accent shadow-sm" : "text-workshop-muted"
                        )}
                      >
                        Plate Number
                      </button>
                      <button 
                        onClick={() => { setSearchType('phone'); setSearchQuery(''); setSearchResults([]); }}
                        className={cn(
                          "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                          searchType === 'phone' ? "bg-workshop-card text-workshop-accent shadow-sm" : "text-workshop-muted"
                        )}
                      >
                        Owner Details
                      </button>
                    </div>
                    
                    <div className="relative flex items-center">
                      <Search className="absolute left-4 text-workshop-muted w-4 h-4" />
                      <input 
                        type="text"
                        placeholder={searchType === 'plate' ? "Start typing plate number..." : "Search by phone or owner name..."}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-4 rounded-xl text-lg font-bold outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text uppercase placeholder:normal-case shadow-sm"
                      />
                    </div>

                    <div className="space-y-3">
                      {searchQuery.length > 0 && searchResults.length === 0 && (
                        <div className="p-8 text-center bg-workshop-surface/30 rounded-xl border border-workshop-border border-dashed">
                          <p className="text-workshop-muted text-sm font-medium opacity-50">Record does not exist</p>
                        </div>
                      )}

                      {searchResults.map((res, i) => (
                        <button
                          key={`${res.customer.id}-${res.vehicle?.id || i}`}
                          onClick={() => handleSelectResult(res.customer, res.vehicle)}
                          className="w-full flex items-center justify-between p-4 bg-workshop-card hover:border-workshop-accent/30 border border-workshop-border rounded-xl transition-all group text-left shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-workshop-bg rounded-xl flex items-center justify-center font-black text-workshop-text uppercase text-xs border border-workshop-border shadow-inner">
                              {res.vehicle ? res.vehicle.plateNumber.slice(-4) : res.customer.name[0]}
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-workshop-accent uppercase tracking-widest mb-0.5">
                                 {res.vehicle ? `${res.vehicle.make} ${res.vehicle.model}` : 'New Vehicle Entry Needed'}
                               </p>
                               <p className="font-bold text-workshop-text leading-tight uppercase">
                                 {res.customer.name}
                               </p>
                               <div className="flex items-center gap-2 mt-1">
                                 <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-tighter">{res.customer.phone}</p>
                                 {res.vehicle && (
                                   <>
                                     <span className="w-1 h-1 bg-workshop-border rounded-full" />
                                     <p className="text-[10px] font-bold text-workshop-secondary uppercase tracking-tighter">{res.vehicle.plateNumber}</p>
                                   </>
                                 )}
                               </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[8px] font-black text-workshop-muted uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">Select</span>
                             <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-accent translate-x-0 group-hover:translate-x-1 transition-all" />
                          </div>
                        </button>
                      ))}
                      
                      <button 
                        onClick={handleCreateNewCustomer}
                        className="w-full flex items-center gap-4 p-5 border-2 border-dashed border-workshop-border rounded-xl text-workshop-muted hover:border-workshop-accent/50 hover:text-workshop-accent transition-all font-black text-xs uppercase tracking-widest bg-workshop-surface/30"
                      >
                        <UserPlus className="w-5 h-5 opacity-50" />
                        <span>REGISTER NEW CUSTOMER RECORD</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <button onClick={() => setStep(1)} className="flex items-center gap-2 text-workshop-muted hover:text-workshop-text text-[10px] font-black uppercase tracking-widest">
                       <ArrowLeft className="w-4 h-4" /> Back to Search
                    </button>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">New Client Entry</h3>
                      <p className="text-workshop-muted text-sm">Register a new client into the workshop system.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Full Name</label>
                        <input 
                          value={customerForm.name}
                          onChange={e => setCustomerForm({...customerForm, name: e.target.value})}
                          className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                          placeholder="e.g. John Doe"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Contact Number</label>
                        <input 
                          value={customerForm.phone}
                          onChange={e => setCustomerForm({...customerForm, phone: e.target.value})}
                          className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                          placeholder="+1 234 567 890"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Email (Optional)</label>
                        <input 
                          value={customerForm.email}
                          onChange={e => setCustomerForm({...customerForm, email: e.target.value})}
                          className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Residential/Workshop Address</label>
                        <textarea 
                          value={customerForm.address}
                          onChange={e => setCustomerForm({...customerForm, address: e.target.value})}
                          className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold resize-none h-24"
                          placeholder="Enter place/address details..."
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setStep(2)}
                      disabled={!customerForm.name || !customerForm.phone}
                      className="w-full py-4 bg-workshop-accent text-workshop-bg rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-30 disabled:grayscale"
                    >
                      PROCEED TO VEHICLE DETAILS
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: VEHICLE DETAILS */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <button onClick={handleBackStep} className="flex items-center gap-2 text-workshop-muted hover:text-workshop-text text-[10px] font-black uppercase tracking-widest">
                   <ArrowLeft className="w-4 h-4" /> Client Info
                </button>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">Vehicle Identification</h3>
                  <p className="text-workshop-muted text-sm">Record technical specifications for the service entry.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Manufacturer</label>
                    <input 
                      value={vehicleForm.make}
                      onChange={e => setVehicleForm({...vehicleForm, make: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                      placeholder="e.g. Toyota"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Model</label>
                    <input 
                      value={vehicleForm.model}
                      onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                      placeholder="e.g. Camry"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Registration Plate</label>
                    <input 
                      value={vehicleForm.plateNumber}
                      onChange={e => setVehicleForm({...vehicleForm, plateNumber: e.target.value.toUpperCase()})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-mono font-bold text-workshop-accent uppercase"
                      placeholder="MH 12 AB 1234"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Vehicle Colour</label>
                    <input 
                      value={vehicleForm.color}
                      onChange={e => setVehicleForm({...vehicleForm, color: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                      placeholder="e.g. Red, Black"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Security: Password / PIN</label>
                    <div className="relative">
                      <input 
                        disabled={useKey}
                        type={useKey ? "text" : "number"} 
                        value={useKey ? 'Key' : vehicleForm.passwordOrPin}
                        onChange={e => setVehicleForm({...vehicleForm, passwordOrPin: e.target.value})}
                        className={cn(
                          "w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-mono text-workshop-text uppercase transition-all",
                          useKey && "opacity-50 font-bold"
                        )}
                        placeholder={useKey ? "" : "Enter numeric PIN..."}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newMode = !useKey;
                          setUseKey(newMode);
                          if (newMode) {
                            setVehicleForm({...vehicleForm, passwordOrPin: 'Key'});
                          } else {
                            setVehicleForm({...vehicleForm, passwordOrPin: ''});
                          }
                        }}
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
                          useKey ? "bg-workshop-accent text-workshop-bg shadow-lg" : "bg-workshop-surface text-workshop-muted hover:text-workshop-text"
                        )}
                        title="Toggle between Pin and physical Key"
                      >
                        <Key className={cn("w-4 h-4", useKey && "animate-pulse")} />
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setStep(3)}
                  disabled={!vehicleForm.make || !vehicleForm.plateNumber}
                  className="w-full py-4 bg-workshop-accent text-workshop-bg rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-30 disabled:grayscale"
                >
                  SET JOB REQUIREMENTS
                </button>
              </motion.div>
            )}

            {/* STEP 3: JOB DETAILS */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <button onClick={handleBackStep} className="flex items-center gap-2 text-workshop-muted hover:text-workshop-text text-[10px] font-black uppercase tracking-widest">
                   <ArrowLeft className="w-4 h-4" /> Vehicle Info
                </button>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">Job Specification</h3>
                  <p className="text-workshop-muted text-sm">Define the reason for intake and current vehicle status.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Vehicle Mileage (Odometer)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        disabled={jobForm.isDeadVehicle}
                        value={jobForm.isDeadVehicle ? '' : jobForm.mileage}
                        onChange={e => setJobForm({...jobForm, mileage: e.target.value})}
                        className={cn(
                          "w-full bg-workshop-surface border border-workshop-border px-4 py-4 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-mono text-lg font-black text-workshop-text transition-all",
                          jobForm.isDeadVehicle && "opacity-40 grayscale"
                        )}
                        placeholder={jobForm.isDeadVehicle ? "N/A - DEAD VEHICLE" : "000,000"}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setJobForm({...jobForm, isDeadVehicle: !jobForm.isDeadVehicle, mileage: !jobForm.isDeadVehicle ? '0' : jobForm.mileage})}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all",
                            jobForm.isDeadVehicle 
                              ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20" 
                              : "bg-workshop-bg border-workshop-border text-workshop-muted hover:border-rose-500/50 hover:text-rose-400"
                          )}
                        >
                          Vehicle Dead
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            jobForm.isDeadVehicle ? "bg-white animate-pulse" : "bg-workshop-muted opacity-30"
                          )} />
                        </button>
                        <span className="text-[10px] font-black text-workshop-muted uppercase tracking-widest opacity-50">KM / Miles</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Complaint / Work description</label>
                    <textarea 
                      value={jobForm.description}
                      onChange={e => setJobForm({...jobForm, description: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-4 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 h-40 resize-none font-bold text-workshop-text"
                      placeholder="e.g. Engine noise during cold start, brake pads check, full service..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">Expected Delivery Date</label>
                    <input 
                      type="date"
                      value={jobForm.expectedDeliveryDate}
                      onChange={e => setJobForm({...jobForm, expectedDeliveryDate: e.target.value})}
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-4 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-bold text-workshop-text"
                    />
                  </div>
                </div>

                <div className="p-4 bg-workshop-accent/10 rounded-xl border border-workshop-accent/20 flex items-start gap-4">
                  <div className="p-2 bg-workshop-bg rounded-lg text-workshop-accent shadow-sm border border-workshop-border">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-workshop-accent uppercase tracking-[0.2em]">Review Entry</p>
                    <p className="text-[10px] text-workshop-muted leading-relaxed font-bold opacity-80">
                      Confirming this intake will create a permanent Service Record for {selectedCustomer?.name || customerForm.name}. A digital job card will be assigned.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={handleSubmitIntake}
                  disabled={loading || !jobForm.description}
                  className="w-full py-5 bg-workshop-accent text-workshop-bg rounded-xl font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-500 transition-all shadow-xl shadow-workshop-accent/10 flex items-center justify-center gap-3 active:scale-95"
                >
                  {loading ? 'Processing...' : (
                    <>
                      <ClipboardCheck className="w-5 h-5" />
                      Issue Digital Job Card
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
