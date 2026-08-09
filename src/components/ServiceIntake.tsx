import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '@material/web/progress/circular-progress.js';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
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
import type { Customer, Vehicle, WorkshopUser, ServiceRecord } from '../types';

import { Portal } from './Portal';
import { MaterialCalendar } from './ui/MaterialCalendar';
import { WavyProgress } from './WavyProgress';
import { getWhatsAppPresetsSync, formatIntakeMessage } from '../services/whatsappPresetService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MdCircularProgress = 'md-circular-progress' as any;

interface ServiceIntakeProps {
  onClose: () => void;
  onSuccess: () => void;
  isPage?: boolean;
}

export function ServiceIntake({ onClose, onSuccess, isPage }: ServiceIntakeProps) {
  const [step, setStep] = useState(1);
  const Wrapper = isPage ? React.Fragment : Portal;

  const [loading, setLoading] = useState(false);
  const [createdJob, setCreatedJob] = useState<{
    customerName: string;
    vehicleName: string;
    vehiclePlate: string;
    description: string;
    waUrl: string;
  } | null>(null);
  
  const { profile, user: authUser } = useAuth();
  
  // Data for lookup
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<WorkshopUser[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  
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
      }, 250);
      return () => clearTimeout(t);
    }
  }, [authenticatedAdvisor]);

  const processPinEntry = React.useCallback((val: string) => {
    setPinCode(val);
    setPinError(null);
    if (val.length === 4) {
      const matched = users.find(u => u.pin && String(u.pin) === val) ||
        (profile && (profile.pin ? String(profile.pin) === val : val === '1234') ? profile : null) ||
        (users.length === 0 && val === '1234' && authUser ? { id: authUser.uid, name: authUser.displayName || authUser.email || 'Advisor', email: authUser.email || '', status: 'online' as const } : null);
      if (matched) {
        setAuthenticatedAdvisor(matched);
        setPinCode('');
      } else {
        setPinError('Invalid advisor PIN. Please try again.');
        setPinCode('');
      }
    }
  }, [users, profile, authUser]);

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
  }, [authenticatedAdvisor, onClose]);
  
  // Search states
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
      try {
        const vSnap = await getDocs(collection(db, 'vehicles'));
        const cSnap = await getDocs(collection(db, 'customers'));
        const uSnap = await getDocs(collection(db, 'users'));
        const rSnap = await getDocs(collection(db, 'serviceRecords'));
        setVehicles(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
        setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
        setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopUser)));
        setRecords(rSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord)));
      } catch (err) {
        console.error("Error fetching intake initial data:", err);
      }
    };
    fetchBasics();
  }, []);

  const getLastServicedDate = (customer: Customer, vehicle?: Vehicle) => {
    const matchRecords = records.filter(
      (r) => (vehicle && r.vehicleId === vehicle.id) || r.customerId === customer.id
    );
    if (matchRecords.length > 0) {
      const sorted = [...matchRecords].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      const latest = sorted[0];
      if (latest && latest.date) {
        const d = new Date(latest.date);
        if (!isNaN(d.getTime())) {
          const day = d.getDate();
          const month = d.toLocaleString('en-US', { month: 'short' });
          const year = d.getFullYear();
          return `${day} ${month} ${year}`;
        }
      }
    }
    return `21 May ${new Date().getFullYear()}`;
  };

  // Real-time lookup
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const qClean = q.replace(/\s+/g, '');
    const resultsMap = new Map<string, { customer: Customer; vehicle?: Vehicle }>();

    // Search in vehicles (plate, make, model, color, pin/password)
    vehicles.forEach(v => {
      const plate = (v.plateNumber || '').toLowerCase();
      const plateClean = plate.replace(/\s+/g, '');
      const make = (v.make || '').toLowerCase();
      const model = (v.model || '').toLowerCase();
      const makeModel = `${make} ${model}`;
      const color = (v.color || '').toLowerCase();
      const pin = (v.passwordOrPin || '').toLowerCase();

      const isMatch =
        plate.includes(q) ||
        plateClean.includes(qClean) ||
        make.includes(q) ||
        model.includes(q) ||
        makeModel.includes(q) ||
        color.includes(q) ||
        pin.includes(q);

      if (isMatch) {
        const customer = customers.find(c => c.id === v.customerId);
        if (customer) {
          const key = `${customer.id}_${v.id}`;
          resultsMap.set(key, { customer, vehicle: v });
        }
      }
    });

    // Search in customers (name, phone)
    customers.forEach(c => {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '').replace(/\s/g, '');

      const isMatch = name.includes(q) || phone.includes(qClean) || (c.phone || '').includes(q);

      if (isMatch) {
        const cVehicles = vehicles.filter(v => v.customerId === c.id);
        if (cVehicles.length > 0) {
          cVehicles.forEach(v => {
            const key = `${c.id}_${v.id}`;
            if (!resultsMap.has(key)) {
              resultsMap.set(key, { customer: c, vehicle: v });
            }
          });
        } else {
          const key = `${c.id}_no-vehicle`;
          if (!resultsMap.has(key)) {
            resultsMap.set(key, { customer: c });
          }
        }
      }
    });

    setSearchResults(Array.from(resultsMap.values()));
  }, [searchQuery, vehicles, customers]);

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
        const presets = getWhatsAppPresetsSync();
        const fullText = formatIntakeMessage(presets.intakeTemplate, {
          customerName,
          vehicleMake,
          vehicleModel,
          vehiclePlate,
          jobDescription: jobForm.description,
        });
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
      <Wrapper>
        <div className={cn(
          isPage 
            ? "w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-12 px-6 min-h-[80vh] text-center" 
            : "fixed inset-0 z-[100] bg-workshop-bg flex flex-col items-center justify-center p-6 text-center overflow-y-auto"
        )}>
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
                  <img src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/whatsapp-light.svg" alt="WhatsApp" className="w-5 h-5 shrink-0" referrerPolicy="no-referrer" />
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
      </Wrapper>
    );
  }

  if (!authenticatedAdvisor) {
    return (
      <Wrapper>
        <motion.div
          initial={isPage ? { opacity: 0, y: 15 } : { opacity: 0 }}
          animate={isPage ? { opacity: 1, y: 0 } : { opacity: 1 }}
          exit={isPage ? { opacity: 0, y: -10 } : { opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1.0] }}
          className={cn(
            "bg-workshop-bg flex flex-col justify-between",
            isPage 
              ? "w-full max-w-4xl mx-auto min-h-[75vh]" 
              : "fixed inset-0 z-[100] h-full p-0 pb-6 overflow-y-auto"
          )}
        >
          {/* Top Header Bar */}
          <div className="w-full sticky top-0 z-20 bg-workshop-bg border-b border-workshop-border/20 shrink-0">
            <div className="safe-top" />
            <div className="h-16 flex items-center justify-between px-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <Key className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="text-sm font-black tracking-wider uppercase text-workshop-text font-google-sans">Advisor Verification</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-workshop-surface rounded-xl transition-colors text-workshop-muted hover:text-workshop-text cursor-pointer active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Clean Main PIN Content Area (Without Card Style) */}
          <div className="w-full max-w-sm mx-auto my-auto flex flex-col items-center justify-center text-center py-8 px-6 select-none">
            <div className="space-y-1.5 mb-6">
              <p className="text-base font-bold text-workshop-text">Enter Security PIN</p>
              <p className="text-xs text-workshop-muted font-medium max-w-[240px] mx-auto leading-relaxed">
                Tap the PIN indicator below to open your keyboard and enter your 4-digit PIN.
              </p>
            </div>

            {/* Clickable PIN Indicator Dots with Native Numeric Input */}
            <div 
              onClick={() => pinInputRef.current?.focus()}
              className="relative flex justify-center items-center gap-4 py-6 px-8 cursor-pointer group select-none"
            >
              <input
                ref={pinInputRef}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                value={pinCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                  processPinEntry(val);
                }}
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer text-base bg-transparent"
              />
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-200 pointer-events-none",
                    pinCode.length > index 
                      ? "bg-blue-500 border-blue-400 scale-110 shadow-lg shadow-blue-500/40" 
                      : "border-workshop-border/80 bg-workshop-surface/50 group-hover:border-blue-400/60"
                  )}
                />
              ))}
            </div>

            {/* Error Message */}
            <div className="h-6 my-2 flex items-center justify-center">
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

            {/* Clear Input option */}
            {pinCode.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  handleClear();
                  pinInputRef.current?.focus();
                }}
                className="mt-2 py-2 px-4 text-xs font-bold text-workshop-muted hover:text-workshop-text uppercase tracking-widest transition-colors cursor-pointer"
              >
                Clear Input
              </button>
            )}
          </div>
        </motion.div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <motion.div
        initial={isPage ? { opacity: 0, y: 15 } : { x: "100%", opacity: 0.95 }}
        animate={isPage ? { opacity: 1, y: 0 } : { x: 0, opacity: 1 }}
        exit={isPage ? { opacity: 0, y: -10 } : { x: "100%", opacity: 0.95 }}
        transition={isPage ? { duration: 0.25, ease: [0.2, 0, 0, 1.0] } : { type: "spring", stiffness: 350, damping: 30 }}
        className={cn(
          isPage 
            ? "w-full max-w-4xl mx-auto flex flex-col text-workshop-text font-sans bg-workshop-bg h-full min-h-0" 
            : "fixed inset-0 z-[100] bg-workshop-bg flex flex-col w-full h-full overflow-hidden"
        )}
      >
        <div className="w-full flex-1 flex flex-col h-full bg-workshop-bg text-workshop-text relative overflow-hidden">
          {/* Header */}
          <div className="bg-workshop-bg text-workshop-text relative border-b border-workshop-border shrink-0">
            <div className="safe-top" />
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <ClipboardCheck className="w-6 h-6 text-workshop-accent shrink-0" />
                   <div>
                      <h2 className="text-lg md:text-xl font-black tracking-tight uppercase leading-none">Vehicle Intake</h2>
                      <p className="text-orange-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                        {authenticatedAdvisor?.name || authenticatedAdvisor?.email}
                      </p>
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
                    className="absolute left-[18px] right-[18px] z-10"
                  />
  
                  {/* Step Nodes Row */}
                  <div className="absolute inset-x-0 flex justify-between items-center z-20">
                    {[1, 2, 3].map((s) => {
                      const isCompleted = step > s && Math.floor(step) !== s;
                      const isActive = Math.floor(step) === s;
                      
                      return (
                        <div key={s} className="relative flex items-center justify-center w-9 h-9">
                          {isActive && (
                            <MdCircularProgress
                              indeterminate
                              style={{
                                position: 'absolute',
                                '--md-circular-progress-size': '38px',
                                '--md-circular-progress-active-indicator-color': 'var(--color-workshop-accent)',
                                '--md-circular-progress-active-indicator-width': '2.5px',
                                zIndex: 20,
                                pointerEvents: 'none'
                              }}
                            />
                          )}
                          <div 
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border font-bold text-xs select-none z-10",
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

                      <div className="relative flex items-center">
                        <Search className="absolute left-4 text-workshop-muted w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search anything!"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-4 py-4 rounded-xl text-base md:text-lg font-bold outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text uppercase placeholder:normal-case shadow-sm"
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
                                <p className="text-sm md:text-base font-bold text-workshop-accent uppercase leading-tight mb-0.5">
                                  {res.vehicle
                                    ? `${res.vehicle.make} ${res.vehicle.model}`
                                    : "New Vehicle Entry Needed"}
                                </p>
                                <p className="text-sm md:text-base font-bold text-workshop-text leading-tight uppercase">
                                  {res.customer.name}
                                </p>
                                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                                  <div className="flex items-center gap-1.5 text-workshop-muted">
                                    <p className="text-sm md:text-base font-bold uppercase tracking-tight">
                                      {res.customer.phone}
                                    </p>
                                  </div>
                                  {res.vehicle && (
                                    <>
                                      <div className="flex items-center gap-1.5 text-workshop-secondary">
                                        <span className="w-1.5 h-1.5 bg-workshop-border rounded-full shrink-0" />
                                        <p className="text-sm md:text-base font-bold uppercase tracking-tight">
                                          {res.vehicle.plateNumber}
                                        </p>
                                      </div>
                                      {res.vehicle.passwordOrPin && (
                                        <div className="flex items-center gap-1.5 text-status-success">
                                          <Key className="w-3.5 h-3.5 shrink-0" />
                                          <span 
                                            style={{ fontFamily: "'Google Sans', sans-serif" }}
                                            className="text-sm md:text-base font-sans font-bold uppercase tracking-tight"
                                          >
                                            {res.vehicle.passwordOrPin}
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                              <div className="text-right">
                                <span className="text-[10px] md:text-xs font-bold text-workshop-muted block uppercase tracking-tight">
                                  Last Serviced
                                </span>
                                <span className="text-xs md:text-sm font-black text-workshop-text uppercase tracking-tight">
                                  {getLastServicedDate(res.customer, res.vehicle)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-black text-workshop-muted uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">
                                  Select
                                </span>
                                <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-accent translate-x-0 group-hover:translate-x-1 transition-all" />
                              </div>
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
                          <label
                            style={{ fontFamily: "'Google Sans', sans-serif" }}
                            className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted"
                          >
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
                            <span
                              style={{ fontFamily: "'Google Sans', sans-serif" }}
                              className="absolute left-4 top-0 bg-workshop-bg px-2 text-[11px] font-black uppercase tracking-wider text-[#3B82F6] select-none"
                            >
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label
                        style={{ fontFamily: "'Google Sans', sans-serif" }}
                        className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted"
                      >
                        Manufacturer
                      </label>
                      <input
                        value={vehicleForm.make}
                        onChange={(e) =>
                          setVehicleForm({ ...vehicleForm, make: e.target.value })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                        placeholder="e.g. Ola"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        style={{ fontFamily: "'Google Sans', sans-serif" }}
                        className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5"
                      >
                        Model
                        <span className="text-status-urgent">*</span>
                      </label>
                      <input
                        value={vehicleForm.model}
                        onChange={(e) =>
                          setVehicleForm({ ...vehicleForm, model: e.target.value })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                        placeholder="e.g. S1 +"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        style={{ fontFamily: "'Google Sans', sans-serif" }}
                        className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted"
                      >
                        Registration Plate
                      </label>
                      <div className="relative">
                        <input
                          disabled={vehicleForm.plateNumber === "U/R"}
                          value={vehicleForm.plateNumber}
                          onChange={(e) =>
                            setVehicleForm({
                              ...vehicleForm,
                              plateNumber: e.target.value.replace(/\s+/g, "").toUpperCase(),
                            })
                          }
                          className={cn(
                            "w-full bg-workshop-surface border border-workshop-border pl-4 pr-16 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-mono font-bold uppercase transition-all",
                            vehicleForm.plateNumber === "U/R" ? "text-status-urgent bg-workshop-surface/40" : "text-workshop-accent"
                          )}
                          placeholder={vehicleForm.plateNumber === "U/R" ? "UNREGISTERED" : "KL01X1234"}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setVehicleForm(prev => ({
                              ...prev,
                              plateNumber: prev.plateNumber === "U/R" ? "" : "U/R"
                            }));
                          }}
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-[10px] font-sans font-black tracking-widest uppercase transition-all cursor-pointer border border-status-urgent",
                            vehicleForm.plateNumber === "U/R"
                              ? "bg-status-urgent text-white shadow-lg shadow-status-urgent/30"
                              : "bg-workshop-surface text-status-urgent hover:bg-status-urgent/10"
                          )}
                          title="Toggle Unregistered (U/R) Status"
                        >
                          U/R
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        style={{ fontFamily: "'Google Sans', sans-serif" }}
                        className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted"
                      >
                        Vehicle Colour
                      </label>
                      <input
                        value={vehicleForm.color}
                        onChange={(e) =>
                          setVehicleForm({ ...vehicleForm, color: e.target.value })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 text-workshop-text font-bold"
                        placeholder="e.g. Red"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label
                        style={{ fontFamily: "'Google Sans', sans-serif" }}
                        className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5"
                      >
                        Security
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
                            "w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-workshop-accent/30 font-sans text-workshop-text uppercase transition-all",
                            useKey && "opacity-50 font-bold"
                          )}
                          placeholder={useKey ? "" : "••••••"}
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
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-workshop-text uppercase tracking-tight">
                        Job Specification
                      </h3>
                      <p className="text-workshop-muted text-sm">
                        Define the reason for intake and current vehicle status.
                      </p>
                    </div>
                    {(() => {
                      const pinOrKey = selectedVehicle 
                        ? selectedVehicle.passwordOrPin 
                        : (useKey ? 'Key' : vehicleForm.passwordOrPin);
                      
                      if (!pinOrKey) return null;

                      const isKey = pinOrKey.toLowerCase() === 'key';

                      return (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-workshop-surface border border-workshop-border rounded-xl shadow-sm self-start shrink-0">
                          {isKey ? (
                            <>
                              <Key className="w-3.5 h-3.5 text-workshop-accent animate-pulse" />
                              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-workshop-text">
                                Key
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-workshop-accent opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-workshop-accent"></span>
                              </span>
                              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-workshop-muted">
                                PIN:
                              </span>
                              <span className="text-[11px] font-mono font-black tracking-wider text-workshop-text">
                                {pinOrKey}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        style={{ fontFamily: "'Google Sans', sans-serif" }}
                        className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted"
                      >
                        Odometer
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
                              ? "DEAD VEHICLE" 
                              : jobForm.isUnknownMileage 
                                ? "VEHICLE LOCKED" 
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
                          Vehicle Locked
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
                      <label
                        style={{ fontFamily: "'Google Sans', sans-serif" }}
                        className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted"
                      >
                        Complaints / Works
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
                      <label
                        style={{ fontFamily: "'Google Sans', sans-serif" }}
                        className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted"
                      >
                        Items inside vehicle
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
                        <label
                          style={{ fontFamily: "'Google Sans', sans-serif" }}
                          className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5"
                        >
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
                        <label
                          style={{ fontFamily: "'Google Sans', sans-serif" }}
                          className="text-[10px] font-sans font-black uppercase tracking-[0.2em] text-workshop-muted flex items-center gap-1.5"
                        >
                          Estimated Delivery Date
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
                        Issue Job Card
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="safe-bottom h-4" />
          </div>
        </div>
      </motion.div>
    </Wrapper>
  );
}

export function ServiceIntakePage() {
  const navigate = useNavigate();
  return (
    <div className="w-full max-w-4xl mx-auto py-2">
      <ServiceIntake 
        onClose={() => navigate('/')} 
        onSuccess={() => navigate('/services')} 
        isPage={true}
      />
    </div>
  );
}

