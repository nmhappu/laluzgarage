import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useBackHandler } from '../contexts/UIContext';
import type { Customer, Vehicle, WorkshopUser, ServiceRecord } from '../types';
import { DEFAULT_ADVISOR_PIN } from '../lib/constants';
import { formatIndianPhone, buildWhatsAppUrl, formatDateSafe } from '../lib/utils';
import { getWhatsAppPresetsSync, formatIntakeMessage } from '../services/whatsappPresetService';

export interface CreatedJobSummary {
  customerName: string;
  vehicleName: string;
  vehiclePlate: string;
  description: string;
  waUrl: string;
}

const DRAFT_KEY = 'laluz_service_intake_draft';

function loadIntakeDraft(): any {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load intake draft:', e);
  }
  return null;
}

export function useServiceIntake(onClose: () => void, onSuccess: () => void) {
  const initialDraft = useMemo(() => loadIntakeDraft(), []);

  const [step, setStep] = useState<number>(() => initialDraft?.step || 1);
  const [loading, setLoading] = useState(false);
  const [createdJob, setCreatedJob] = useState<CreatedJobSummary | null>(null);

  const { profile, user: authUser } = useAuth();

  // Data for lookup
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<WorkshopUser[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);

  // PIN authentication states
  const [authenticatedAdvisor, setAuthenticatedAdvisor] = useState<WorkshopUser | null>(
    () => initialDraft?.authenticatedAdvisor || null
  );
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when advisor verification opens
  useEffect(() => {
    if (!authenticatedAdvisor) {
      const t = setTimeout(() => {
        pinInputRef.current?.focus();
      }, 250);
      return () => clearTimeout(t);
    }
  }, [authenticatedAdvisor]);

  const processPinEntry = useCallback((val: string) => {
    setPinCode(val);
    setPinError(null);
    if (val.length === 4) {
      const matched = users.find(u => u.pin && String(u.pin) === val) ||
        (profile && (profile.pin ? String(profile.pin) === val : val === DEFAULT_ADVISOR_PIN) ? profile : null) ||
        (users.length === 0 && val === DEFAULT_ADVISOR_PIN && authUser ? {
          id: authUser.uid,
          name: authUser.displayName || authUser.email || 'Advisor',
          email: authUser.email || '',
          status: 'online' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        } : null);
      if (matched) {
        setAuthenticatedAdvisor(matched);
        setPinCode('');
      } else {
        setPinError('Invalid advisor PIN. Please try again.');
        setPinCode('');
      }
    }
  }, [users, profile, authUser]);

  const handleClearPin = useCallback(() => {
    setPinCode('');
    setPinError(null);
  }, []);

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
  const [searchQuery, setSearchQuery] = useState(() => initialDraft?.searchQuery || '');
  const [searchResults, setSearchResults] = useState<{ customer: Customer; vehicle?: Vehicle }[]>([]);

  // Selection states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    () => initialDraft?.selectedCustomer || null
  );
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(
    () => initialDraft?.selectedVehicle || null
  );

  // Form states
  const [customerForm, setCustomerForm] = useState(
    () => initialDraft?.customerForm || { name: '', phone: '' }
  );

  const [vehicleForm, setVehicleForm] = useState(
    () =>
      initialDraft?.vehicleForm || {
        make: '',
        model: '',
        color: '',
        plateNumber: '',
        passwordOrPin: '',
      }
  );

  const [jobForm, setJobForm] = useState(
    () =>
      initialDraft?.jobForm || {
        mileage: '',
        description: '',
        personalItems: '',
        expectedDeliveryDate: '',
        serviceDate: new Date().toISOString().split('T')[0],
        isDeadVehicle: false,
        isUnknownMileage: false,
      }
  );

  const [useKey, setUseKey] = useState<boolean>(() => Boolean(initialDraft?.useKey));
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isMileageInvalid =
    !jobForm.isDeadVehicle &&
    !jobForm.isUnknownMileage &&
    (!jobForm.mileage || parseInt(jobForm.mileage, 10) === 0);

  const hasUnsavedProgress = useMemo(() => {
    if (createdJob) return false;
    if (step > 1) return true;
    if (selectedCustomer || selectedVehicle) return true;
    if (customerForm.name.trim() || customerForm.phone.replace(/^\+91\s*/, '').trim()) return true;
    if (vehicleForm.make.trim() || vehicleForm.model.trim() || vehicleForm.plateNumber.trim()) return true;
    if (jobForm.description.trim() || jobForm.mileage.trim()) return true;
    return false;
  }, [createdJob, step, selectedCustomer, selectedVehicle, customerForm, vehicleForm, jobForm]);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.error('Failed to clear intake draft:', e);
    }
  }, []);

  // Persist draft to sessionStorage
  useEffect(() => {
    if (createdJob) {
      clearDraft();
      return;
    }

    if (hasUnsavedProgress || authenticatedAdvisor) {
      try {
        const draft = {
          step,
          customerForm,
          vehicleForm,
          jobForm,
          selectedCustomer,
          selectedVehicle,
          useKey,
          searchQuery,
          authenticatedAdvisor,
        };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.error('Failed to save intake draft:', e);
      }
    }
  }, [
    createdJob,
    hasUnsavedProgress,
    step,
    customerForm,
    vehicleForm,
    jobForm,
    selectedCustomer,
    selectedVehicle,
    useKey,
    searchQuery,
    authenticatedAdvisor,
    clearDraft,
  ]);

  // Prompt before closing window/tab if unsaved progress exists
  useEffect(() => {
    if (!hasUnsavedProgress) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedProgress]);

  const handleRequestClose = useCallback(() => {
    if (hasUnsavedProgress) {
      setShowDiscardConfirm(true);
    } else {
      clearDraft();
      onClose();
    }
  }, [hasUnsavedProgress, clearDraft, onClose]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    clearDraft();
    onClose();
  }, [clearDraft, onClose]);

  const handleCancelDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
  }, []);

  const handleBackStep = useCallback(() => {
    if (step === 3 && selectedVehicle) {
      setSelectedVehicle(null);
      setSelectedCustomer(null);
      setStep(1);
    } else {
      setStep((prev) => {
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
  }, [step, selectedVehicle, selectedCustomer]);

  // Back navigation: Discard confirmation modal (priority 80)
  useBackHandler(() => {
    setShowDiscardConfirm(false);
    return true;
  }, showDiscardConfirm, 80);

  // Back navigation: Success modal (highest priority in intake)
  useBackHandler(() => {
    setCreatedJob(null);
    clearDraft();
    onClose();
    return true;
  }, Boolean(createdJob), 70);

  // Back navigation: Multi-step wizard progression
  useBackHandler(() => {
    if (step > 1) {
      handleBackStep();
      return true;
    }
    if (hasUnsavedProgress) {
      setShowDiscardConfirm(true);
      return true;
    }
    clearDraft();
    onClose();
    return true;
  }, !createdJob && !showDiscardConfirm, 35);

  // Fetch initial lookup records
  useEffect(() => {
    const fetchBasics = async () => {
      try {
        const vSnap = await getDocs(collection(db, 'vehicles'));
        const cSnap = await getDocs(collection(db, 'customers'));
        const uSnap = await getDocs(collection(db, 'users'));
        const rSnap = await getDocs(collection(db, 'serviceRecords'));
        setVehicles(vSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle)));
        setCustomers(cSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)));
        setUsers(uSnap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkshopUser)));
        setRecords(rSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord)));
      } catch (err) {
        console.error('Error fetching intake initial data:', err);
      }
    };
    fetchBasics();
  }, []);

  const latestDatesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) {
      if (!r.date) continue;
      const rTime = new Date(r.date).getTime();
      if (isNaN(rTime)) continue;

      if (r.vehicleId) {
        const prev = map.get(`v_${r.vehicleId}`);
        const prevTime = prev ? new Date(prev).getTime() : 0;
        if (rTime > prevTime) {
          map.set(`v_${r.vehicleId}`, r.date);
        }
      }

      if (r.customerId) {
        const prev = map.get(`c_${r.customerId}`);
        const prevTime = prev ? new Date(prev).getTime() : 0;
        if (rTime > prevTime) {
          map.set(`c_${r.customerId}`, r.date);
        }
      }
    }
    return map;
  }, [records]);

  const getLastServicedDate = useCallback((customer: Customer, vehicle?: Vehicle) => {
    const dateStr = (vehicle && latestDatesMap.get(`v_${vehicle.id}`)) || latestDatesMap.get(`c_${customer.id}`);
    if (dateStr) {
      return formatDateSafe(dateStr, 'dd MMM yyyy', 'No past entries');
    }
    return 'No past entries';
  }, [latestDatesMap]);

  // Real-time lookup with 150ms debounce and Map indexing
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const handler = setTimeout(() => {
      const qClean = q.replace(/\s+/g, '');
      const resultsMap = new Map<string, { customer: Customer; vehicle?: Vehicle }>();

      const customerMap = new Map<string, Customer>();
      customers.forEach(c => customerMap.set(c.id, c));

      const vehiclesByCustomer = new Map<string, Vehicle[]>();
      vehicles.forEach(v => {
        const list = vehiclesByCustomer.get(v.customerId) || [];
        list.push(v);
        vehiclesByCustomer.set(v.customerId, list);
      });

      // Search in vehicles (plate, make, model, color, pin/password)
      for (const v of vehicles) {
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
          const customer = customerMap.get(v.customerId);
          if (customer) {
            const key = `${customer.id}_${v.id}`;
            resultsMap.set(key, { customer, vehicle: v });
          }
        }
      }

      // Search in customers (name, phone)
      for (const c of customers) {
        const name = (c.name || '').toLowerCase();
        const phone = (c.phone || '').replace(/\s/g, '');

        const isMatch = name.includes(q) || phone.includes(qClean) || (c.phone || '').includes(q);

        if (isMatch) {
          const cVehicles = vehiclesByCustomer.get(c.id) || [];
          if (cVehicles.length > 0) {
            cVehicles.forEach((v) => {
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
      }

      setSearchResults(Array.from(resultsMap.values()));
    }, 150);

    return () => clearTimeout(handler);
  }, [searchQuery, vehicles, customers]);

  const handleSelectResult = useCallback((customer: Customer, vehicle?: Vehicle) => {
    setSelectedCustomer(customer);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      setStep(3);
    } else {
      setSelectedVehicle(null);
      setStep(2);
    }
  }, []);

  const handleCreateNewCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setStep(1.5);
  }, []);

  const handleSubmitIntake = useCallback(async () => {
    setLoading(true);
    try {
      let customerId = selectedCustomer?.id;
      let vehicleId = selectedVehicle?.id;

      // 1. Create Customer if needed
      if (!selectedCustomer) {
        const formattedPhone = formatIndianPhone(customerForm.phone);

        const cDoc = await addDoc(collection(db, 'customers'), {
          name: customerForm.name,
          phone: formattedPhone,
          technicianId: authenticatedAdvisor?.id || auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
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
          updatedAt: serverTimestamp(),
        });
        vehicleId = vDoc.id;
      }

      // 3. Create Service Record (Job Card)
      await addDoc(collection(db, 'serviceRecords'), {
        vehicleId,
        customerId,
        technicianId: authenticatedAdvisor?.id || auth.currentUser?.uid,
        technicianName:
          authenticatedAdvisor?.name ||
          authenticatedAdvisor?.email ||
          auth.currentUser?.displayName ||
          auth.currentUser?.email ||
          'Unknown Advisor',
        date: jobForm.serviceDate + 'T' + new Date().toISOString().split('T')[1],
        expectedDeliveryDate: jobForm.expectedDeliveryDate,
        mileage:
          jobForm.isDeadVehicle || jobForm.isUnknownMileage
            ? 0
            : Number(jobForm.mileage || 0),
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
        updatedAt: serverTimestamp(),
      });

      // Automated WhatsApp dispatch upon successful registration
      const customerPhone = selectedCustomer
        ? selectedCustomer.phone
        : formatIndianPhone(customerForm.phone);
      const customerName = selectedCustomer ? selectedCustomer.name : customerForm.name;
      const vehicleMake = selectedVehicle ? selectedVehicle.make : vehicleForm.make;
      const vehicleModel = selectedVehicle ? selectedVehicle.model : vehicleForm.model;
      const vehiclePlate = selectedVehicle ? selectedVehicle.plateNumber : vehicleForm.plateNumber;

      let waUrl = '';
      if (customerPhone) {
        const presets = getWhatsAppPresetsSync();
        const fullText = formatIntakeMessage(presets.intakeTemplate, {
          customerName,
          vehicleMake,
          vehicleModel,
          vehiclePlate,
          jobDescription: jobForm.description,
        });
        waUrl = buildWhatsAppUrl(customerPhone, fullText);
      }

      setCreatedJob({
        customerName: customerName || 'Customer',
        vehicleName: `${vehicleMake || ''} ${vehicleModel || ''}`.trim() || 'Vehicle',
        vehiclePlate: vehiclePlate || '',
        description: jobForm.description || 'Service Maintenance',
        waUrl,
      });

      clearDraft();
      onSuccess();
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'create', 'intake_flow');
    } finally {
      setLoading(false);
    }
  }, [
    selectedCustomer,
    selectedVehicle,
    customerForm,
    vehicleForm,
    jobForm,
    authenticatedAdvisor,
    useKey,
    clearDraft,
    onSuccess,
  ]);

  return {
    step,
    setStep,
    loading,
    createdJob,
    setCreatedJob,
    authenticatedAdvisor,
    pinCode,
    pinError,
    pinInputRef,
    processPinEntry,
    handleClearPin,
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedCustomer,
    selectedVehicle,
    customerForm,
    setCustomerForm,
    vehicleForm,
    setVehicleForm,
    jobForm,
    setJobForm,
    useKey,
    setUseKey,
    isMileageInvalid,
    handleBackStep,
    handleSelectResult,
    handleCreateNewCustomer,
    handleSubmitIntake,
    getLastServicedDate,
    showDiscardConfirm,
    hasUnsavedProgress,
    handleRequestClose,
    handleConfirmDiscard,
    handleCancelDiscard,
    clearDraft,
  };
}
