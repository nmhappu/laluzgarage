import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, auth } from "../lib/firebase";
import {
  Search,
  User,
  ScanHeart,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  ArrowRight,
  RefreshCw,
  Phone,
  Key,
  X,
  AlertTriangle,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ServiceRecord, Vehicle, Customer, Part } from "../types";
import { formatCurrency, cn } from "../lib/utils";
import { Portal } from "./Portal";
import {
  format,
  differenceInDays,
  isAfter,
  parseISO,
  isSameDay,
  startOfDay,
} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/CustomSelect";

export function ServiceHistory() {
  // --- State: Core Data ---
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- State: UI Control ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "in-progress" | "completed" | "cancelled"
  >("all");
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(
    null,
  );
  const [detailsRecord, setDetailsRecord] = useState<ServiceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<ServiceRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // --- State: Search & Lookup Flow ---
  const [lookupStep, setLookupStep] = useState<"search" | "form">("search");
  const [searchType, setSearchType] = useState<"plate" | "phone">("plate");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { customer: Customer; vehicle?: Vehicle }[]
  >([]);
  const [searchLogs, setSearchLogs] = useState("");

  const tabs = [
    {
      id: "all",
      label: "All Logs",
      count: records.length,
      color: "text-blue-500",
      bg: "bg-blue-500/20",
      border: "border-blue-500/20",
    },
    {
      id: "pending",
      label: "Pending",
      count: records.filter((r) => r.status === "pending").length,
      color: "text-status-urgent",
      bg: "bg-status-urgent/10",
      border: "border-status-urgent/20",
    },
    {
      id: "in-progress",
      label: "In-Progress",
      count: records.filter((r) => r.status === "in-progress").length,
      color: "text-status-pending",
      bg: "bg-status-pending/10",
      border: "border-status-pending/20",
    },
    {
      id: "completed",
      label: "Completed",
      count: records.filter((r) => r.status === "completed").length,
      color: "text-workshop-accent",
      bg: "bg-workshop-accent/20",
      border: "border-workshop-accent/20",
    },
    {
      id: "cancelled",
      label: "Cancelled",
      count: records.filter((r) => r.status === "cancelled").length,
      color: "text-workshop-muted",
      bg: "bg-workshop-muted/10",
      border: "border-workshop-border/30",
    },
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  const [newRecord, setNewRecord] = useState<Partial<ServiceRecord>>({
    vehicleId: "",
    description: "",
    personalItems: "",
    remarks: "",
    finalRemarks: "",
    mileage: 0,
    status: "pending",
    laborCost: 0,
    expectedDeliveryDate: "",
    date: new Date().toISOString().split("T")[0],
    isDeadVehicle: false,
    partsUsed: [],
  });

  // --- Effects: Handlers & External Events ---
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleBackButton = (e: Event) => {
      if (editingRecord) {
        setEditingRecord(null);
        e.preventDefault();
      } else if (detailsRecord) {
        setDetailsRecord(null);
        e.preventDefault();
      } else if (showAddModal) {
        if (lookupStep === "form") {
          setLookupStep("search");
          e.preventDefault();
        } else {
          setShowAddModal(false);
          e.preventDefault();
        }
      }
    };

    window.addEventListener("appBackButton", handleBackButton);
    return () => window.removeEventListener("appBackButton", handleBackButton);
  }, [editingRecord, showAddModal, lookupStep, detailsRecord]);

  // --- Data Fetching ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const rSnap = await getDocs(
        query(collection(db, "serviceRecords"), orderBy("date", "desc")),
      );
      const vSnap = await getDocs(collection(db, "vehicles"));
      const cSnap = await getDocs(collection(db, "customers"));
      const pSnap = await getDocs(collection(db, "parts"));

      setRecords(
        rSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as ServiceRecord,
        ),
      );
      setVehicles(
        vSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Vehicle),
      );
      setCustomers(
        cSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Customer),
      );
      setParts(
        pSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Part),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Real-time lookup
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      return;
    }

    if (searchType === "plate") {
      const filteredVehicles = vehicles.filter((v) =>
        v.plateNumber.toLowerCase().includes(q),
      );

      const results = filteredVehicles
        .map((v) => ({
          vehicle: v,
          customer: customers.find((c) => c.id === v.customerId)!,
        }))
        .filter((r) => r.customer);
      setSearchResults(results);
    } else {
      const filteredCustomers = customers.filter(
        (c) =>
          c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
          c.name.toLowerCase().includes(q),
      );

      const results: { customer: Customer; vehicle?: Vehicle }[] = [];
      filteredCustomers.forEach((c) => {
        const cVehicles = vehicles.filter((v) => v.customerId === c.id);
        if (cVehicles.length > 0) {
          cVehicles.forEach((v) => results.push({ customer: c, vehicle: v }));
        } else {
          results.push({ customer: c });
        }
      });
      setSearchResults(results);
    }
  }, [searchQuery, searchType, vehicles, customers]);

  const handleSelectResult = (customer: Customer, vehicle?: Vehicle) => {
    if (vehicle) {
      setNewRecord({ ...newRecord, vehicleId: vehicle.id });
      setLookupStep("form");
    } else {
      // Just Move to form, the vehicle select will be available and filtered by customer if we added that logic,
      // but for now we follow the existing pattern where they pick vehicle in form
      setNewRecord({ ...newRecord, vehicleId: "" });
      setLookupStep("form");
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.vehicleId || !newRecord.description) return;

    const vehicle = vehicles.find((v) => v.id === newRecord.vehicleId);
    if (!vehicle) return;

    try {
      // Calculate total costs
      const partsTotal = (newRecord.partsUsed || []).reduce(
        (acc, p) => acc + p.unitPrice * p.quantity,
        0,
      );
      const totalCost = Number(newRecord.laborCost) + partsTotal;

      await runTransaction(db, async (transaction) => {
        // 1. Gather all READS first
        const uniquePartIds = Array.from(
          new Set((newRecord.partsUsed || []).map((p) => p.partId)),
        ) as string[];
        const partReads = uniquePartIds.map((pid) =>
          transaction.get(doc(db, "parts", pid)),
        );

        const partDocs = await Promise.all(partReads);
        const partDataMap: Record<string, number> = {};

        partDocs.forEach((pd) => {
          if (pd.exists()) {
            partDataMap[pd.id] = pd.data().stockQuantity;
          }
        });

        // 2. Perform all WRITES last
        const recordRef = doc(collection(db, "serviceRecords"));
        transaction.set(recordRef, {
          vehicleId: newRecord.vehicleId,
          description: newRecord.description || "",
          remarks: newRecord.remarks ?? "",
          finalRemarks: newRecord.finalRemarks ?? "",
          mileage: Number(newRecord.mileage) || 0,
          status: newRecord.status || "pending",
          laborCost: Number(newRecord.laborCost) || 0,
          expectedDeliveryDate: newRecord.expectedDeliveryDate ?? "",
          date: newRecord.date || (new Date().toISOString().split("T")[0] + "T" + new Date().toISOString().split("T")[1]),
          isDeadVehicle: !!newRecord.isDeadVehicle,
          partsUsed: newRecord.partsUsed || [],
          technicianId: auth.currentUser?.uid || "unknown",
          technicianName:
            auth.currentUser?.displayName ||
            auth.currentUser?.email ||
            "Unknown Advisor",
          customerId: vehicle.customerId,
          partsCost: partsTotal,
          totalCost: totalCost,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        for (const usedPart of newRecord.partsUsed || []) {
          const currentStock = partDataMap[usedPart.partId];
          if (typeof currentStock === "number") {
            transaction.update(doc(db, "parts", usedPart.partId), {
              stockQuantity: currentStock - usedPart.quantity,
            });
          }
        }
      });

      setShowAddModal(false);
      setNewRecord({
        vehicleId: "",
        description: "",
        remarks: "",
        finalRemarks: "",
        mileage: 0,
        status: "pending",
        laborCost: 0,
        partsUsed: [],
        date: new Date().toISOString().split("T")[0],
      });
      setLookupStep("search");
      setSearchType("plate");
      setSearchQuery("");
      // No searchError anymore
      fetchData();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`Job Card creation failed: ${errorMessage}`);
      handleFirestoreError(e, "create", "serviceRecords");
    }
  };

  const handleDeleteRecord = (record: ServiceRecord) => {
    setRecordToDelete(record);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    
    try {
      await runTransaction(db, async (transaction) => {
        // ... reads
        const recordRef = doc(db, "serviceRecords", recordToDelete.id!);
        const recordDoc = await transaction.get(recordRef);
        if (!recordDoc.exists()) return;

        const recordData = recordDoc.data() as ServiceRecord;
        const partIds = new Set(
          (recordData.partsUsed || []).map((p) => p.partId),
        );

        const partReads = Array.from(partIds).map((pid) =>
          transaction.get(doc(db, "parts", pid)),
        );
        const partDocs = await Promise.all(partReads);

        const stockMap: Record<string, number> = {};
        partDocs.forEach((pd) => {
          if (pd.exists()) stockMap[pd.id] = pd.data().stockQuantity;
        });

        // 2. WRITES
        // Revert parts
        for (const usedPart of recordData.partsUsed || []) {
          const currentStock = stockMap[usedPart.partId];
          if (typeof currentStock === "number") {
            transaction.update(doc(db, "parts", usedPart.partId), {
              stockQuantity: currentStock + usedPart.quantity,
            });
          }
        }

        // Delete record
        transaction.delete(recordRef);
      });

      setRecordToDelete(null);
      fetchData();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`Delete failed: ${errorMessage}`);
      handleFirestoreError(e, "delete", `serviceRecords/${recordToDelete.id}`);
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || isUpdating) return;

    setIsUpdating(true);
    try {
      const partsTotal = (editingRecord.partsUsed || []).reduce(
        (acc, p) => acc + p.unitPrice * p.quantity,
        0,
      );
      const totalCost = Number(editingRecord.laborCost) + partsTotal;

      await runTransaction(db, async (transaction) => {
        const recordRef = doc(db, "serviceRecords", editingRecord.id!);
        const oldRecordDoc = await transaction.get(recordRef);

        if (!oldRecordDoc.exists())
          throw new Error("Record not found in database.");
        const oldRecord = oldRecordDoc.data() as ServiceRecord;

        const allPartIds = new Set<string>();
        (oldRecord.partsUsed || []).forEach((p) => allPartIds.add(p.partId));
        (editingRecord.partsUsed || []).forEach((p) =>
          allPartIds.add(p.partId),
        );

        const partDocsPromises = Array.from(allPartIds).map((pid) =>
          transaction.get(doc(db, "parts", pid as string)),
        );
        const partDocs = await Promise.all(partDocsPromises);

        const stockMap: Record<string, number> = {};
        partDocs.forEach((pd) => {
          if (pd.exists()) stockMap[pd.id] = pd.data().stockQuantity;
        });

        // 2. LOGIC (Local calculations)
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
              `Insufficient stock for ${newPart.name}. Available: ${newStockLevels[newPart.partId]}`,
            );
          }
          newStockLevels[newPart.partId] -= newPart.quantity;
        }

        // 3. EXECUTE ALL WRITES
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
          completionMileage: editingRecord.completionMileage ?? 0,
        };

        transaction.update(recordRef, {
          ...dataToUpdate,
          partsCost: partsTotal,
          totalCost: totalCost,
          updatedAt: serverTimestamp(),
        });
      });

      setEditingRecord(null);
      await fetchData();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`Update failed: ${errorMessage}`);
      handleFirestoreError(e, "update", `serviceRecords/${editingRecord.id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
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

      setDetailsRecord(null);
      await fetchData();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`Update failed: ${errorMessage}`);
      handleFirestoreError(e, "update", `serviceRecords/${detailsRecord.id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const parseTasks = (description: string) => {
    if (!description) return [];
    return description.split("\n").filter(line => line.trim() !== "").map(line => {
      const isCompleted = line.startsWith("[x] ");
      const text = isCompleted ? line.substring(4) : (line.startsWith("[ ] ") ? line.substring(4) : line);
      return { text, completed: isCompleted };
    });
  };

  const stringifyTasks = (tasks: { text: string; completed: boolean }[]) => {
    return tasks.map(t => `${t.completed ? "[x]" : "[ ]"} ${t.text}`).join("\n");
  };

  const toggleTask = (index: number) => {
    if (!editingRecord) return;
    const tasks = parseTasks(editingRecord.description);
    if (tasks[index]) {
      tasks[index].completed = !tasks[index].completed;
      setEditingRecord({
        ...editingRecord,
        description: stringifyTasks(tasks)
      });
    }
  };

  const addPartToEditingRecord = (partId: string) => {
    if (!editingRecord) return;
    const part = parts.find((p) => p.id === partId);
    if (!part) return;

    const existing = editingRecord.partsUsed?.find((p) => p.partId === partId);
    if (existing) {
      setEditingRecord({
        ...editingRecord,
        partsUsed: editingRecord.partsUsed?.map((p) =>
          p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p,
        ),
      });
    } else {
      setEditingRecord({
        ...editingRecord,
        partsUsed: [
          ...(editingRecord.partsUsed || []),
          {
            partId: part.id as string,
            name: part.name,
            quantity: 1,
            unitPrice: part.price,
          },
        ],
      });
    }
  };

  const getVehicleInfo = (id: string) => vehicles.find((v) => v.id === id);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Status Tab Filter
      const matchesTab =
        activeTab === "all" ||
        searchLogs.trim() !== "" ||
        (activeTab === "pending" && r.status === "pending") ||
        (activeTab === "in-progress" && r.status === "in-progress") ||
        (activeTab === "completed" && r.status === "completed") ||
        (activeTab === "cancelled" && r.status === "cancelled");

      if (!matchesTab) return false;

      // Search Filter
      if (!searchLogs.trim()) return true;

      const query = searchLogs.toLowerCase();
      const vehicle = getVehicleInfo(r.vehicleId);
      const customer = customers.find((c) => c.id === r.customerId);

      const vehicleName = `${vehicle?.make} ${vehicle?.model}`.toLowerCase();
      const plateNumber = vehicle?.plateNumber?.toLowerCase() || "";
      const customerName = customer?.name?.toLowerCase() || "";
      const vehicleColor = vehicle?.color?.toLowerCase() || "";

      return (
        vehicleName.includes(query) ||
        plateNumber.includes(query) ||
        customerName.includes(query) ||
        vehicleColor.includes(query)
      );
    });
  }, [records, activeTab, searchLogs, vehicles, customers]);
  const getCustomerName = (id: string) =>
    customers.find((c) => c.id === id)?.name || "Unknown";

  const addPartToRecord = (partId: string) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;

    const existing = newRecord.partsUsed?.find((p) => p.partId === partId);
    if (existing) {
      setNewRecord({
        ...newRecord,
        partsUsed: newRecord.partsUsed?.map((p) =>
          p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p,
        ),
      });
    } else {
      setNewRecord({
        ...newRecord,
        partsUsed: [
          ...(newRecord.partsUsed || []),
          {
            partId: part.id as string,
            name: part.name,
            quantity: 1,
            unitPrice: part.price,
          },
        ],
      });
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-workshop-text tracking-tight uppercase">
            Service History
          </h1>
          <p className="text-workshop-muted text-sm">
            Track and manage vehicle maintenance history.
          </p>
        </div>
      </header>

      {/* Status Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="w-full md:w-auto flex justify-center md:justify-start">
          <div className="relative w-full md:w-64">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={cn(
                "w-full flex items-center justify-between px-5 py-4 bg-workshop-surface border border-workshop-border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm hover:border-workshop-accent/30 group",
                isFilterDropdownOpen &&
                  "ring-2 ring-workshop-accent/10 border-workshop-accent/30",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    currentTab.color.replace("text-", "bg-"),
                  )}
                />
                <span className="text-workshop-text">{currentTab.label}</span>
                {currentTab.count > 0 && (
                  <span className="text-workshop-muted opacity-50 ml-1 font-sans text-sm">
                    {currentTab.count}
                  </span>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-workshop-muted transition-transform duration-300",
                  isFilterDropdownOpen ? "rotate-180" : "rotate-0",
                )}
              />
            </button>

            <AnimatePresence>
              {isFilterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsFilterDropdownOpen(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 4, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute z-50 top-full left-0 right-0 bg-workshop-card border border-workshop-border rounded-xl shadow-2xl overflow-hidden py-2"
                  >
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(
                            tab.id as
                              | "all"
                              | "pending"
                              | "in-progress"
                              | "completed",
                          );
                          setIsFilterDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-workshop-surface text-left",
                          activeTab === tab.id
                            ? tab.color
                            : "text-workshop-muted",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full ring-4 ring-offset-0",
                              tab.color.replace("text-", "bg-"),
                              activeTab === tab.id
                                ? "ring-workshop-accent/10"
                                : "ring-transparent",
                            )}
                          />
                          <span>{tab.label}</span>
                        </div>
                        <span className="text-sm font-black font-sans opacity-40 tabular-nums">
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="relative w-full md:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-workshop-muted transition-colors group-focus-within:text-workshop-accent" />
          </div>
          <input
            type="text"
            placeholder="Search vehicle, owner or plate..."
            value={searchLogs}
            onChange={(e) => setSearchLogs(e.target.value)}
            className={cn(
              "w-full bg-workshop-surface border border-workshop-border pl-11 pr-10 py-3 rounded-xl text-xs font-bold text-workshop-text focus:border-workshop-accent focus:ring-4 focus:ring-workshop-accent/10 outline-none transition-all placeholder:text-workshop-muted/50 uppercase tracking-tight",
              searchLogs && "bg-workshop-accent/5 border-workshop-accent/20",
            )}
          />
          {searchLogs && (
            <button
              onClick={() => setSearchLogs("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-workshop-muted hover:text-status-urgent transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-skeletons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="bg-workshop-card rounded-xl border border-workshop-border shadow-sm overflow-hidden p-6 animate-pulse"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-6 bg-workshop-surface rounded opacity-40" />
                    <div className="flex-1 h-px bg-workshop-border opacity-40" />
                    <div className="w-20 h-6 bg-workshop-surface rounded opacity-40" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-5 bg-workshop-surface rounded w-1/3 opacity-40" />
                    <div className="h-4 bg-workshop-surface rounded w-1/2 opacity-40" />
                    <div className="h-20 bg-workshop-surface rounded w-full opacity-20" />
                  </div>
                  <div className="mt-6 pt-4 border-t border-workshop-border flex justify-between">
                    <div className="h-8 bg-workshop-surface rounded w-24 opacity-40" />
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-workshop-surface rounded opacity-40" />
                      <div className="h-8 w-8 bg-workshop-surface rounded opacity-40" />
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : filteredRecords.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 text-workshop-muted text-sm italic"
            >
              {searchLogs
                ? "No records match your search criteria."
                : `No ${activeTab === "all" ? "" : activeTab} records found in the logbook.`}
            </motion.div>
          ) : (
            <motion.div
              key="records-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {filteredRecords.map((record) => {
                const v = getVehicleInfo(record.vehicleId);
                const customer = customers.find(
                  (c) => c.id === record.customerId,
                );
                return (
                  <motion.div
                    key={record.id}
                    onClick={() => setEditingRecord({ ...record })}
                    className={cn(
                      "relative bg-workshop-card rounded-xl border border-workshop-border shadow-sm overflow-hidden transition-all group cursor-pointer bg-clip-padding",
                      record.status === "completed"
                        ? "hover:border-workshop-accent/50"
                        : record.status === "in-progress"
                          ? "hover:border-status-pending/50"
                          : "hover:border-status-urgent/50",
                    )}
                  >
                    {/* Status Accent (Top Mid Fading) */}
                    <div
                      className={cn(
                        "absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[2px] pointer-events-none z-20 transition-all duration-300 opacity-40 group-hover:opacity-100",
                        record.status === "completed"
                          ? "bg-gradient-to-r from-transparent via-status-success to-transparent"
                          : record.status === "in-progress"
                            ? "bg-gradient-to-r from-transparent via-status-pending to-transparent"
                            : record.status === "cancelled"
                              ? "bg-gradient-to-r from-transparent via-workshop-muted to-transparent"
                              : "bg-gradient-to-r from-transparent via-status-urgent to-transparent",
                      )}
                    />

                    {v?.make?.toUpperCase() === "OLA" && (
                      <div className="absolute inset-y-0 left-0 w-1/2 pointer-events-none opacity-[0.03] overflow-hidden grayscale brightness-200">
                        <img
                          src="https://logos-world.net/wp-content/uploads/2023/11/Ola-Logo.png"
                          alt="OLA Background"
                          className="h-full w-full object-contain object-left scale-150 -translate-x-1/4"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="relative z-10 pt-5 pb-5 px-4 md:pt-6 md:pb-6 md:px-5 flex flex-col gap-3">
                      <div className="flex items-center gap-4 mb-1">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-black text-workshop-muted uppercase tracking-widest">
                            {format(new Date(record.date), "MMM")}
                          </span>
                          <span className="text-xl font-black text-workshop-text tracking-tighter">
                            {format(new Date(record.date), "dd")}
                          </span>
                        </div>
                        <div className="flex-1 h-px bg-workshop-border" />
                        <span
                          className={cn(
                            "px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border",
                            record.status === "completed"
                              ? "bg-status-success/10 text-status-success border-status-success/20"
                              : record.status === "in-progress"
                                ? "bg-status-pending/10 text-status-pending border-status-pending/20"
                                : record.status === "cancelled"
                                  ? "bg-workshop-muted/10 text-workshop-muted border-workshop-border"
                                  : "bg-status-urgent/10 text-status-urgent border-status-urgent/20",
                          )}
                        >
                          {record.status}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-col gap-1">
                            <div className="text-workshop-text text-sm md:text-[15px] font-black uppercase tracking-tight">
                              {getCustomerName(record.customerId)}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs md:text-sm font-bold uppercase tracking-tight opacity-70">
                              <span className="text-workshop-text">
                                {v?.make} {v?.model}
                              </span>
                              <span className="text-workshop-muted opacity-30">
                                |
                              </span>
                              <span className="text-workshop-secondary">
                                {v?.plateNumber}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs md:text-sm font-bold uppercase tracking-tight">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={cn(
                                    "font-mono whitespace-nowrap pr-1 shrink-0",
                                    record.isDeadVehicle
                                      ? "text-status-urgent italic opacity-80"
                                      : "text-status-pending",
                                  )}
                                >
                                  {record.isDeadVehicle
                                    ? "DEAD"
                                    : `${record.mileage.toLocaleString()} KM`}
                                </span>
                                {record.completionMileage && (
                                  <>
                                    <ArrowRight className="w-2 h-2 text-workshop-muted opacity-30 shrink-0" />
                                    <span className="text-status-success font-mono whitespace-nowrap shrink-0">
                                      {record.completionMileage.toLocaleString()} KM
                                    </span>
                                  </>
                                )}
                              </div>

                              {v?.passwordOrPin && (
                                <div className="flex items-center gap-1.5 text-status-success bg-status-success/5 px-2 py-0.5 rounded border border-status-success/10 shrink-0">
                                  {v.passwordOrPin.toLowerCase() === "key" ? (
                                    <>
                                      <Key className="w-3 h-3" />
                                      <span className="text-[10px] font-black tracking-[0.15em]">
                                        KEY
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-mono font-black text-xs tracking-wider">
                                      # {v.passwordOrPin}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-workshop-surface/30 rounded-lg p-2.5 border border-workshop-border/20">
                          <div className="text-workshop-text/90 text-[10px] md:text-xs font-bold tracking-tight whitespace-pre-wrap italic leading-relaxed">
                            {record.description.split("\n").map((line, i) => {
                              const cleanLine = line.replace(/^\[[x ]\]\s*/, "");
                              return cleanLine ? (
                                <div key={i} className="flex items-start gap-1">
                                  <span className="opacity-40">•</span>
                                  <span>{cleanLine}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>

                        {record.personalItems && (
                          <div className="w-full bg-status-success/5 rounded-lg p-2 border border-status-success/10 flex items-center gap-2">
                             <Package className="w-3 h-3 text-status-success shrink-0" />
                             <div className="flex items-center gap-1.5 flex-1 min-w-0">
                               <span className="text-[8px] font-black uppercase text-status-success/70 tracking-widest shrink-0">Personal Items:</span>
                               <p className="text-[10px] text-workshop-text/80 font-bold leading-tight whitespace-pre-line">{record.personalItems}</p>
                             </div>
                          </div>
                        )}

                        {record.finalRemarks && (
                          <div className="w-full bg-status-pending/10 rounded-lg p-2.5 border border-status-pending/20">
                            <p className="text-status-pending/90 text-[10px] md:text-xs font-bold tracking-tight whitespace-pre-wrap italic">
                              "{record.finalRemarks}"
                            </p>
                          </div>
                        )}
                      </div>

                      {record.expectedDeliveryDate &&
                        record.status !== "completed" &&
                        (() => {
                          const dueDate = parseISO(record.expectedDeliveryDate);
                          const today = startOfDay(new Date());
                          const normalizedDueDate = startOfDay(dueDate);
                          const isToday = isSameDay(normalizedDueDate, today);
                          const isPast = isAfter(today, normalizedDueDate);
                          const diff = Math.abs(
                            differenceInDays(normalizedDueDate, today),
                          );

                          return (
                            <div className="flex items-center gap-4 px-1 -mb-1">
                              <div className="flex items-center gap-1.5 text-workshop-muted/90">
                                <ScanHeart className="w-2.5 h-2.5 opacity-60 text-workshop-accent" />
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                  Due: {format(dueDate, "dd MMM")}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-widest leading-none",
                                  isToday
                                    ? "text-workshop-warning"
                                    : isPast
                                  ? "text-status-urgent"
                                      : "text-workshop-accent",
                                )}
                              >
                                {isToday
                                  ? "Due Today"
                                  : isPast
                                    ? `${diff} Days Overdue`
                                    : `${diff} Days Left`}
                              </div>
                            </div>
                          );
                        })()}

                      <div className="flex items-center justify-between gap-4 pt-1 mb-1 px-1">
                        {record.technicianName && (
                          <div className="flex items-center gap-2 text-workshop-muted/60">
                            <User className="w-2.5 h-2.5 opacity-40" />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                              Advisor: {record.technicianName}
                            </span>
                          </div>
                        )}

                        {customer?.phone && (
                          <a
                            href={`tel:${customer.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 text-status-success hover:brightness-110 active:scale-95 transition-all outline-none"
                          >
                            <Phone className="w-3.5 h-3.5 fill-status-success/10" />
                            <p className="text-sm font-black tracking-tight uppercase leading-none">
                              {customer.phone}
                            </p>
                          </a>
                        )}
                      </div>

                      <div className="h-px bg-workshop-border/30 w-full" />

                      <div className="flex items-center justify-between gap-4 pt-1 px-1">
                        <div className="flex flex-col translate-x-1">
                          <p className="text-[9px] font-bold text-workshop-muted uppercase tracking-widest leading-none mb-1.5">
                            Job Total
                          </p>
                          <p className="text-xl font-black text-workshop-text tracking-tighter leading-none">
                            {formatCurrency(record.totalCost)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailsRecord({ ...record });
                            }}
                            className="p-2 bg-workshop-surface border border-workshop-border/30 rounded-lg text-workshop-accent hover:text-workshop-accent hover:border-workshop-accent/20 transition-all active:scale-95 shadow-sm"
                            title="Edit Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecord(record);
                            }}
                            className="p-2 bg-workshop-surface border border-workshop-border/30 rounded-lg text-status-urgent/60 hover:text-status-urgent hover:border-status-urgent/20 transition-all active:scale-95 shadow-sm"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Record Modal */}
      <AnimatePresence>
        {showAddModal && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddModal(false)}
                className="absolute inset-0 bg-workshop-bg/60"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative bg-workshop-card w-full max-w-2xl rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[95vh] bg-clip-padding"
              >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-xl font-black text-workshop-text tracking-tight uppercase">
                    {lookupStep === "search"
                      ? "Vehicle Discovery"
                      : "Initiate Maintenance Card"}
                  </h2>
                  <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest mt-1">
                    {lookupStep === "search"
                      ? "Search records before intake"
                      : "Fill job requirements details"}
                  </p>
                </div>
                {lookupStep === "form" && (
                  <button
                    onClick={() => setLookupStep("search")}
                    className="text-[10px] font-bold text-workshop-accent uppercase tracking-widest hover:underline"
                  >
                    Back to Search
                  </button>
                )}
              </div>

              {lookupStep === "search" ? (
                <div className="space-y-8 py-4">
                  <div className="flex bg-workshop-surface p-1 rounded-xl border border-workshop-border">
                    <button
                      onClick={() => {
                        setSearchType("plate");
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                        searchType === "plate"
                          ? "bg-workshop-card text-workshop-accent shadow-sm"
                          : "text-workshop-muted hover:text-workshop-text",
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
                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                        searchType === "phone"
                          ? "bg-workshop-card text-workshop-accent shadow-sm"
                          : "text-workshop-muted hover:text-workshop-text",
                      )}
                    >
                      Phone Number / Name
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">
                        Enter{" "}
                        {searchType === "plate"
                          ? "Vehicle Plate"
                          : "Customer Phone or Name"}
                      </label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-workshop-muted w-4 h-4" />
                        <input
                          autoFocus
                          type="text"
                          placeholder={
                            searchType === "plate"
                              ? "Start typing plate..."
                              : "Search by phone or name..."
                          }
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-workshop-surface border border-workshop-border pl-12 pr-5 py-4 rounded-xl outline-none focus:border-workshop-accent focus:bg-workshop-surface/50 transition-all text-sm font-bold text-workshop-text shadow-sm uppercase placeholder:normal-case placeholder:text-workshop-muted/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
                    {searchQuery.length > 0 && searchResults.length === 0 && (
                      <div className="p-8 text-center bg-workshop-surface/30 rounded-xl border border-workshop-border border-dashed">
                        <p className="text-workshop-muted text-sm font-medium tracking-tight">
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
                        className="w-full flex items-center justify-between p-4 bg-workshop-surface hover:bg-workshop-surface/80 border border-workshop-border rounded-xl transition-all group text-left shadow-sm hover:border-workshop-accent/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-workshop-bg rounded-xl flex items-center justify-center font-black text-workshop-text uppercase text-xs border border-workshop-border">
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
                            <p className="text-sm font-bold text-workshop-text leading-tight uppercase flex items-center gap-2">
                              {res.customer.name}
                              {res.vehicle && (
                                <>
                                  <span className="text-workshop-muted font-normal opacity-40">
                                    |
                                  </span>
                                  <span className="font-mono text-sm text-workshop-secondary uppercase tracking-tighter">
                                    {res.vehicle.plateNumber}
                                  </span>
                                </>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-wider">
                                {res.customer.phone}
                              </p>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-workshop-muted group-hover:text-workshop-accent transition-all group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-workshop-border">
                    {[
                      {
                        icon: ScanHeart,
                        label: "Plate Search",
                        active: searchType === "plate",
                      },
                      {
                        icon: User,
                        label: "Phone Search",
                        active: searchType === "phone",
                      },
                    ].map((t, i) => (
                      <div
                        key={i}
                        onClick={() =>
                          setSearchType(i === 0 ? "plate" : "phone")
                        }
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer",
                          t.active
                            ? "bg-workshop-accent/10 border-workshop-accent/30 text-workshop-accent"
                            : "bg-workshop-surface border-workshop-border text-workshop-muted opacity-60",
                        )}
                      >
                        <t.icon className="w-5 h-5" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">
                          {t.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-workshop-border pt-8 text-center">
                    <button
                      onClick={() => setLookupStep("form")}
                      className="w-full py-2 text-workshop-muted text-[10px] font-black uppercase tracking-[0.3em] hover:text-workshop-accent transition-colors"
                    >
                      Skip to manual entry
                    </button>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="w-full py-2 text-workshop-muted/50 text-[10px] font-black uppercase tracking-[0.3em] hover:text-rose-400 transition-colors"
                    >
                      Cancel Intake
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddRecord} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">
                        Service Vehicle
                      </label>
                      <Select
                        value={newRecord.vehicleId}
                        onValueChange={(val) =>
                          setNewRecord({ ...newRecord, vehicleId: val })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select current vehicle..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id!}>
                              {v.plateNumber} — {v.make} {v.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">
                        Current KM Reading
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          disabled={newRecord.isDeadVehicle}
                          value={
                            newRecord.isDeadVehicle ? "" : newRecord.mileage
                          }
                          onChange={(e) =>
                            setNewRecord({
                              ...newRecord,
                              mileage: Number(e.target.value),
                            })
                          }
                          className={cn(
                            "w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text",
                            newRecord.isDeadVehicle && "opacity-40",
                          )}
                          placeholder={
                            newRecord.isDeadVehicle ? "Vehicle Dead" : "0"
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNewRecord({
                              ...newRecord,
                              isDeadVehicle: !newRecord.isDeadVehicle,
                              mileage: 0,
                            })
                          }
                          className={cn(
                            "absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[8px] font-black uppercase transition-all",
                            newRecord.isDeadVehicle
                              ? "bg-status-urgent text-white"
                              : "bg-workshop-bg text-workshop-muted border border-workshop-border",
                          )}
                        >
                          {newRecord.isDeadVehicle ? "Dead" : "Alive"}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted flex items-center gap-1.5">
                        Expected Delivery Date
                        <span className="text-status-urgent">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={newRecord.expectedDeliveryDate || ""}
                        onChange={(e) =>
                          setNewRecord({
                            ...newRecord,
                            expectedDeliveryDate: e.target.value,
                          })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text focus:ring-1 focus:ring-workshop-accent transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted flex items-center gap-1.5">
                        Service Date
                        <span className="text-status-urgent">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        max={new Date().toISOString().split('T')[0]}
                        value={newRecord.date || ""}
                        onChange={(e) =>
                          setNewRecord({ ...newRecord, date: e.target.value })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text focus:ring-1 focus:ring-workshop-accent transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">
                      Personal Items / Valuables
                    </label>
                    <textarea
                      value={newRecord.personalItems || ""}
                      onChange={(e) =>
                        setNewRecord({ ...newRecord, personalItems: e.target.value })
                      }
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text focus:ring-1 focus:ring-workshop-accent transition-all text-sm min-h-[60px] resize-none"
                      placeholder="Laptop, cash, tools, etc..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted flex items-center justify-between">
                      Service Breakdown
                      <span className="text-[9px] lowercase font-normal opacity-60">Each line becomes a checklist item</span>
                    </label>
                    <textarea
                      required
                      value={newRecord.description}
                      onChange={(e) =>
                        setNewRecord({
                          ...newRecord,
                          description: e.target.value,
                        })
                      }
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none h-24 resize-none text-sm focus:ring-1 focus:ring-workshop-accent text-workshop-text shadow-sm"
                      placeholder="Line 1: Change engine oil&#10;Line 2: Check tire pressure"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">
                      Technical Remarks
                    </label>
                    <textarea
                      value={newRecord.remarks}
                      onChange={(e) =>
                        setNewRecord({ ...newRecord, remarks: e.target.value })
                      }
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none h-20 resize-none text-sm focus:ring-1 focus:ring-workshop-accent text-workshop-text"
                      placeholder="Additional technician observations or advice..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-workshop-border pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-workshop-muted uppercase tracking-widest text-[10px]">
                          Parts Allocation
                        </h3>
                      </div>
                      <div className="relative">
                        <Select onValueChange={(val) => addPartToRecord(val)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="+ Allocate part..." />
                          </SelectTrigger>
                          <SelectContent>
                            {parts.map((p) => (
                              <SelectItem
                                key={p.id}
                                value={p.id!}
                                disabled={p.stockQuantity <= 0}
                              >
                                {p.name} ({p.stockQuantity} rem.)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                        {newRecord.partsUsed?.map((up, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-workshop-surface/30 rounded-xl border border-workshop-border"
                          >
                            <div className="flex-1">
                              <p className="text-xs font-bold text-workshop-text uppercase">
                                {up.name}
                              </p>
                              <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">
                                {formatCurrency(up.unitPrice)} x {up.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [
                                    ...(newRecord.partsUsed || []),
                                  ];
                                  if (updated[idx].quantity > 1) {
                                    updated[idx].quantity -= 1;
                                    setNewRecord({
                                      ...newRecord,
                                      partsUsed: updated,
                                    });
                                  } else {
                                    setNewRecord({
                                      ...newRecord,
                                      partsUsed: updated.filter(
                                        (_, i) => i !== idx,
                                      ),
                                    });
                                  }
                                }}
                                className="w-7 h-7 border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-status-urgent hover:bg-status-urgent/10 transition-all text-sm"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-black text-xs text-workshop-text">
                                {up.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [
                                    ...(newRecord.partsUsed || []),
                                  ];
                                  updated[idx].quantity += 1;
                                  setNewRecord({
                                    ...newRecord,
                                    partsUsed: updated,
                                  });
                                }}
                                className="w-7 h-7 border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-workshop-accent hover:bg-workshop-accent/10 transition-all text-sm"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-workshop-muted uppercase tracking-widest text-[10px]">
                        Financial Summary
                      </h3>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">
                          Labor Fees (INR)
                        </label>
                        <input
                          type="number"
                          value={newRecord.laborCost}
                          onChange={(e) =>
                            setNewRecord({
                              ...newRecord,
                              laborCost: Number(e.target.value),
                            })
                          }
                          className="w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-sm font-black text-workshop-text tracking-tight"
                        />
                      </div>
                      <div className="p-5 bg-workshop-bg border border-workshop-border rounded-xl space-y-4">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-workshop-muted/50">
                          <span>Description</span>
                          <span>Calculated</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                          <span className="text-workshop-muted">
                            Total Labor
                          </span>
                          <span className="text-workshop-text">
                            {formatCurrency(newRecord.laborCost || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                          <span className="text-workshop-muted">
                            Total Parts
                          </span>
                          <span className="text-workshop-text">
                            {formatCurrency(
                              (newRecord.partsUsed || []).reduce(
                                (acc, p) => acc + p.unitPrice * p.quantity,
                                0,
                              ),
                            )}
                          </span>
                        </div>
                        <div className="pt-3 border-t border-workshop-border flex justify-between font-black text-lg items-end">
                          <span className="text-workshop-accent text-[10px] uppercase tracking-[0.2em]">
                            Grand Total
                          </span>
                          <span className="tracking-tighter text-workshop-text">
                            {formatCurrency(
                              (newRecord.laborCost || 0) +
                                (newRecord.partsUsed || []).reduce(
                                  (acc, p) => acc + p.unitPrice * p.quantity,
                                  0,
                                ),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !newRecord.vehicleId || !newRecord.date || !newRecord.expectedDeliveryDate || !newRecord.description}
                      className="flex-1 px-4 py-4 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-workshop-accent/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        "Authorize Job Card"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Edit Record Modal */}
      <AnimatePresence>
        {editingRecord && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingRecord(null)}
                className="absolute inset-0 bg-workshop-bg/60"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative bg-workshop-card w-full max-w-2xl rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[95vh] bg-clip-padding"
              >
              <div className="flex flex-col gap-4 mb-8">
                <h2 className="text-xl font-black text-workshop-text tracking-tight uppercase px-1">
                  Update Service Entry
                </h2>
                <div className="flex items-center gap-2 px-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRecord({ ...editingRecord, status: "pending" })
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                      editingRecord.status === "pending"
                        ? "bg-status-urgent text-workshop-bg border-status-urgent shadow-md shadow-status-urgent/20"
                        : "bg-workshop-surface text-workshop-muted border-workshop-border hover:border-status-urgent/30",
                    )}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRecord({
                        ...editingRecord,
                        status: "in-progress",
                      })
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                      editingRecord.status === "in-progress"
                        ? "bg-status-pending text-workshop-bg border-status-pending shadow-md shadow-status-pending/20"
                        : "bg-workshop-surface text-workshop-muted border-workshop-border hover:border-status-pending/30",
                    )}
                  >
                    In-Progress
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRecord({
                        ...editingRecord,
                        status: "completed",
                      })
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                      editingRecord.status === "completed"
                        ? "bg-status-success text-workshop-bg border-status-success shadow-md shadow-status-success/20"
                        : "bg-workshop-surface text-workshop-muted border-workshop-border hover:border-status-success/30",
                    )}
                  >
                    Completed
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdateRecord} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="p-4 bg-workshop-secondary/10 rounded-xl border border-workshop-secondary/20 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-workshop-secondary uppercase tracking-widest mb-1">
                        Vehicle Reference
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-bold text-workshop-text text-sm flex items-center gap-2">
                          {getVehicleInfo(editingRecord.vehicleId)?.make}{" "}
                          {getVehicleInfo(editingRecord.vehicleId)?.model}
                          <span className="text-workshop-muted font-normal opacity-40">
                            |
                          </span>
                          <span className="font-mono text-sm text-workshop-secondary uppercase">
                            {
                              getVehicleInfo(editingRecord.vehicleId)
                                ?.plateNumber
                            }
                          </span>
                          {getVehicleInfo(editingRecord.vehicleId)?.color && (
                            <>
                              <span className="text-workshop-muted font-normal opacity-40">
                                |
                              </span>
                              <span className="text-white text-sm font-bold uppercase tracking-tight">
                                {getVehicleInfo(editingRecord.vehicleId)?.color}
                              </span>
                            </>
                          )}
                        </p>
                        <span className="text-workshop-muted font-normal opacity-40">
                          |
                        </span>
                        <span
                          className={cn(
                            "font-mono text-sm font-black uppercase tracking-tight",
                            editingRecord.isDeadVehicle
                              ? "text-status-urgent italic"
                              : "text-workshop-warning",
                          )}
                        >
                          {editingRecord.isDeadVehicle
                            ? "DEAD"
                            : `${editingRecord.mileage.toLocaleString()} KM`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Password/Key Display */}
                      {(() => {
                        const vRec = getVehicleInfo(editingRecord.vehicleId);
                        if (!vRec?.passwordOrPin) return null;
                        return (
                          <div className="flex items-center gap-1.5 text-status-success bg-status-success/10 px-2 py-1 rounded border border-status-success/20">
                            <Key className="w-3 h-3" />
                            {vRec.passwordOrPin.toLowerCase() === "key" ? (
                              <span className="text-[10px] font-black tracking-[0.15em]">
                                KEY
                              </span>
                            ) : (
                              <span className="font-mono font-black text-xs">
                                # {vRec.passwordOrPin}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Quick Dial Button */}
                      {(() => {
                        const customer = customers.find(
                          (c) => c.id === editingRecord.customerId,
                        );
                        if (!customer?.phone) return null;
                        return (
                          <a
                            href={`tel:${customer.phone}`}
                            className="flex items-center gap-1.5 text-workshop-accent bg-workshop-accent/10 px-2 py-1 rounded border border-workshop-accent/20 hover:bg-workshop-accent hover:text-workshop-bg transition-all text-[10px] font-black uppercase tracking-widest shadow-sm shadow-workshop-accent/10"
                          >
                            <Phone className="w-3 h-3" />
                            Dial {customer.name.split(" ")[0]}
                          </a>
                        );
                      })()}
                    </div>
                  </div>
                  {(editingRecord.status === "completed" ||
                    (editingRecord.completionMileage &&
                      editingRecord.completionMileage > 0)) && (
                    <div className="p-4 bg-workshop-surface rounded-xl border border-workshop-accent/30 shadow-sm shadow-workshop-accent/5 animate-in fade-in slide-in-from-top-1 duration-300">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-accent block mb-1 font-black">
                        Completion Odometer
                      </label>
                      <input
                        required={editingRecord.status === "completed"}
                        type="number"
                        value={editingRecord.completionMileage || ""}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            completionMileage: Number(e.target.value),
                          })
                        }
                        className="w-full bg-workshop-bg border border-workshop-accent/20 px-3 py-1.5 rounded-lg outline-none text-sm font-black focus:ring-1 focus:ring-workshop-accent text-workshop-text"
                        placeholder="Reading at finish..."
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 bg-workshop-surface rounded-xl border border-workshop-border/30 shadow-sm relative overflow-hidden">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted block mb-4 px-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-workshop-accent animate-pulse" />
                    Maintenance Checklist
                  </label>
                  <div className="space-y-2 relative z-10">
                    {parseTasks(editingRecord.description).map((task, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleTask(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left group/btn active:scale-[0.99]",
                          task.completed 
                            ? "bg-workshop-accent/5 border-workshop-accent/30 shadow-inner" 
                            : "bg-workshop-bg/40 border-workshop-border hover:border-workshop-accent/40 hover:bg-workshop-bg/60"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all text-xs font-black",
                          task.completed 
                            ? "bg-workshop-accent border-workshop-accent text-workshop-bg shadow-lg shadow-workshop-accent/30" 
                            : "border-workshop-border bg-workshop-bg group-hover/btn:border-workshop-accent/50"
                        )}>
                          {task.completed && (
                            <motion.div
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                            >
                              ✓
                            </motion.div>
                          )}
                        </div>
                        <span className={cn(
                          "text-sm font-bold tracking-tight transition-all",
                          task.completed ? "text-workshop-muted line-through opacity-60" : "text-workshop-text"
                        )}>
                          {task.text}
                        </span>
                      </button>
                    ))}
                    {parseTasks(editingRecord.description).length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-workshop-border rounded-xl">
                        <p className="text-xs text-workshop-muted font-bold italic">
                          No tasks defined in maintenance request.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted px-1">
                      Final Remarks
                    </label>
                    <textarea
                      value={editingRecord.finalRemarks || ""}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          finalRemarks: e.target.value,
                        })
                      }
                      className="w-full bg-workshop-bg border border-workshop-border px-4 py-3 rounded-xl outline-none h-20 resize-none text-sm focus:ring-1 focus:ring-workshop-accent text-workshop-text transition-all"
                      placeholder="Add final closing remarks or advice..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-bold text-workshop-muted uppercase tracking-widest text-[10px]">
                      Adjust Parts Used
                    </h3>
                    <div className="relative">
                      <Select
                        onValueChange={(val) => addPartToEditingRecord(val)}
                      >
                        <SelectTrigger className="w-full shadow-sm">
                          <SelectValue placeholder="+ Add or Replace part..." />
                        </SelectTrigger>
                        <SelectContent>
                          {parts.map((p) => (
                            <SelectItem key={p.id} value={p.id!}>
                              {p.name} (Stock: {p.stockQuantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                      {editingRecord.partsUsed?.map((up, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-workshop-surface/30 rounded-xl border border-workshop-border shadow-sm"
                        >
                          <div className="flex-1">
                            <p className="text-xs font-bold text-workshop-text uppercase">
                              {up.name}
                            </p>
                            <p className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">
                              {formatCurrency(up.unitPrice)} x {up.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [
                                  ...(editingRecord.partsUsed || []),
                                ];
                                if (updated[idx].quantity > 1) {
                                  updated[idx].quantity -= 1;
                                  setEditingRecord({
                                    ...editingRecord,
                                    partsUsed: updated,
                                  });
                                } else {
                                  setEditingRecord({
                                    ...editingRecord,
                                    partsUsed: updated.filter(
                                      (_, i) => i !== idx,
                                    ),
                                  });
                                }
                              }}
                              className="w-6 h-6 border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-status-urgent hover:bg-status-urgent/10 transition-all text-xs"
                            >
                              -
                            </button>
                            <span className="w-4 text-center font-black text-xs text-workshop-text">
                              {up.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [
                                  ...(editingRecord.partsUsed || []),
                                ];
                                updated[idx].quantity += 1;
                                setEditingRecord({
                                  ...editingRecord,
                                  partsUsed: updated,
                                });
                              }}
                              className="w-6 h-6 border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-workshop-accent hover:bg-workshop-accent/10 transition-all text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-workshop-muted uppercase tracking-widest text-[10px]">
                      Billing Adjustment
                    </h3>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-workshop-muted uppercase tracking-widest">
                        Labor Fees (INR)
                      </label>
                      <input
                        type="number"
                        value={editingRecord.laborCost}
                        onChange={(e) =>
                          setEditingRecord({
                            ...editingRecord,
                            laborCost: Number(e.target.value),
                          })
                        }
                        className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none text-sm font-black focus:ring-1 focus:ring-workshop-accent text-workshop-text transition-all"
                      />
                    </div>
                    <div className="p-5 bg-workshop-accent/90 text-workshop-bg rounded-xl shadow-lg space-y-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
                      <div className="flex justify-between text-xs font-medium opacity-80">
                        <span>Labor Subtotal</span>
                        <span className="font-bold">
                          {formatCurrency(editingRecord.laborCost || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-medium opacity-80">
                        <span>Parts Subtotal</span>
                        <span className="font-bold">
                          {formatCurrency(
                            (editingRecord.partsUsed || []).reduce(
                              (acc, p) => acc + p.unitPrice * p.quantity,
                              0,
                            ),
                          )}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-workshop-bg/10 flex justify-between font-black text-xl items-end">
                        <span className="text-workshop-bg/60 text-[10px] uppercase tracking-[0.2em]">
                          Updated Total
                        </span>
                        <span className="tracking-tighter">
                          {formatCurrency(
                            (editingRecord.laborCost || 0) +
                              (editingRecord.partsUsed || []).reduce(
                                (acc, p) => acc + p.unitPrice * p.quantity,
                                0,
                              ),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-sm font-bold text-workshop-muted hover:bg-workshop-surface transition-all uppercase tracking-widest"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-workshop-accent text-workshop-bg rounded-xl text-sm font-black shadow-md hover:brightness-110 transition-all uppercase tracking-widest"
                  >
                    {isUpdating ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      "Apply Update"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Edit Details Modal */}
      <AnimatePresence>
        {detailsRecord && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDetailsRecord(null)}
                className="absolute inset-0 bg-workshop-bg/60"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative bg-workshop-card w-full max-w-lg rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[95vh]"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-workshop-text tracking-tight uppercase px-1">
                    Edit Service Details
                  </h2>
                  <button
                    onClick={() => setDetailsRecord(null)}
                    className="p-2 text-workshop-muted hover:text-workshop-text transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateDetails} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted px-1">
                      Personal Items / Valuables
                    </label>
                    <textarea
                      value={detailsRecord.personalItems || ""}
                      onChange={(e) =>
                        setDetailsRecord({ ...detailsRecord, personalItems: e.target.value })
                      }
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none text-workshop-text focus:ring-1 focus:ring-workshop-accent transition-all text-sm min-h-[60px] resize-none"
                      placeholder="Captured items during intake..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted px-1 flex items-center justify-between">
                      Maintenance Request
                      <span className="text-[9px] lowercase font-normal opacity-60">Each line becomes a checklist item</span>
                    </label>
                    <textarea
                      required
                      value={detailsRecord.description}
                      onChange={(e) =>
                        setDetailsRecord({
                          ...detailsRecord,
                          description: e.target.value,
                        })
                      }
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none h-32 resize-none text-sm focus:ring-1 focus:ring-workshop-accent text-workshop-text shadow-sm"
                      placeholder="Line 1: Item one&#10;Line 2: Item two"
                    />
                  </div>

                  <div className="space-y-1.5 px-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted flex items-center gap-1.5">
                      Expected Delivery Date
                      <span className="text-status-urgent">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={detailsRecord.expectedDeliveryDate || ""}
                      onChange={(e) =>
                        setDetailsRecord({
                          ...detailsRecord,
                          expectedDeliveryDate: e.target.value,
                        })
                      }
                      className="w-full bg-workshop-surface border border-workshop-border px-4 py-3 rounded-xl outline-none text-sm font-bold text-workshop-text focus:ring-1 focus:ring-workshop-accent transition-all shadow-sm"
                    />
                  </div>

                  <div className="flex gap-4 pt-4 px-1">
                    <button
                      type="button"
                      onClick={() => setDetailsRecord(null)}
                      className="flex-1 px-4 py-3 border border-workshop-border rounded-xl text-xs font-black uppercase tracking-widest text-workshop-muted hover:bg-workshop-surface transition-all active:scale-[0.98]"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating || !detailsRecord.description || !detailsRecord.expectedDeliveryDate}
                      className="flex-1 px-4 py-3 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-workshop-accent/20 hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale font-black"
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                      ) : (
                        "Save Details"
                      )}
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
        {recordToDelete && (
          <Portal>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setRecordToDelete(null)}
                className="absolute inset-0 bg-workshop-bg/60"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="relative bg-workshop-card w-full max-w-sm rounded-xl p-8 shadow-2xl border border-workshop-border text-center transition-all"
              >
                <div className="w-16 h-16 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-status-urgent border border-status-urgent/20">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                
                <h2 className="text-xl font-black text-workshop-text uppercase tracking-tight mb-2">Purge Record?</h2>
                <p className="text-workshop-muted text-sm mb-8 leading-relaxed">
                  Are you certain you want to delete this job card? This action will permanently remove the record and revert used parts to inventory.
                </p>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setRecordToDelete(null)}
                    className="flex-1 px-4 py-2.5 bg-workshop-surface text-workshop-muted rounded-xl text-sm font-black uppercase tracking-widest border border-workshop-border hover:text-workshop-text hover:bg-workshop-border transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-status-urgent text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-status-urgent/20 hover:brightness-110 transition-all"
                  >
                    Purge
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}
