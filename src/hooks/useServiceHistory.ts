import { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError } from "../lib/firebase";
import type { ServiceRecord, Vehicle, Customer, Part } from "../types";
import type { CompletedJobPayload } from "../components/services/DeliveryBillModal";

export function useServiceHistory(activeTab: string, deferredSearch: string) {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const rSnap = await getDocs(
        query(collection(db, "serviceRecords"), orderBy("date", "desc"))
      );
      const vSnap = await getDocs(collection(db, "vehicles"));
      const cSnap = await getDocs(collection(db, "customers"));
      const pSnap = await getDocs(collection(db, "parts"));

      setRecords(rSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceRecord));
      setVehicles(vSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Vehicle));
      setCustomers(cSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer));
      setParts(pSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Part));
    } catch (e) {
      console.error("Error fetching service history data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => {
      if (v.id) map.set(v.id, v);
    });
    return map;
  }, [vehicles]);

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => {
      if (c.id) map.set(c.id, c);
    });
    return map;
  }, [customers]);

  // Multi-field, multi-token, space-agnostic and format-tolerant search filter
  const searchMatchingRecords = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return records;

    const queryTokens = query.split(/\s+/).filter(Boolean);
    if (queryTokens.length === 0) return records;

    return records.filter((r) => {
      const vehicle = vehicleMap.get(r.vehicleId);
      const customer = customerMap.get(r.customerId);

      const plateRaw = (vehicle?.plateNumber || "").toLowerCase();
      const plateClean = plateRaw.replace(/[^a-z0-9]/g, "");

      const phoneRaw = customer?.phone || "";
      const phoneClean = phoneRaw.replace(/[^0-9]/g, "");
      const phoneCleanNoCountry = phoneClean.replace(/^91/, "");

      const vehicleText = `${vehicle?.make || ""} ${vehicle?.model || ""} ${vehicle?.color || ""}`.toLowerCase();
      const customerName = (customer?.name || "").toLowerCase();
      const pin = (vehicle?.passwordOrPin || "").toLowerCase();
      const pinClean = pin.replace(/[^a-z0-9]/g, "");

      const advisor = (r.technicianName || "").toLowerCase();
      const description = (r.description || "").toLowerCase();
      const personalItems = (r.personalItems || "").toLowerCase();
      const remarks = `${r.remarks || ""} ${r.finalRemarks || ""}`.toLowerCase();
      const partsNames = (r.partsUsed || []).map((p) => p.name.toLowerCase()).join(" ");
      const dateStr = r.date || "";

      // Check that every token matches at least one attribute of this service record
      return queryTokens.every((token) => {
        const tokenClean = token.replace(/[^a-z0-9]/g, "");
        const tokenNumeric = token.replace(/[^0-9]/g, "");

        return (
          customerName.includes(token) ||
          vehicleText.includes(token) ||
          advisor.includes(token) ||
          description.includes(token) ||
          personalItems.includes(token) ||
          remarks.includes(token) ||
          partsNames.includes(token) ||
          dateStr.includes(token) ||
          plateRaw.includes(token) ||
          (tokenClean.length >= 2 && plateClean.includes(tokenClean)) ||
          phoneRaw.includes(token) ||
          (tokenNumeric.length >= 3 &&
            (phoneClean.includes(tokenNumeric) ||
              (phoneCleanNoCountry.length > 0 && phoneCleanNoCountry.includes(tokenNumeric)))) ||
          pin.includes(token) ||
          (tokenClean.length >= 1 && pinClean.includes(tokenClean))
        );
      });
    });
  }, [records, deferredSearch, vehicleMap, customerMap]);

  // Tab counts dynamically reflect search results when a search term is present
  const tabCounts = useMemo(() => {
    const counts = { all: searchMatchingRecords.length, pending: 0, "in-progress": 0, completed: 0, cancelled: 0 };
    searchMatchingRecords.forEach((r) => {
      if (r.status === "pending") counts.pending++;
      else if (r.status === "in-progress") counts["in-progress"]++;
      else if (r.status === "completed") counts.completed++;
      else if (r.status === "cancelled") counts.cancelled++;
    });
    return counts;
  }, [searchMatchingRecords]);

  const tabs = useMemo(
    () => [
      {
        id: "all",
        label: "All Logs",
        count: tabCounts.all,
        color: "text-workshop-secondary",
        bg: "bg-workshop-secondary/20",
        border: "border-workshop-secondary/20",
      },
      {
        id: "pending",
        label: "Pending",
        count: tabCounts.pending,
        color: "text-status-urgent",
        bg: "bg-status-urgent/10",
        border: "border-status-urgent/20",
      },
      {
        id: "in-progress",
        label: "In-Progress",
        count: tabCounts["in-progress"],
        color: "text-status-pending",
        bg: "bg-status-pending/10",
        border: "border-status-pending/20",
      },
      {
        id: "completed",
        label: "Completed",
        count: tabCounts.completed,
        color: "text-workshop-accent",
        bg: "bg-workshop-accent/20",
        border: "border-workshop-accent/20",
      },
      {
        id: "cancelled",
        label: "Cancelled",
        count: tabCounts.cancelled,
        color: "text-workshop-muted",
        bg: "bg-workshop-muted/10",
        border: "border-workshop-border/30",
      },
    ],
    [tabCounts]
  );

  const filteredRecords = useMemo(() => {
    if (activeTab === "all") return searchMatchingRecords;
    return searchMatchingRecords.filter((r) => r.status === activeTab);
  }, [searchMatchingRecords, activeTab]);

  const confirmDelete = async (recordToDelete: ServiceRecord) => {
    if (!recordToDelete) return;

    try {
      await runTransaction(db, async (transaction) => {
        const recordRef = doc(db, "serviceRecords", recordToDelete.id!);
        const recordDoc = await transaction.get(recordRef);
        if (!recordDoc.exists()) return;

        const recordData = recordDoc.data() as ServiceRecord;
        const partIds = new Set((recordData.partsUsed || []).map((p) => p.partId));

        const partReads = Array.from(partIds).map((pid) =>
          transaction.get(doc(db, "parts", pid))
        );
        const partDocs = await Promise.all(partReads);

        const stockMap: Record<string, number> = {};
        partDocs.forEach((pd) => {
          if (pd.exists()) stockMap[pd.id] = pd.data().stockQuantity;
        });

        for (const usedPart of recordData.partsUsed || []) {
          const currentStock = stockMap[usedPart.partId];
          if (typeof currentStock === "number") {
            transaction.update(doc(db, "parts", usedPart.partId), {
              stockQuantity: currentStock + usedPart.quantity,
            });
          }
        }

        transaction.delete(recordRef);
      });

      await fetchData();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`Delete failed: ${errorMessage}`);
      handleFirestoreError(e, "delete", `serviceRecords/${recordToDelete.id}`);
      throw e;
    }
  };

  const handleUpdateRecord = async (
    editingRecord: ServiceRecord
  ): Promise<CompletedJobPayload | null> => {
    if (!editingRecord || isUpdating) return null;

    setIsUpdating(true);
    try {
      const partsTotal = (editingRecord.partsUsed || []).reduce(
        (acc, p) => acc + p.unitPrice * p.quantity,
        0
      );
      const totalCost = Number(editingRecord.laborCost) + partsTotal;

      await runTransaction(db, async (transaction) => {
        const recordRef = doc(db, "serviceRecords", editingRecord.id!);
        const oldRecordDoc = await transaction.get(recordRef);

        if (!oldRecordDoc.exists()) throw new Error("Record not found in database.");
        const oldRecord = oldRecordDoc.data() as ServiceRecord;

        const allPartIds = new Set<string>();
        (oldRecord.partsUsed || []).forEach((p) => allPartIds.add(p.partId));
        (editingRecord.partsUsed || []).forEach((p) => allPartIds.add(p.partId));

        const partDocsPromises = Array.from(allPartIds).map((pid) =>
          transaction.get(doc(db, "parts", pid as string))
        );
        const partDocs = await Promise.all(partDocsPromises);

        const stockMap: Record<string, number> = {};
        partDocs.forEach((pd) => {
          if (pd.exists()) stockMap[pd.id] = pd.data().stockQuantity;
        });

        const newStockLevels: Record<string, number> = { ...stockMap };

        // Revert old impact
        for (const oldPart of oldRecord.partsUsed || []) {
          if (newStockLevels[oldPart.partId] !== undefined) {
            newStockLevels[oldPart.partId] += oldPart.quantity;
          }
        }

        // Apply new impact
        for (const newPart of editingRecord.partsUsed || []) {
          if (newStockLevels[newPart.partId] === undefined) continue;
          if (newStockLevels[newPart.partId] < newPart.quantity) {
            throw new Error(
              `Insufficient stock for ${newPart.name}. Available: ${newStockLevels[newPart.partId]}`
            );
          }
          newStockLevels[newPart.partId] -= newPart.quantity;
        }

        // Write updated stocks
        for (const pid in newStockLevels) {
          transaction.update(doc(db, "parts", pid), {
            stockQuantity: newStockLevels[pid],
          });
        }

        const dataToUpdate = {
          partsUsed: editingRecord.partsUsed || [],
          description: editingRecord.description || "",
          personalItems: editingRecord.personalItems ?? "",
          remarks: editingRecord.remarks ?? "",
          finalRemarks: editingRecord.finalRemarks ?? "",
          mileage: Number(editingRecord.mileage) || 0,
          status: editingRecord.status,
          laborCost: Number(editingRecord.laborCost) || 0,
          expectedDeliveryDate: editingRecord.expectedDeliveryDate ?? "",
          isDeadVehicle: !!editingRecord.isDeadVehicle,
          isUnknownMileage: !!editingRecord.isUnknownMileage,
          completionMileage: editingRecord.completionMileage ?? 0,
        };

        transaction.update(recordRef, {
          ...dataToUpdate,
          partsCost: partsTotal,
          totalCost: totalCost,
          updatedAt: serverTimestamp(),
        });
      });

      const isCompleted = editingRecord.status === "completed";
      const currentCust = customers.find((c) => c.id === editingRecord.customerId);
      const currentVeh = vehicles.find((v) => v.id === editingRecord.vehicleId);
      const completedRecordData = {
        ...editingRecord,
        partsCost: partsTotal,
        totalCost: totalCost,
      };

      await fetchData();

      if (isCompleted) {
        return {
          record: completedRecordData,
          customer: currentCust,
          vehicle: currentVeh,
        };
      }
      return null;
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`Update failed: ${errorMessage}`);
      handleFirestoreError(e, "update", `serviceRecords/${editingRecord.id}`);
      throw e;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateDetails = async (detailsRecord: ServiceRecord) => {
    if (!detailsRecord || isUpdating) return;

    setIsUpdating(true);
    try {
      await runTransaction(db, async (transaction) => {
        const recordRef = doc(db, "serviceRecords", detailsRecord.id!);
        transaction.update(recordRef, {
          description: detailsRecord.description || "",
          personalItems: detailsRecord.personalItems ?? "",
          expectedDeliveryDate: detailsRecord.expectedDeliveryDate ?? "",
          updatedAt: serverTimestamp(),
        });
      });

      await fetchData();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`Update failed: ${errorMessage}`);
      handleFirestoreError(e, "update", `serviceRecords/${detailsRecord.id}`);
      throw e;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    records,
    vehicles,
    customers,
    parts,
    loading,
    isUpdating,
    vehicleMap,
    customerMap,
    tabCounts,
    tabs,
    filteredRecords,
    searchMatchingRecordsCount: searchMatchingRecords.length,
    isSearching: Boolean(deferredSearch.trim()),
    fetchData,
    confirmDelete,
    handleUpdateRecord,
    handleUpdateDetails,
  };
}
