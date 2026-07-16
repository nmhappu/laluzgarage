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
import type { Customer, Vehicle, WorkshopUser } from '../types';

import { Portal } from './Portal';
import { MaterialCalendar } from './ui/MaterialCalendar';
import { WavyProgress } from './WavyProgress';

const capitalizeName = (name: string) => {
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface ServiceIntakeProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ServiceIntake({ onClose, onSuccess }: ServiceIntakeProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdJob, setCreatedJob] = useState<{
    customerName: string;
    vehicleName: string;
    vehiclePlate: string;
    description: string;
    waUrl: string;
  } | null>(null);
  
  // Data for lookup
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<WorkshopUser[]>([]);
  
  // PIN authentication states
  const [authenticatedAdvisor, setAuthenticatedAdvisor] = useState<WorkshopUser | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const pinInputRef = React.useRef<HTMLInputElement>(null);

  // Auto focus input when advisor verification opens
  useEffect(() => {
    if (!authenticatedAdvisor) {
      const t = setTimeout(() => {
        pinInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [authenticatedAdvisor]);

  const handleClear = () => {
    setPinCode('');
    setPinError(null);
  };

  useEffect(() => {
    if (!authenticatedAdvisor) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [authenticatedAdvisor]);
  
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
    phone: ''
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
    personalItems: '',
    expectedDeliveryDate: '',
    serviceDate: new Date().toISOString().split('T')[0],
    isDeadVehicle: false,
    isUnknownMileage: false
  });

  const [useKey, setUseKey] = useState(false);

  const isMileageInvalid = !jobForm.isDeadVehicle && !jobForm.isUnknownMileage && (!jobForm.mileage || parseInt(jobForm.mileage, 10) === 0);

  // Fetch basics for lookup
  useEffect(() => {
    const handleBackButton = (e: Event) => {
      if (step > 1) {
        handleBackStep();
        e.preventDefault();
      } else {
        onClose();
        e.preventDefault();
      }
    };

    window.addEventListener("appBackButton", handleBackButton);
    return () => window.removeEventListener("appBackButton", handleBackButton);
  }, [step, onClose]);

  useEffect(() => {
    const fetchBasics = async () => {
      const vSnap = await getDocs(collection(db, 'vehicles'));
      const cSnap = await getDocs(collection(db, 'customers'));
      const uSnap = await getDocs(collection(db, 'users'));
      setVehicles(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
      setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopUser)));
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
    if (step === 3 && selectedVehicle) {
      setSelectedVehicle(null);
      setSelectedCustomer(null);
      setStep(1);
    } else {
      setStep(prev => {
        if (prev === 2 && selectedCustomer) {
          setSelectedCustomer(null);
          return 1;
        }
        if (prev === 1.5) {
          return 1;
        }
        return Math.floor(prev - 1);
      });
    }
  };

  const handleSubmitIntake = async () => {
    setLoading(true);
    try {
      let customerId = selectedCustomer?.id;
      let vehicleId = selectedVehicle?.id;

                      // 1. Create Customer if needed
      if (!selectedCustomer) {
        const formattedPhone = customerForm.phone.trim().startsWith('+91')
          ? customerForm.phone.trim()
          : `+91 ${customerForm.phone.trim()}`;

        const cDoc = await addDoc(collection(db, 'customers'), {
          name: customerForm.name,
          phone: formattedPhone,
          technicianId: authenticatedAdvisor?.id || auth.currentUser?.uid,
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
          technicianId: authenticatedAdvisor?.id || auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        vehicleId = vDoc.id;
      }

      // 3. Create Service Record (Job Card)
      await addDoc(collection(db, 'serviceRecords'), {
        vehicleId,
        customerId,
        technicianId: authenticatedAdvisor?.id || auth.currentUser?.uid,
        technicianName: authenticatedAdvisor?.name || authenticatedAdvisor?.email || auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown Advisor',
        date: jobForm.serviceDate + "T" + new Date().toISOString().split('T')[1],
        expectedDeliveryDate: jobForm.expectedDeliveryDate,
        mileage: (jobForm.isDeadVehicle || jobForm.isUnknownMileage) ? 0 : Number(jobForm.mileage || 0),
        isDeadVehicle: jobForm.isDeadVehicle,
        isUnknownMileage: jobForm.isUnknownMileage,
        personalItems: jobForm.personalItems,
        description: jobForm.description,
        status: 'pending',
        laborCost: 0,
        partsCost: 0,
        totalCost: 0,
        partsUsed: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Automated WhatsApp dispatch upon successful registration
      const customerPhone = selectedCustomer ? selectedCustomer.phone : (customerForm.phone.trim().startsWith('+91') ? customerForm.phone.trim() : `+91 ${customerForm.phone.trim()}`);
      const customerName = selectedCustomer ? selectedCustomer.name : customerForm.name;
      const vehicleMake = selectedVehicle ? selectedVehicle.make : vehicleForm.make;
      const vehicleModel = selectedVehicle ? selectedVehicle.model : vehicleForm.model;
      const vehiclePlate = selectedVehicle ? selectedVehicle.plateNumber : vehicleForm.plateNumber;

      let waUrl = '';
      if (customerPhone) {
        const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
        const greeting = `Hello ${customerName ? capitalizeName(customerName) : 'Customer'},\n\nWe have successfully registered your vehicle *${vehicleMake || ''} ${vehicleModel || ''}* [${vehiclePlate?.toUpperCase() || 'No Plate'}] at our service center.\n\n`;
        const details = `*Job Details:* ${jobForm.description || 'Service Maintenance'}\n*Status:* Pending 🛠\n`;
        const signOff = `\nWe will keep you updated on the progress. Thank you!`;
        const fullText = `${greeting}${details}${signOff}`;
        waUrl = `https://wa.me/${cleanPhone}/?text=${encodeURIComponent(fullText)}`;
      }

      setCreatedJob({
        customerName: customerName || 'Customer',
        vehicleName: `${vehicleMake || ''} ${vehicleModel || ''}`.trim() || 'Vehicle',
        vehiclePlate: vehiclePlate || '',
        description: jobForm.description || 'Service Maintenance',
        waUrl
      });
      
      onSuccess();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'create', 'intake_flow');
    } finally {
      setLoading(false);
    }
  };

  if (createdJob) {
    return (
      <Portal>
        <div className="fixed inset-0 z-[100] bg-workshop-bg flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md w-full bg-workshop-surface rounded-2xl p-8 border border-workshop-border shadow-2xl space-y-6"
          >
            <div className="w-16 h-16 bg-status-success/10 text-status-success rounded-full flex items-center justify-center mx-auto border border-status-success/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-workshop-text uppercase tracking-tight">Job Card Issued!</h3>
              <p className="text-xs text-workshop-muted">
                The digital job card was successfully created and logged into our secure systems.
              </p>
            </div>

            <div className="bg-workshop-bg/50 border border-workshop-border/40 rounded-xl p-5 text-left space-y-3">
              <div>
                <span className="text-[9px] uppercase font-black text-workshop-muted tracking-wider">Owner / Customer</span>
                <p className="text-sm font-bold text-workshop-text">{createdJob.customerName}</p>
              </div>
              <div>
                <span className="text-[9px] uppercase font-black text-workshop-muted tracking-wider">Vehicle Details</span>
                <p className="text-sm font-bold text-workshop-text">
                  {createdJob.vehicleName} {createdJob.vehiclePlate && `[${createdJob.vehiclePlate.toUpperCase()}]`}
                </p>
              </div>
              <div>
                <span className="text-[9px] uppercase font-black text-workshop-muted tracking-wider">Job Details</span>
                <p className="text-xs font-semibold text-workshop-text line-clamp-2">{createdJob.description}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              {createdJob.waUrl && (
                <button
                  type="button"
                  onClick={() => {
                    window.open(createdJob.waUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="w-full py-4 bg-[#128C7E] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-[#0e7065] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.182 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.852.002-2.63-1.023-5.101-2.887-6.968C16.586 1.916 14.112.893 11.48.893 6.046.893 1.622 5.31 1.618 10.74c-.001 1.745.462 3.447 1.341 4.966L1.9 20.311l4.747-1.157zm12.081-4.706c-.329-.165-1.947-.961-2.246-1.069-.299-.109-.517-.165-.736.165-.218.329-.844 1.069-1.033 1.288-.19.218-.379.245-.708.082-.329-.165-1.389-.512-2.645-1.633-.977-.872-1.637-1.95-1.829-2.28-.192-.329-.02-.507.145-.671.148-.147.329-.384.494-.577.165-.19.22-.329.329-.55.109-.218.055-.41-.027-.577-.082-.165-.736-1.774-1.009-2.433-.266-.639-.536-.55-.736-.56-.19-.01-.409-.012-.628-.012-.218 0-.573.082-.872.41-.299.329-1.144 1.118-1.144 2.726 0 1.609 1.171 3.161 1.334 3.379.163.218 2.302 3.515 5.577 4.926.779.336 1.388.537 1.862.688.784.249 1.497.214 2.061.13.629-.094 1.948-.797 2.222-1.567.274-.769.274-1.43.192-1.567-.082-.136-.299-.218-.628-.383z" />
                  </svg>
                  Share via WhatsApp
                </button>
              )}
              
              <button
                type="button"
                onClick={() => {
                  setCreatedJob(null);
                  onClose();
                }}
                className="w-full py-4 bg-workshop-surface text-workshop-text hover:bg-workshop-border/30 rounded-xl text-xs font-black uppercase tracking-wider border border-workshop-border/60 hover:border-workshop-text/20 transition-all flex items-center justify-center gap-2"
              >
                Dismiss & Close
              </button>
            </div>
          </motion.div>
        </div>
      </Portal>
    );
  }

  if (!authenticatedAdvisor) {
    return (
      <Portal>
        <div className="fixed inset-0 z-[100] bg-workshop-bg flex flex-col w-full h-full overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center px-6 py-8 shrink-0"
          >
            {/* PIN Header */}
            <div className="flex items-center justify-between pb-6 border-b border-workshop-border/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/5">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight uppercase leading-none">Advisor Verification</h2>
                  <p className="text-workshop-muted text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">Authentication Required</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-workshop-surface rounded-full transition-colors text-workshop-muted hover:text-workshop-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PIN Content */}
            <div className="py-8 space-y-6 flex flex-col items-center justify-center text-center">
              <div className="space-y-1">
                <p className="text-sm font-bold text-workshop-text">Enter Security PIN</p>
                <p className="text-xs text-workshop-muted px-4 leading-relaxed font-medium">
                  Enter your assigned 4-digit advisor/technician PIN to unlock the intake workbook.
                </p>
              </div>

              {/* Dots representation */}
              <div className="flex justify-center gap-4 py-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-4 h-4 rounded-full border-2 border-workshop-border transition-all duration-150",
                      pinCode.length > index 
                        ? "bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-500/30" 
                        : "bg-transparent"
                    )}
                  />
                ))}
              </div>

              {/* Error Display */}
              <div className="h-4">
                <AnimatePresence mode="wait">
                  {pinError && (
                    <motion.p 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="text-xs font-bold text-status-urgent"
                    >
                      {pinError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Hidden text input to capture key strokes and trigger system numeric keyboard */}
              <input
                ref={pinInputRef}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                value={pinCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                  setPinCode(val);
                  setPinError(null);
                  if (val.length === 4) {
                    const matched = users.find(u => u.pin === val);
                    if (matched) {
                      setAuthenticatedAdvisor(matched);
                      setPinCode('');
                    } else {
                      setPinError('Invalid advisor PIN. Please try again.');
                      setTimeout(() => {
                        setPinCode('');
                      }, 600);
                    }
                  }
                }}
                className="opacity-0 absolute w-1 h-1 pointer-events-none"
              />

              {/* Keyboard trigger and instructions */}
              <div className="w-full max-w-[280px] mx-auto space-y-4 pt-2">
                <button
                  type="button"
                  onClick={() => pinInputRef.current?.focus()}
                  className="w-full bg-workshop-surface hover:bg-workshop-surface/80 border border-workshop-border/30 rounded-xl py-5 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 shadow-md cursor-pointer group"
                >
                  <span className="text-xs font-black text-workshop-accent uppercase tracking-wider group-hover:brightness-110 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                    Open System Keyboard
                  </span>
                  <span className="text-[10px] text-workshop-muted font-bold uppercase tracking-widest opacity-60">
                    Only Digits Permitted
                  </span>
                </button>
                
                {pinCode.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-full py-2.5 text-xs font-bold text-workshop-muted hover:text-workshop-text uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Clear Input
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </Portal>
    );
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] bg-workshop-bg flex flex-col w-full h-full overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="w-full flex-1 flex flex-col h-full bg-workshop-bg text-workshop-text relative overflow-hidden"
        >
          {/* Header */}
          <div className="bg-workshop-bg p-6 md:p-8 text-workshop-text relative border-b border-workshop-border shrink-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 md:gap-4">
                 <div className="w-10 h-10 bg-workshop-accent rounded-xl flex items-center justify-center shadow-lg shadow-workshop-accent/20">
                    <ClipboardCheck className="w-5 h-5 text-workshop-bg" />
                 </div>
                 <div>
                    <h2 className="text-lg md:text-xl font-black tracking-tight uppercase leading-none">Vehicle Intake</h2>
                    <p className="text-workshop-muted text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">Step {Math.floor(step)} of 3 • Active Advisor: <span className="text-workshop-accent font-black">{authenticatedAdvisor?.name || authenticatedAdvisor?.email}</span></p>
                 </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-workshop-surface rounded-full transition-colors text-workshop-muted hover:text-workshop-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
  
            {/* Progress Bar */}
            <div className="relative w-full py-2 px-1 select-none">
              {/* Progress Track and Wavy Line Container */}
              <div className="relative w-full h-8 flex items-center mb-1">
                {/* Wavy active line using Material Web Component spec */}
                <WavyProgress 
                  value={(() => {
                    if (step === 1) return 0;
                    if (step === 1.5) return 25;
                    if (step === 2) return 50;
                    if (step === 2.5) return 75;
                    return 100;
                  })()}
                  max={100}
                  height={24}
                  waveLength={32}
                  amplitude={5.5}
                  strokeWidth={5}
                  className="absolute inset-x-0 z-10"
                />

                {/* Step Nodes Row */}
                <div className="absolute inset-x-0 flex justify-between items-center z-20">
                  {[1, 2, 3].map((s) => {
                    const isCompleted = step > s && Math.floor(step) !== s;
                    const isActive = Math.floor(step) === s;
                    
                    return (
                      <div key={s} className="relative flex flex-col items-center">
                        <div 
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border font-bold text-xs select-none",
                            isCompleted 
                              ? "bg-workshop-accent border-workshop-accent text-workshop-bg shadow-md shadow-workshop-accent/20"
                              : isActive
                                ? "bg-workshop-bg border-workshop-accent text-workshop-accent scale-110 shadow-lg shadow-workshop-accent/30"
                                : "bg-workshop-bg border-workshop-border text-workshop-muted"
                          )}
                        >
                          {isCompleted ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            s
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Labels for Steps */}
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-workshop-muted opacity-80 mt-1 select-none">
                <span className={cn(Math.floor(step) >= 1 ? "text-workshop-accent" : "")}>Customer</span>
                <span className={cn(Math.floor(step) >= 2 ? "text-workshop-accent" : "")}>Vehicle</span>
                <span className={cn(Math.floor(step) >= 3 ? "text-workshop-accent" : "")}>Job Info</span>
              </div>
            </div>
          </div>
  
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-workshop-bg/30">
            <AnimatePresence mode="wait">
              {Math.floor(step) === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, scale: 0.98, x: 15 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.98, x: -15 }}
                  transition={{ duration: 0.3, ease: [0.2, 0, 0, 1.0] }}
                  className="space-y-6"
                >
                  {step === 1 ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">
                          Identify Vehicle or Owner
                        </h3>
                        <p className="text-workshop-muted text-sm">
                          Locate existing records to streamline the intake
                          process.
                        </p>
                      </div>

                      <div className="flex bg-workshop-surface p-1 rounded-xl border border-workshop-border">
                        <button
                          onClick={() => {
                            setSearchType("plate");
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                          className={cn(
                            "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            searchType === "plate"
                              ? "bg-workshop-card text-workshop-accent shadow-sm"
                              : "text-workshop-muted"
                          )}
                        >
                          Plate Number
                        </button>
                        <button
                          onClick={() => {
                            setSearchType("phone");
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                          className={cn(
                            "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            searchType === "phone"
                              ? "bg-workshop-card text-workshop-accent shadow-sm"
                              : "text-workshop-muted"
                          )}
                        >
                          Owner Details
                        </button>
                      </div>

                      <div className="relative flex items-center">
                        <Search className="absolute left-4 text-workshop-muted w-4 h-4" />
                        <input
                          type="text"
                          placeholder={
                            searchType === "plate"
                              ? "Start typing plate number..."
                              : "Search by phone or owner name..."
                          }
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-4 rounded-xl text-lg font-bold outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text uppercase placeholder:normal-case shadow-sm"
                        />
                      </div>

                      <div className="space-y-3">
                        {searchQuery.length > 0 && searchResults.length === 0 && (
                          <div className="p-8 text-center bg-workshop-surface/30 rounded-xl border border-workshop-border border-dashed">
                            <p className="text-workshop-muted text-sm font-medium opacity-50">
                              Record does not exist
                            </p>
                          </div>
                        )}

                        {searchResults.map((res, i) => (
                          <button
                            key={`${res.customer.id}-${res.vehicle?.id || i}`}
                            onClick={() =>
                              handleSelectResult(res.customer, res.vehicle)
                            }
                            className="w-full flex items-center justify-between p-4 bg-workshop-card hover:border-workshop-accent/30 border border-workshop-border rounded-xl transition-all group text-left shadow-sm"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-workshop-bg rounded-xl flex items-center justify-center font-black text-workshop-text uppercase text-xs border border-workshop-border shadow-inner">
                                {res.vehicle
                                  ? res.vehicle.plateNumber.slice(-4)
                                  : res.customer.name[0]}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-workshop-accent uppercase tracking-widest mb-0.5">
                                  {res.vehicle
                                    ? `${res.vehicle.make} ${res.vehicle.model}`
                                    : "New Vehicle Entry Needed"}
                                </p>
                                <p className="font-bold text-workshop-text leading-tight uppercase">
                                  {res.customer.name}
                                </p>
                                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
                                  <div className="flex items-center gap-1.5 text-workshop-muted">
                                    <Search className="w-2.5 h-2.5 opacity-40" />
                                    <p className="text-[10px] font-bold uppercase tracking-tighter">
                                      {res.customer.phone}
                                    </p>
                                  </div>
                                  {res.vehicle && (
                                    <>
                                      <div className="flex items-center gap-1.5 text-workshop-secondary">
                                        <span className="w-1 h-1 bg-workshop-border rounded-full shrink-0" />
                                        <p className="text-[10px] font-bold uppercase tracking-tighter">
                                          {res.vehicle.plateNumber}
                                        </p>
                                      </div>
                                      {res.vehicle.passwordOrPin && (
                                        <div className="flex items-center gap-1.5 text-status-success bg-status-success/5 px-1.5 rounded border border-status-success/10">
                                          <Key className="w-2.5 h-2.5" />
                                          <span className="text-[10px] font-mono font-bold uppercase tracking-tighter">
                                            {res.vehicle.passwordOrPin}
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-workshop-muted uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">
                                Select
                              </span>
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
                      <button
                        onClick={() => setStep(1)}
                        className="flex items-center gap-2 text-workshop-muted hover:text-workshop-text text-[10px] font-black uppercase tracking-widest"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back to Search
                      </button>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">
                          New Client Entry
                        </h3>
                        <p className="text-workshop-muted text-sm">
                          Register a new client into the workshop system.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">
                            Full Name
                          </label>
                          <input
                            value={customerForm.name}
                            onChange={(e) =>
                              setCustomerForm({
                                ...customerForm,
                                name: e.target.value,
                              })
                            }
                            className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                            placeholder="e.g. John Doe"
                          />
                        </div>
                        <div className="relative pt-2.5">
                          <div className="flex items-center w-full bg-workshop-surface border-2 border-[#3B82F6] rounded-xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-[#3B82F6]/30 transition-all">
                            {/* Floating notched label */}
                            <span className="absolute left-4 top-0 bg-workshop-bg px-2 text-[11px] font-black uppercase tracking-wider text-[#3B82F6] select-none">
                              Phone number
                            </span>
                            
                            {/* Prefix */}
                            <span className="text-workshop-text font-mono font-bold text-base select-none pr-3 shrink-0">
                              +91
                            </span>
                            
                            {/* Separator / Divider Line */}
                            <div className="h-6 w-px bg-workshop-border/40 mr-3.5 shrink-0" />
                            
                            {/* Actual Input */}
                            <input
                              type="tel"
                              inputMode="tel"
                              value={customerForm.phone}
                              onChange={(e) => {
                                let val = e.target.value;
                                // If +91 or 91 was entered, strip it out cleanly
                                if (val.startsWith("+91")) {
                                  val = val.substring(3);
                                } else if (val.startsWith("91") && val.length > 10) {
                                  val = val.substring(2);
                                }
                                setCustomerForm({
                                  ...customerForm,
                                  phone: val,
                                });
                              }}
                              className="w-full bg-transparent border-none p-0 outline-none focus:ring-0 text-workshop-text font-mono font-bold text-base tracking-wide placeholder-workshop-muted/40"
                              placeholder="85471 87345"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setStep(2)}
                        disabled={!customerForm.name || !customerForm.phone}
                        className="w-full py-4 bg-workshop-accent text-workshop-bg rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                      >
                        PROCEED TO VEHICLE DETAILS
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : step === 2 ? (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, scale: 0.98, x: 15 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.98, x: -15 }}
                  transition={{ duration: 0.3, ease: [0.2, 0, 0, 1.0] }}
                  className="space-y-6"
                >
                  <button
                    onClick={handleBackStep}
                    className="flex items-center gap-2 text-workshop-muted hover:text-workshop-text text-[10px] font-black uppercase tracking-widest"
                  >
                    <ArrowLeft className="w-4 h-4" /> {selectedCustomer ? "Back to Search" : "Client Info"}
                  </button>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">
                      Vehicle Identification
                    </h3>
                    <p className="text-workshop-muted text-sm">
                      Record technical specifications for the service entry.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">
                        Manufacturer
                      </label>
                      <input
                        value={vehicleForm.make}
                        onChange={(e) =>
                          setVehicleForm({ ...vehicleForm, make: e.target.value })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                        placeholder="e.g. Toyota"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5">
                        Model
                        <span className="text-status-urgent">*</span>
                      </label>
                      <input
                        value={vehicleForm.model}
                        onChange={(e) =>
                          setVehicleForm({ ...vehicleForm, model: e.target.value })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                        placeholder="e.g. Camry"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">
                        Registration Plate
                      </label>
                      <input
                        value={vehicleForm.plateNumber}
                        onChange={(e) =>
                          setVehicleForm({
                            ...vehicleForm,
                            plateNumber: e.target.value.replace(/\s+/g, "").toUpperCase(),
                          })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-mono font-bold text-workshop-accent uppercase"
                        placeholder="MH12AB1234"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">
                        Vehicle Colour
                      </label>
                      <input
                        value={vehicleForm.color}
                        onChange={(e) =>
                          setVehicleForm({ ...vehicleForm, color: e.target.value })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                        placeholder="e.g. Red, Black"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5">
                        Security: Password / PIN
                        <span className="text-status-urgent">*</span>
                      </label>
                      <div className="relative">
                        <input
                          disabled={useKey}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={useKey ? "Key" : vehicleForm.passwordOrPin}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (useKey) return;
                            if (
                              val === "" ||
                              (/^\d+$/.test(val) && val.length <= 6)
                            ) {
                              setVehicleForm({
                                ...vehicleForm,
                                passwordOrPin: val,
                              });
                            }
                          }}
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
                              setVehicleForm({
                                ...vehicleForm,
                                passwordOrPin: "Key",
                              });
                            } else {
                              setVehicleForm({
                                ...vehicleForm,
                                passwordOrPin: "",
                              });
                            }
                          }}
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
                            useKey
                              ? "bg-workshop-accent text-workshop-bg shadow-lg"
                              : "bg-workshop-surface text-workshop-muted hover:text-workshop-text"
                          )}
                          title="Toggle between Pin and physical Key"
                        >
                          <Key
                            className={cn("w-4 h-4", useKey && "animate-pulse")}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(3)}
                    disabled={
                      !vehicleForm.make ||
                      !vehicleForm.model ||
                      !vehicleForm.plateNumber ||
                      !vehicleForm.passwordOrPin
                    }
                    className="w-full py-4 bg-workshop-accent text-workshop-bg rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                  >
                    SET JOB REQUIREMENTS
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.98, x: 15 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.98, x: -15 }}
                  transition={{ duration: 0.3, ease: [0.2, 0, 0, 1.0] }}
                  className="space-y-6"
                >
                  <button
                    onClick={handleBackStep}
                    className="flex items-center gap-2 text-workshop-muted hover:text-workshop-text text-[10px] font-black uppercase tracking-widest"
                  >
                    <ArrowLeft className="w-4 h-4" /> {selectedVehicle ? "Back to Search" : "Vehicle Info"}
                  </button>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">
                      Job Specification
                    </h3>
                    <p className="text-workshop-muted text-sm">
                      Define the reason for intake and current vehicle status.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">
                        Vehicle Mileage (Odometer)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={jobForm.isDeadVehicle || jobForm.isUnknownMileage}
                          value={jobForm.isDeadVehicle || jobForm.isUnknownMileage ? "" : jobForm.mileage}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d+$/.test(val)) {
                              setJobForm({ ...jobForm, mileage: val });
                            }
                          }}
                          className={cn(
                            "w-full bg-workshop-surface border border-workshop-border px-4 py-4 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-mono text-lg font-black text-workshop-text transition-all",
                            (jobForm.isDeadVehicle || jobForm.isUnknownMileage) && "opacity-40 grayscale"
                          )}
                          placeholder={
                            jobForm.isDeadVehicle 
                              ? "N/A - DEAD VEHICLE" 
                              : jobForm.isUnknownMileage 
                                ? "N/A - VEHICLE LOCKED" 
                                : "000000"
                          }
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                          <span className="text-[10px] font-black text-workshop-muted uppercase tracking-widest opacity-50">
                            KM / Miles
                          </span>
                        </div>
                      </div>

                      {/* Input "0" validation feedback */}
                      {!jobForm.isDeadVehicle && !jobForm.isUnknownMileage && jobForm.mileage === "0" && (
                        <p className="text-status-urgent text-[10px] font-bold mt-1 uppercase tracking-wider">
                          Odometer reading cannot be 0 (input a valid positive mileage or select 'Unknown' / 'Dead')
                        </p>
                      )}

                      {/* Status Chips Row */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setJobForm({
                              ...jobForm,
                              isDeadVehicle: !jobForm.isDeadVehicle,
                              isUnknownMileage: false,
                              mileage: "",
                            })
                          }
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer",
                            jobForm.isDeadVehicle
                              ? "bg-status-urgent border-status-urgent/40 text-white shadow-lg shadow-status-urgent/20"
                              : "bg-workshop-bg border-workshop-border text-workshop-muted hover:border-status-urgent/50 hover:text-status-urgent"
                          )}
                        >
                          Vehicle Dead
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              jobForm.isDeadVehicle
                                ? "bg-white animate-pulse"
                                : "bg-workshop-muted opacity-30"
                            )}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setJobForm({
                              ...jobForm,
                              isUnknownMileage: !jobForm.isUnknownMileage,
                              isDeadVehicle: false,
                              mileage: "",
                            })
                          }
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer",
                            jobForm.isUnknownMileage
                              ? "bg-white border-white text-black shadow-lg shadow-white/15"
                              : "bg-workshop-bg border-workshop-border text-workshop-muted hover:border-white/50 hover:text-white"
                          )}
                        >
                          Unknown (Locked/Alive)
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              jobForm.isUnknownMileage
                                ? "bg-black"
                                : "bg-workshop-muted opacity-30"
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">
                        Complaint / Work description
                      </label>
                      <textarea
                        value={jobForm.description}
                        onChange={(e) =>
                          setJobForm({ ...jobForm, description: e.target.value })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-4 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 h-40 resize-none font-bold text-workshop-text"
                        placeholder="e.g. Engine noise during cold start, brake pads check, full service..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted">
                        Personal Items / Valuables in Vehicle
                      </label>
                      <textarea
                        value={jobForm.personalItems}
                        onChange={(e) =>
                          setJobForm({ ...jobForm, personalItems: e.target.value })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-bold text-workshop-text min-h-[80px] resize-none"
                        placeholder="e.g. Laptop, Cash, Sunglasses, Spare Tyre..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5">
                          Service Date
                          <span className="text-status-urgent">*</span>
                        </label>
                        <MaterialCalendar
                          value={jobForm.serviceDate}
                          onChange={(val) =>
                            setJobForm({ ...jobForm, serviceDate: val })
                          }
                          max={new Date().toISOString().split("T")[0]}
                          className={cn(
                            "py-4",
                            jobForm.serviceDate ===
                              new Date().toISOString().split("T")[0]
                              ? "text-workshop-accent"
                              : "text-workshop-text"
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5">
                          Expected Delivery Date
                          <span className="text-status-urgent">*</span>
                        </label>
                        <MaterialCalendar
                          value={jobForm.expectedDeliveryDate}
                          onChange={(val) =>
                            setJobForm({
                              ...jobForm,
                              expectedDeliveryDate: val,
                            })
                          }
                          min={new Date().toISOString().split("T")[0]}
                          className="py-4 text-workshop-text"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-workshop-accent/10 rounded-xl border border-workshop-accent/20 flex items-start gap-4">
                    <div className="p-2 bg-workshop-bg rounded-lg text-workshop-accent shadow-sm border border-workshop-border">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-workshop-accent uppercase tracking-[0.2em]">
                        Review Entry
                      </p>
                      <p className="text-[10px] text-workshop-muted leading-relaxed font-bold opacity-80">
                        Confirming this intake will create a permanent Service
                        Record for {selectedCustomer?.name || customerForm.name}.
                        A digital job card will be assigned.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitIntake}
                    disabled={
                      loading ||
                      !jobForm.description ||
                      !jobForm.serviceDate ||
                      !jobForm.expectedDeliveryDate ||
                      isMileageInvalid
                    }
                    className="w-full py-5 bg-workshop-accent text-workshop-bg rounded-xl font-black text-xs uppercase tracking-[0.3em] hover:brightness-110 transition-all shadow-xl shadow-workshop-accent/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 disabled:grayscale"
                  >
                    {loading ? (
                      "Processing..."
                    ) : (
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
    </Portal>
  );
}
