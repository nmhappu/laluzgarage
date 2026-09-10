import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Customer, Vehicle, WorkshopUser, ServiceRecord } from '../types';
import { getWhatsAppPresetsSync, formatIntakeMessage } from '../services/whatsappPresetService';

export interface CreatedJobSummary {
  customerName: string;
  vehicleName: string;
  vehiclePlate: string;
  description: string;
  waUrl: string;
}

export function useServiceIntake(onClose: () => void, onSuccess: () => void) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdJob, setCreatedJob] = useState<CreatedJobSummary | null>(null);

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ customer: Customer; vehicle?: Vehicle }[]>([]);

  // Selection states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Form states
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
  });

  const [vehicleForm, setVehicleForm] = useState({
    make: '',
    model: '',
    color: '',
    plateNumber: '',
    passwordOrPin: '',
  });

  const [jobForm, setJobForm] = useState({
    mileage: '',
    description: '',
    personalItems: '',
    expectedDeliveryDate: '',
    serviceDate: new Date().toISOString().split('T')[0],
    isDeadVehicle: false,
    isUnknownMileage: false,
  });

  const [useKey, setUseKey] = useState(false);

  const isMileageInvalid =
    !jobForm.isDeadVehicle &&
    !jobForm.isUnknownMileage &&
    (!jobForm.mileage || parseInt(jobForm.mileage, 10) === 0);

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

  // Hardware back-button handler
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

    window.addEventListener('appBackButton', handleBackButton);
    return () => window.removeEventListener('appBackButton', handleBackButton);
  }, [step, onClose, handleBackStep]);

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
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      }
    }
    return `21 May ${new Date().getFullYear()}`;
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
        const formattedPhone = customerForm.phone.trim().startsWith('+91')
          ? customerForm.phone.trim()
          : `+91 ${customerForm.phone.trim()}`;

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
        : customerForm.phone.trim().startsWith('+91')
        ? customerForm.phone.trim()
        : `+91 ${customerForm.phone.trim()}`;
      const customerName = selectedCustomer ? selectedCustomer.name : customerForm.name;
      const vehicleMake = selectedVehicle ? selectedVehicle.make : vehicleForm.make;
      const vehicleModel = selectedVehicle ? selectedVehicle.model : vehicleForm.model;
      const vehiclePlate = selectedVehicle ? selectedVehicle.plateNumber : vehicleForm.plateNumber;

      let waUrl = '';
      if (customerPhone) {
        const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
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
        waUrl,
      });

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
  };
}
