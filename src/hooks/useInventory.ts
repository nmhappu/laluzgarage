import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import type { Part } from '../types';
import { inventoryService } from '../services/inventoryService';
import { handleFirestoreError } from '../lib/firebase';
import { useResponsiveSearch } from './useResponsiveSearch';
import { useBackHandler } from '../contexts/UIContext';

export function useInventory() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { searchTerm } = useResponsiveSearch();

  const [newPart, setNewPart] = useState<Partial<Part>>({
    name: '',
    category: '',
    stockQuantity: 0,
    price: 0,
    minStockLevel: 5,
    location: ''
  });

  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);

  // Real-time parts subscription
  useEffect(() => {
    setLoading(true);
    const unsubscribe = inventoryService.subscribeToParts((updatedParts) => {
      setParts(updatedParts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Hardware & system back-button handlers
  useBackHandler(() => {
    setShowDeleteConfirm(false);
    if (partToDelete) {
      setEditingPart(partToDelete);
      setShowEditModal(true);
    }
    return true;
  }, showDeleteConfirm, 80);

  useBackHandler(() => {
    setShowEditModal(false);
    setEditingPart(null);
    return true;
  }, showEditModal, 70);

  useBackHandler(() => {
    setShowAddModal(false);
    return true;
  }, showAddModal, 70);

  const addPart = useCallback(async (partData: Partial<Part>) => {
    if (!partData.name) return;
    try {
      await inventoryService.addPart(partData);
      setShowAddModal(false);
      setNewPart({
        name: '',
        category: '',
        stockQuantity: 0,
        price: 0,
        minStockLevel: 5,
        location: ''
      });
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'create', 'parts');
    }
  }, []);

  const updatePart = useCallback(async (partId: string, partData: Partial<Part>) => {
    if (!partData.name) return;
    try {
      await inventoryService.updatePart(partId, partData);
      setShowEditModal(false);
      setEditingPart(null);
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'update', `parts/${partId}`);
    }
  }, []);

  const deletePart = useCallback(async () => {
    if (!partToDelete) return;
    try {
      await inventoryService.deletePart(partToDelete.id);
      setShowDeleteConfirm(false);
      setPartToDelete(null);
    } catch (e: unknown) {
      console.error(e);
      handleFirestoreError(e, 'delete', `parts/${partToDelete.id}`);
    }
  }, [partToDelete]);

  const deferredSearch = useDeferredValue(searchTerm);

  const filteredParts = useMemo(() => {
    const query = deferredSearch.toLowerCase().trim();
    if (!query) return parts;
    return parts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.category && p.category.toLowerCase().includes(query))
    );
  }, [parts, deferredSearch]);

  return {
    parts,
    filteredParts,
    loading,
    searchTerm,
    showAddModal,
    setShowAddModal,
    showEditModal,
    setShowEditModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    newPart,
    setNewPart,
    editingPart,
    setEditingPart,
    partToDelete,
    setPartToDelete,
    addPart,
    updatePart,
    deletePart
  };
}
