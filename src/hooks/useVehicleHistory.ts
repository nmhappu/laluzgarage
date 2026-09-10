import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, auth } from '../lib/firebase';
import type { Customer, Vehicle, ServiceRecord } from '../types';
import { useResponsiveSearch } from './useResponsiveSearch';
import { getWhatsAppPresetsSync, formatIntakeMessage } from '../services/whatsappPresetService';

export function useVehicleHistory() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedVehicleForLedger, setSelectedVehicleForLedger] = useState<Vehicle | null>(null);

  const { searchTerm } = useResponsiveSearch();

  // New Vehicle state
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle> & {
    ownerName?: string;
    ownerPhone?: string;
    createNewOwner?: boolean;
    useKey?: boolean;
  }>({
    make: '',
    model: '',
    color: '',
    plateNumber: '',
    passwordOrPin: '',
    customerId: '',
    ownerName: '',
    ownerPhone: '',
    createNewOwner: false,
    useKey: false
  });

  // Edit Vehicle state
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [vSnap, cSnap, sSnap] = await Promise.all([
        getDocs(collection(db, 'vehicles')),
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'serviceRecords'))
      ]);
      setVehicles(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
      setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      setServiceRecords(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord)));
    } catch (err) {
      console.error("Error fetching vehicles history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Back button handling
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

  // Derived rich vehicles list
  const enrichedVehicles = useMemo(() => {
    const customerMap = new Map<string, Customer>();
    customers.forEach(c => customerMap.set(c.id, c));

    // Pre-aggregate service records by vehicleId in a single pass O(S)
    const recordsMap = new Map<string, { totalSpend: number; count: number; latestDate: string; latestTime: number }>();
    for (const r of serviceRecords) {
      if (!r.vehicleId) continue;
      const current = recordsMap.get(r.vehicleId) || { totalSpend: 0, count: 0, latestDate: '', latestTime: 0 };
      current.totalSpend += r.totalCost || 0;
      current.count += 1;

      const recordTime = r.date ? new Date(r.date).getTime() : 0;
      if (recordTime > current.latestTime) {
        current.latestTime = recordTime;
        if (r.date) {
          const d = new Date(r.date);
          if (!isNaN(d.getTime())) {
            const day = d.getDate();
            const month = d.toLocaleString('en-US', { month: 'short' });
            const year = d.getFullYear();
            current.latestDate = `${day} ${month} ${year}`;
          }
        }
      }
      recordsMap.set(r.vehicleId, current);
    }

    return vehicles.map(v => {
      const owner = customerMap.get(v.customerId);
      const stats = recordsMap.get(v.id);

      return {
        ...v,
        ownerName: owner ? owner.name : 'Unknown Owner',
        ownerPhone: owner ? owner.phone : '',
        totalSpend: stats?.totalSpend || 0,
        servicesCount: stats?.count || 0,
        lastServiceDate: stats?.latestDate || 'No past entries'
      };
    });
  }, [vehicles, customers, serviceRecords]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return enrichedVehicles;
    return enrichedVehicles.filter(v => 
      v.plateNumber.toLowerCase().includes(query) ||
      (v.make || '').toLowerCase().includes(query) ||
      (v.model || '').toLowerCase().includes(query) ||
      v.ownerName.toLowerCase().includes(query) ||
      (v.ownerPhone || '').includes(query)
    );
  }, [enrichedVehicles, searchTerm]);

  // Handlers
  const handleAddVehicle = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.make || !newVehicle.model || !newVehicle.plateNumber) return;

    try {
      let customerId = newVehicle.customerId;

      // Inline customer registration
      if (newVehicle.createNewOwner && newVehicle.ownerName && newVehicle.ownerPhone) {
        const formattedPhone = newVehicle.ownerPhone.trim().startsWith('+91')
          ? newVehicle.ownerPhone.trim()
          : `+91 ${newVehicle.ownerPhone.trim()}`;

        const cDoc = await addDoc(collection(db, 'customers'), {
          name: newVehicle.ownerName,
          phone: formattedPhone,
          technicianId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        customerId = cDoc.id;
        setCustomers(prev => [{
          id: cDoc.id,
          name: newVehicle.ownerName!,
          phone: formattedPhone,
        } as Customer, ...prev]);
      }

      if (!customerId) return;

      const owner = newVehicle.createNewOwner
        ? {
            name: newVehicle.ownerName || '',
            phone: newVehicle.ownerPhone?.trim().startsWith('+91')
              ? newVehicle.ownerPhone.trim()
              : `+91 ${newVehicle.ownerPhone?.trim()}`
          }
        : customers.find(c => c.id === customerId);

      const vehicleToSave = {
        make: newVehicle.make,
        model: newVehicle.model,
        color: newVehicle.color || '',
        plateNumber: newVehicle.plateNumber.toUpperCase(),
        passwordOrPin: newVehicle.passwordOrPin,
        customerId,
        technicianId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const vDoc = await addDoc(collection(db, 'vehicles'), vehicleToSave);
      setVehicles(prev => [{ id: vDoc.id, ...vehicleToSave } as Vehicle, ...prev]);

      // Automated WhatsApp dispatch upon successful vehicle submission
      if (owner && owner.phone) {
        const cleanPhone = owner.phone.replace(/[^0-9]/g, "");
        const presets = getWhatsAppPresetsSync();
        const fullText = formatIntakeMessage(presets.intakeTemplate, {
          customerName: owner.name,
          vehicleMake: newVehicle.make,
          vehicleModel: newVehicle.model,
          vehiclePlate: newVehicle.plateNumber,
          jobDescription: 'Vehicle Registration',
        });
        const waUrl = `https://wa.me/${cleanPhone}/?text=${encodeURIComponent(fullText)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }

      setShowAddModal(false);
      
      // Reset state
      setNewVehicle({
        make: '',
        model: '',
        color: '',
        plateNumber: '',
        passwordOrPin: '',
        customerId: '',
        ownerName: '',
        ownerPhone: '',
        createNewOwner: false,
        useKey: false
      });

    } catch (err) {
      console.error(err);
      handleFirestoreError(err, 'create', 'vehicles');
    }
  }, [newVehicle, customers]);

  const handleEditVehicle = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle || !editingVehicle.make || !editingVehicle.model || !editingVehicle.plateNumber || !editingVehicle.customerId) return;

    try {
      const vRef = doc(db, 'vehicles', editingVehicle.id);
      const updatedFields = {
        make: editingVehicle.make,
        model: editingVehicle.model,
        color: editingVehicle.color || '',
        plateNumber: editingVehicle.plateNumber.toUpperCase(),
        passwordOrPin: editingVehicle.passwordOrPin,
        customerId: editingVehicle.customerId,
        updatedAt: serverTimestamp()
      };

      await updateDoc(vRef, updatedFields);

      // Optimistic state update
      setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? { ...v, ...updatedFields } : v));

      setShowEditModal(false);
      setEditingVehicle(null);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, 'update', `vehicles/${editingVehicle.id}`);
    }
  }, [editingVehicle]);

  const handleDeleteVehicle = useCallback(async () => {
    if (!vehicleToDelete) return;
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleToDelete.id));

      // Optimistic state update
      setVehicles(prev => prev.filter(v => v.id !== vehicleToDelete.id));

      setShowDeleteConfirm(false);
      setVehicleToDelete(null);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, 'delete', `vehicles/${vehicleToDelete.id}`);
    }
  }, [vehicleToDelete]);

  return {
    vehicles,
    customers,
    serviceRecords,
    enrichedVehicles,
    filteredVehicles,
    loading,
    showAddModal,
    setShowAddModal,
    showEditModal,
    setShowEditModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    selectedVehicleForLedger,
    setSelectedVehicleForLedger,
    newVehicle,
    setNewVehicle,
    editingVehicle,
    setEditingVehicle,
    vehicleToDelete,
    setVehicleToDelete,
    handleAddVehicle,
    handleEditVehicle,
    handleDeleteVehicle
  };
}
