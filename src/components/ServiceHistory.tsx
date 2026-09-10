import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useResponsiveSearch } from "../hooks/useResponsiveSearch";
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
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ServiceRecord, Vehicle, Customer, Part } from "../types";
import { cn } from "../lib/utils";
import { WhatsAppPopup } from "./WhatsAppPopup";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { ServiceRecordCard } from "./services/ServiceRecordCard";
import { AddRecordModal } from "./services/AddRecordModal";
import { EditRecordSheet } from "./services/EditRecordSheet";
import { EditDetailsModal } from "./services/EditDetailsModal";
import { DeleteRecordModal } from "./services/DeleteRecordModal";
import { DeliveryBillModal, type CompletedJobPayload } from "./services/DeliveryBillModal";

const contentVariants = {
  enter: {
    opacity: 0,
    y: 16,
  },
  center: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

const capitalizeName = (name?: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function ServiceHistory() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- State: Core Data ---
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // --- State: UI Control ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchTerm: stickySearchLogs, activeTab, setActiveTab } = useResponsiveSearch();

  // Sync activeTab from location state
  useEffect(() => {
    if (location.state && typeof location.state === "object" && "activeTab" in location.state) {
      const stateObj = location.state as Record<string, unknown>;
      const tabVal = stateObj.activeTab;
      if (
        typeof tabVal === "string" &&
        ["all", "pending", "in-progress", "completed", "cancelled"].includes(tabVal)
      ) {
        navigate(location.pathname + location.search, { replace: true, state: {} });
        if (activeTab !== tabVal) {
          setActiveTab(tabVal as "all" | "pending" | "in-progress" | "completed" | "cancelled");
        }
      }
    }
  }, [location.state, navigate, location.pathname, location.search, activeTab, setActiveTab]);

  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    const stateObj = location.state as Record<string, unknown> | null;
    const targetId = (stateObj?.openRecordId as string) || searchParams.get("recordId");
    if (targetId && records.length > 0) {
      const found = records.find((r) => r.id === targetId);
      if (found) {
        setEditingRecord((prev) => (prev?.id === found.id ? prev : { ...found }));
        if (stateObj?.openRecordId) {
          navigate(location.pathname + location.search, { replace: true, state: {} });
        }
        if (searchParams.has("recordId")) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete("recordId");
              return next;
            },
            { replace: true }
          );
        }
      }
    }
  }, [records, location.state, searchParams, navigate, setSearchParams]);

  const closeEditingRecord = useCallback(() => {
    setEditingRecord(null);
    if (location.state && typeof location.state === "object" && "openRecordId" in location.state) {
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
    if (searchParams.has("recordId")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("recordId");
          return next;
        },
        { replace: true }
      );
    }
  }, [location.state, location.pathname, location.search, searchParams, setSearchParams, navigate]);

  const [detailsRecord, setDetailsRecord] = useState<ServiceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<ServiceRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const [whatsAppRedirect, setWhatsAppRedirect] = useState<{
    name: string;
    phone: string;
    url: string;
    record?: ServiceRecord | null;
    vehicle?: Vehicle | null;
  } | null>(null);

  const [completedJobPopup, setCompletedJobPopup] = useState<CompletedJobPayload | null>(null);

  const handleCardClick = useCallback((record: ServiceRecord) => {
    setEditingRecord({ ...record });
  }, []);

  const handleCardUpdateDetails = useCallback((record: ServiceRecord) => {
    setDetailsRecord({ ...record });
  }, []);

  const handleCardDelete = useCallback((record: ServiceRecord) => {
    setRecordToDelete(record);
  }, []);

  const tabCounts = useMemo(() => {
    const counts = { all: records.length, pending: 0, "in-progress": 0, completed: 0, cancelled: 0 };
    records.forEach((r) => {
      if (r.status === "pending") counts.pending++;
      else if (r.status === "in-progress") counts["in-progress"]++;
      else if (r.status === "completed") counts.completed++;
      else if (r.status === "cancelled") counts.cancelled++;
    });
    return counts;
  }, [records]);

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

  // --- External Back Button and Theme Effects ---
  useEffect(() => {
    const handleBackButton = (e: Event) => {
      if (editingRecord) {
        closeEditingRecord();
        e.preventDefault();
      } else if (detailsRecord) {
        setDetailsRecord(null);
        e.preventDefault();
      } else if (showAddModal) {
        setShowAddModal(false);
        e.preventDefault();
      }
    };

    window.addEventListener("appBackButton", handleBackButton);
    return () => window.removeEventListener("appBackButton", handleBackButton);
  }, [editingRecord, showAddModal, detailsRecord, closeEditingRecord]);

  useEffect(() => {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }

    const originalColor = metaThemeColor.getAttribute("content") || "#0B0D11";

    if (editingRecord || detailsRecord) {
      metaThemeColor.setAttribute("content", "#0B0D11");
    } else {
      metaThemeColor.setAttribute("content", originalColor);
    }

    return () => {
      if (metaThemeColor) {
        metaThemeColor.setAttribute("content", originalColor);
      }
    };
  }, [editingRecord, detailsRecord]);

  // --- Data Fetching ---
  const fetchData = async () => {
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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const confirmDelete = async () => {
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

      closeEditingRecord();
      await fetchData();

      if (isCompleted) {
        setCompletedJobPopup({
          record: completedRecordData,
          customer: currentCust,
          vehicle: currentVeh,
        });
      }
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

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesTab =
        activeTab === "all" ||
        stickySearchLogs.trim() !== "" ||
        (activeTab === "pending" && r.status === "pending") ||
        (activeTab === "in-progress" && r.status === "in-progress") ||
        (activeTab === "completed" && r.status === "completed") ||
        (activeTab === "cancelled" && r.status === "cancelled");

      if (!matchesTab) return false;

      if (stickySearchLogs.trim()) {
        const query = stickySearchLogs.toLowerCase();
        const vehicle = vehicleMap.get(r.vehicleId);
        const customer = customerMap.get(r.customerId);

        const vehicleName = `${vehicle?.make} ${vehicle?.model}`.toLowerCase();
        const plateNumber = vehicle?.plateNumber?.toLowerCase() || "";
        const customerName = customer?.name?.toLowerCase() || "";
        const vehicleColor = vehicle?.color?.toLowerCase() || "";

        const matchesSticky =
          vehicleName.includes(query) ||
          plateNumber.includes(query) ||
          customerName.includes(query) ||
          vehicleColor.includes(query);
        if (!matchesSticky) return false;
      }

      return true;
    });
  }, [records, activeTab, stickySearchLogs, vehicleMap, customerMap]);

  const {
    visibleItems: visibleRecords,
    sentinelRef,
    hasMore,
    isLoadingMore,
    remainingCount,
    loadMore,
  } = useInfiniteScroll(filteredRecords, {
    batchSize: 20,
    resetDependency: `${activeTab}-${stickySearchLogs}`,
  });

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

      {/* Status Tabs */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="w-full xl:w-72 relative min-w-0 z-30">
          {(() => {
            const activeTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];
            return (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                  className="w-full flex items-center justify-between gap-3 bg-workshop-surface/80 border border-workshop-border/80 hover:border-workshop-accent/50 text-workshop-text px-4 py-3 rounded-xl outline-none select-none transition-all shadow-sm cursor-pointer font-sans text-xs font-black uppercase tracking-wider h-[46px]"
                  id="status-filter-dropdown"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shadow-sm shrink-0",
                        activeTabObj.color?.replace("text-", "bg-") || "bg-workshop-secondary"
                      )}
                    />
                    <span className="truncate">{activeTabObj.label}</span>
                    <span className="text-[10px] bg-workshop-border/40 text-workshop-muted px-1.5 py-0.5 rounded font-sans font-black tabular-nums">
                      {activeTabObj.count}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-workshop-muted transition-transform duration-200 shrink-0",
                      filterDropdownOpen && "rotate-180"
                    )}
                  />
                </button>

                <AnimatePresence>
                  {filterDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-transparent [-webkit-tap-highlight-color:transparent] outline-none border-none"
                        onClick={() => setFilterDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 mt-2 bg-workshop-card border border-workshop-border rounded-xl shadow-xl z-50 overflow-hidden py-1.5 min-w-[200px]"
                      >
                        {tabs.map((tab) => {
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                setActiveTab(
                                  tab.id as
                                    | "all"
                                    | "pending"
                                    | "in-progress"
                                    | "completed"
                                    | "cancelled"
                                );
                                setFilterDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between gap-3 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all select-none text-left cursor-pointer outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]",
                                isActive
                                  ? "text-workshop-accent bg-workshop-surface/80"
                                  : "text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface/45"
                              )}
                            >
                              <span className="flex items-center gap-2.5">
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full shadow-sm shrink-0",
                                    tab.color?.replace("text-", "bg-") || "bg-workshop-muted"
                                  )}
                                />
                                <span className="font-sans truncate">{tab.label}</span>
                              </span>
                              <span className="text-[10px] bg-workshop-border/30 px-1.5 py-0.5 rounded font-sans opacity-80 font-black tabular-nums">
                                {tab.count}
                              </span>
                            </button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            );
          })()}
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
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="space-y-4 font-sans accelerate-gpu will-change-transform-opacity"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="skeleton-card-m3 p-5 md:p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-6 skeleton-element-m3" />
                    <div className="flex-1 h-px bg-workshop-border/30" />
                    <div className="w-20 h-6 skeleton-element-m3" />
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-4 w-32 sm:w-40 skeleton-element-m3" />
                    <div className="h-3.5 w-48 sm:w-64 skeleton-element-m3" />
                    <div className="h-3.5 w-24 skeleton-element-m3" />
                  </div>
                  <div className="w-full h-16 rounded-xl bg-workshop-surface/10 p-2.5 border border-workshop-border/10 skeleton-element-m3" />
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="h-3.5 w-40 skeleton-element-m3" />
                  </div>
                  <div className="h-px bg-workshop-border/30 w-full" />
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="space-y-1.5">
                      <div className="h-2 w-10 skeleton-element-m3" />
                      <div className="h-5 w-24 skeleton-element-m3" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 skeleton-element-m3 rounded-lg" />
                      <div className="w-8 h-8 skeleton-element-m3 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : filteredRecords.length === 0 ? (
            <motion.div
              key={`empty-state-${activeTab}`}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              className="text-center py-20 text-workshop-muted text-sm italic"
            >
              {stickySearchLogs
                ? "No records match your search criteria."
                : `No ${activeTab === "all" ? "" : activeTab} records found in the logbook.`}
            </motion.div>
          ) : (
            <motion.div
              key={`records-list-${activeTab}`}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              className="space-y-4 accelerate-gpu will-change-transform-opacity"
            >
              {visibleRecords.map((record) => {
                const v = vehicleMap.get(record.vehicleId);
                const customer = customerMap.get(record.customerId);
                return (
                  <ServiceRecordCard
                    key={record.id}
                    record={record}
                    v={v}
                    customer={customer}
                    onClick={handleCardClick}
                    onUpdateDetails={handleCardUpdateDetails}
                    onDelete={handleCardDelete}
                    onWhatsAppClick={(rec, cust, veh) => {
                      const cleanPhone = (cust?.phone || "").replace(/[^0-9]/g, "");
                      setWhatsAppRedirect({
                        name: cust?.name ? capitalizeName(cust.name) : "Customer",
                        phone: cust?.phone || "",
                        url: `https://wa.me/${cleanPhone}`,
                        record: rec,
                        vehicle: veh,
                      });
                    }}
                  />
                );
              })}
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-workshop-muted"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2 font-bold tracking-widest uppercase text-workshop-accent">
                      <div className="w-4 h-4 border-2 border-workshop-accent border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Loading records...</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={loadMore}
                      className="px-4 py-2 rounded-xl bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 text-workshop-text hover:text-workshop-accent transition-all text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 shadow-sm"
                    >
                      Load more records ({remainingCount} remaining)
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Record Modal */}
      <AddRecordModal
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        vehicles={vehicles}
        customers={customers}
        parts={parts}
        onRecordAdded={fetchData}
      />

      {/* Edit Record Fullscreen Sheet */}
      <EditRecordSheet
        editingRecord={editingRecord}
        setEditingRecord={setEditingRecord}
        onClose={closeEditingRecord}
        onSubmit={handleUpdateRecord}
        isUpdating={isUpdating}
        vehicleMap={vehicleMap}
        customers={customers}
        parts={parts}
        onWhatsAppClick={(rec, cust, veh) => {
          const cleanPhone = (cust?.phone || "").replace(/[^0-9]/g, "");
          setWhatsAppRedirect({
            name: cust?.name ? capitalizeName(cust.name) : "Customer",
            phone: cust?.phone || "",
            url: `https://wa.me/${cleanPhone}`,
            record: rec,
            vehicle: veh,
          });
        }}
      />

      {/* Edit Details Fullscreen Modal */}
      <EditDetailsModal
        detailsRecord={detailsRecord}
        setDetailsRecord={setDetailsRecord}
        onClose={() => setDetailsRecord(null)}
        onSubmit={handleUpdateDetails}
        isUpdating={isUpdating}
      />

      {/* Delete Confirmation Modal */}
      <DeleteRecordModal
        recordToDelete={recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirmDelete={confirmDelete}
      />

      {/* WhatsApp Redirect Popup */}
      <WhatsAppPopup
        isOpen={whatsAppRedirect !== null}
        onClose={() => setWhatsAppRedirect(null)}
        customerName={whatsAppRedirect?.name || ""}
        customerPhone={whatsAppRedirect?.phone || ""}
        url={whatsAppRedirect?.url || ""}
        record={whatsAppRedirect?.record || null}
        vehicle={whatsAppRedirect?.vehicle || null}
      />

      {/* Completed Job Card & WhatsApp Bill Popup */}
      <DeliveryBillModal
        completedJob={completedJobPopup}
        onClose={() => setCompletedJobPopup(null)}
      />
    </div>
  );
}
