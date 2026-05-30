import React, { useState, useEffect, useMemo, memo } from "react";
import { useLocation } from "react-router-dom";
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
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Phone,
  Key,
  X,
  AlertTriangle,
  Package,
  Clock,
  CheckCircle,
  Activity,
  Receipt,
  FileText,
  Plus,
  Minus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ServiceRecord, Vehicle, Customer, Part } from "../types";
import { formatCurrency, cn } from "../lib/utils";
import { Portal } from "./Portal";
import { MaterialCalendar } from "./ui/MaterialCalendar";
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

const capitalizeName = (name?: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface ServiceRecordCardProps {
  record: ServiceRecord;
  v?: Vehicle;
  customer?: Customer;
  onClick: () => void;
  onUpdateDetails: (r: ServiceRecord) => void;
  onDelete: (r: ServiceRecord) => void;
}

const ServiceRecordCard = memo(({ record, v, customer, onClick, onUpdateDetails, onDelete }: ServiceRecordCardProps) => {
  return (
    <motion.div
      onClick={onClick}
      className={cn(
        "relative bg-workshop-surface/25 hover:bg-workshop-surface/50 rounded-xl border border-workshop-border shadow-sm overflow-hidden transition-all group cursor-pointer bg-clip-padding will-change-transform",
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
                {capitalizeName(customer?.name) || "Unknown"}
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
                      "font-mono whitespace-nowrap shrink-0",
                      record.isDeadVehicle
                        ? "text-white bg-status-urgent px-1.5 py-0.5 rounded border border-status-urgent select-none text-[9px] font-black tracking-widest leading-none font-sans"
                        : record.isUnknownMileage
                          ? "text-black bg-white px-1.5 py-0.5 rounded border border-white select-none text-[9px] font-black tracking-widest leading-none font-sans"
                          : "text-status-pending pr-1",
                    )}
                  >
                    {record.isDeadVehicle
                      ? "DEAD"
                      : record.isUnknownMileage
                        ? "LOCKED"
                        : `${record.mileage.toLocaleString()} KM`}
                  </span>
                  {!!record.completionMileage && (
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
                onUpdateDetails(record);
              }}
              className="p-2 bg-workshop-surface border border-workshop-border/30 rounded-lg text-workshop-muted hover:text-workshop-accent hover:border-workshop-accent/20 transition-all active:scale-95 shadow-sm"
              title="Edit Details"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(record);
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
});

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

export function ServiceHistory() {
  const location = useLocation();
  // --- State: Core Data ---
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // --- State: Custom Parts Dropdown Search & Control ---
  const [addPartSearchQuery, setAddPartSearchQuery] = useState("");
  const [addPartDropdownOpen, setAddPartDropdownOpen] = useState(false);
  const [editPartSearchQuery, setEditPartSearchQuery] = useState("");
  const [editPartDropdownOpen, setEditPartDropdownOpen] = useState(false);

  const filteredPartsForAdd = useMemo(() => {
    if (!addPartSearchQuery.trim()) return parts;
    const q = addPartSearchQuery.toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [parts, addPartSearchQuery]);

  const filteredPartsForEdit = useMemo(() => {
    if (!editPartSearchQuery.trim()) return parts;
    const q = editPartSearchQuery.toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [parts, editPartSearchQuery]);
  
  // --- State: UI Control ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "in-progress" | "completed" | "cancelled"
  >("all");

  // Sync activeTab from location state
  useEffect(() => {
    if (location.state && typeof location.state === "object" && "activeTab" in location.state) {
      const stateObj = location.state as Record<string, unknown>;
      const tabVal = stateObj.activeTab;
      if (
        typeof tabVal === "string" &&
        ["all", "pending", "in-progress", "completed", "cancelled"].includes(tabVal)
      ) {
        setActiveTab(tabVal as "all" | "pending" | "in-progress" | "completed" | "cancelled");
      }
    }
  }, [location.state]);
  
  const tabOrder = ["all", "pending", "in-progress", "completed", "cancelled"];
  const [tabState, setTabState] = useState({
    currentTab: activeTab,
    direction: "forward" as "forward" | "backward",
  });

  if (activeTab !== tabState.currentTab) {
    const prevIndex = tabOrder.indexOf(tabState.currentTab);
    const currentIndex = tabOrder.indexOf(activeTab);
    const newDirection = currentIndex > prevIndex ? "forward" : "backward";
    setTabState({
      currentTab: activeTab,
      direction: newDirection,
    });
  }

  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(
    null,
  );
  const [detailsRecord, setDetailsRecord] = useState<ServiceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<ServiceRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // --- State: Search & Lookup Flow ---
  const [lookupStep, setLookupStep] = useState<"search" | "form">("search");
  const [searchType, setSearchType] = useState<"plate" | "phone">("plate");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { customer: Customer; vehicle?: Vehicle }[]
  >([]);
  const [searchLogs, setSearchLogs] = useState("");

  const tabCounts = useMemo(() => {
    const counts = { all: records.length, pending: 0, "in-progress": 0, completed: 0, cancelled: 0 };
    records.forEach(r => {
      if (r.status === "pending") counts.pending++;
      else if (r.status === "in-progress") counts["in-progress"]++;
      else if (r.status === "completed") counts.completed++;
      else if (r.status === "cancelled") counts.cancelled++;
    });
    return counts;
  }, [records]);

  const tabs = useMemo(() => [
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
  ], [tabCounts]);

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
    isUnknownMileage: false,
    partsUsed: [],
  });

  const isNewRecordMileageInvalid = !newRecord.isDeadVehicle && !newRecord.isUnknownMileage && (!newRecord.mileage || Number(newRecord.mileage) <= 0);

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

  useEffect(() => {
    setContactMenuOpen(false);
  }, [editingRecord]);

  // Dynamic theme-color effect for mobile status/navigation bars when update or detail modals are active
  useEffect(() => {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }

    const originalColor = metaThemeColor.getAttribute("content") || "#0B0D11";

    if (editingRecord || detailsRecord) {
      // Set to match the immersive full-screen background of the update/details sheet
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
          isUnknownMileage: !!newRecord.isUnknownMileage,
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

  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => { if (v.id) map.set(v.id, v); });
    return map;
  }, [vehicles]);

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => { if (c.id) map.set(c.id, c); });
    return map;
  }, [customers]);

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
      const vehicle = vehicleMap.get(r.vehicleId);
      const customer = customerMap.get(r.customerId);

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
  }, [records, activeTab, searchLogs, vehicleMap, customerMap]);

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
      </header>      {/* Status Tabs & Search */}
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
                    <span className={cn("w-2 h-2 rounded-full shadow-sm shrink-0", activeTabObj.color?.replace("text-", "bg-") || "bg-workshop-secondary")} />
                    <span className="truncate">{activeTabObj.label}</span>
                    <span className="text-[10px] bg-workshop-border/40 text-workshop-muted px-1.5 py-0.5 rounded font-sans font-black tabular-nums">
                      {activeTabObj.count}
                    </span>
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-workshop-muted transition-transform duration-200 shrink-0", filterDropdownOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {filterDropdownOpen && (
                    <>
                      {/* Transparent cover-all backdrop that prevents default highlights */}
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
                                    | "cancelled",
                                );
                                setFilterDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between gap-3 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all select-none text-left cursor-pointer outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]",
                                isActive
                                  ? "text-workshop-accent bg-workshop-surface/80"
                                  : "text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface/45",
                              )}
                            >
                              <span className="flex items-center gap-2.5">
                                <span className={cn("w-1.5 h-1.5 rounded-full shadow-sm shrink-0", tab.color?.replace("text-", "bg-") || "bg-workshop-muted")} />
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

        <div className="relative w-full xl:w-80 group">
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
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="space-y-4 font-sans"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="skeleton-card-m3 p-5 md:p-6 space-y-4"
                >
                  {/* Top: Date and Status Badge placeholder */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-6 skeleton-element-m3" />
                    <div className="flex-1 h-px bg-workshop-border/30" />
                    <div className="w-20 h-6 skeleton-element-m3" />
                  </div>

                  {/* Mid: Customer and Vehicle Info placeholder */}
                  <div className="space-y-2.5">
                    <div className="h-4 w-32 sm:w-40 skeleton-element-m3" />
                    <div className="h-3.5 w-48 sm:w-64 skeleton-element-m3" />
                    <div className="h-3.5 w-24 skeleton-element-m3" />
                  </div>

                  {/* Mid-Lower: Description container placeholder */}
                  <div className="w-full h-16 rounded-xl bg-workshop-surface/10 p-2.5 border border-workshop-border/10 skeleton-element-m3" />

                  {/* Lower: Advisor info */}
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="h-3.5 w-40 skeleton-element-m3" />
                  </div>

                  <div className="h-px bg-workshop-border/30 w-full" />

                  {/* Bottom: Job total and actions buttons */}
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
              {searchLogs
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
              className="space-y-4"
            >
              {filteredRecords.map((record) => {
                const v = vehicleMap.get(record.vehicleId);
                const customer = customerMap.get(record.customerId);
                return (
                  <ServiceRecordCard
                    key={record.id}
                    record={record}
                    v={v}
                    customer={customer}
                    onClick={() => setEditingRecord({ ...record })}
                    onUpdateDetails={(r) => setDetailsRecord({ ...r })}
                    onDelete={handleDeleteRecord}
                  />
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
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                onClick={() => setShowAddModal(false)}
                className="absolute inset-0 bg-workshop-bg/85"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ willChange: "transform, opacity" }}
                className="relative bg-workshop-card w-full max-w-2xl rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[95vh] bg-clip-padding will-change-transform"
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
                              {capitalizeName(res.customer.name)}
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
                      className="w-full py-2 text-workshop-muted/50 text-[10px] font-black uppercase tracking-[0.3em] hover:text-status-urgent transition-colors"
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
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted">
                        Current KM Reading
                      </label>
                      <div className="relative">
                        <input
                          required={!newRecord.isDeadVehicle && !newRecord.isUnknownMileage}
                          type="number"
                          disabled={newRecord.isDeadVehicle || newRecord.isUnknownMileage}
                          value={
                            newRecord.isDeadVehicle || newRecord.isUnknownMileage ? "" : (newRecord.mileage || "")
                          }
                          onChange={(e) =>
                            setNewRecord({
                              ...newRecord,
                              mileage: Number(e.target.value),
                            })
                          }
                          className={cn(
                            "w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text",
                            (newRecord.isDeadVehicle || newRecord.isUnknownMileage) && "opacity-40",
                          )}
                          placeholder={
                            newRecord.isDeadVehicle 
                              ? "N/A - DEAD VEHICLE" 
                              : newRecord.isUnknownMileage 
                                ? "N/A - VEHICLE LOCKED" 
                                : "0"
                          }
                        />
                      </div>

                      {/* Input "0" validation feedback */}
                      {!newRecord.isDeadVehicle && !newRecord.isUnknownMileage && (!newRecord.mileage || Number(newRecord.mileage) <= 0) && (
                        <p className="text-status-urgent text-[10px] font-bold mt-1 uppercase tracking-wider">
                          Odometer reading must be greater than zero
                        </p>
                      )}

                      {/* Status Chips Row */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setNewRecord({
                              ...newRecord,
                              isDeadVehicle: !newRecord.isDeadVehicle,
                              isUnknownMileage: false,
                              mileage: 0,
                            })
                          }
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer",
                            newRecord.isDeadVehicle
                              ? "bg-status-urgent border-status-urgent/40 text-white shadow-lg shadow-status-urgent/20"
                              : "bg-workshop-bg border-workshop-border text-workshop-muted hover:border-status-urgent/50 hover:text-status-urgent"
                          )}
                        >
                          Vehicle Dead
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              newRecord.isDeadVehicle
                                ? "bg-white animate-pulse"
                                : "bg-workshop-muted opacity-30"
                            )}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setNewRecord({
                              ...newRecord,
                              isUnknownMileage: !newRecord.isUnknownMileage,
                              isDeadVehicle: false,
                              mileage: 0,
                            })
                          }
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer",
                            newRecord.isUnknownMileage
                              ? "bg-white border-white text-black shadow-lg shadow-white/15"
                              : "bg-workshop-bg border-workshop-border text-workshop-muted hover:border-white/50 hover:text-white"
                          )}
                        >
                          Unknown (Locked/Alive)
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              newRecord.isUnknownMileage
                                ? "bg-black"
                                : "bg-workshop-muted opacity-30"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted flex items-center gap-1.5">
                        Expected Delivery Date
                        <span className="text-status-urgent">*</span>
                      </label>
                      <MaterialCalendar
                        value={newRecord.expectedDeliveryDate || ""}
                        onChange={(val) =>
                          setNewRecord({
                            ...newRecord,
                            expectedDeliveryDate: val,
                          })
                        }
                        min={new Date().toISOString().split('T')[0]}
                        className="py-2.5 text-workshop-text focus:ring-1 focus:ring-workshop-accent"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-workshop-muted flex items-center gap-1.5">
                        Service Date
                        <span className="text-status-urgent">*</span>
                      </label>
                      <MaterialCalendar
                        value={newRecord.date || ""}
                        onChange={(val) =>
                          setNewRecord({ ...newRecord, date: val })
                        }
                        max={new Date().toISOString().split('T')[0]}
                        className="py-2.5 text-workshop-text focus:ring-1 focus:ring-workshop-accent"
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
                        <button
                          type="button"
                          onClick={() => setAddPartDropdownOpen(!addPartDropdownOpen)}
                          className="w-full h-11 px-4 bg-workshop-surface/40 hover:bg-workshop-surface/60 border border-workshop-border rounded-xl shadow-sm text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-workshop-accent flex items-center justify-between group text-left"
                        >
                          <span className="text-workshop-muted/80 font-medium truncate">
                            + Allocate part...
                          </span>
                          <ChevronDown className={cn("w-4 h-4 text-workshop-muted transition-transform duration-300 shrink-0", addPartDropdownOpen && "rotate-180")} />
                        </button>

                        {/* Close backdrop click outside */}
                        {addPartDropdownOpen && (
                          <div 
                            className="fixed inset-0 z-[120]" 
                            onClick={() => {
                              setAddPartDropdownOpen(false);
                              setAddPartSearchQuery("");
                            }}
                          />
                        )}

                        {/* Floating Combobox Popover */}
                        <AnimatePresence>
                          {addPartDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.99 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.99 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full mt-2 w-full bg-workshop-card border border-workshop-border rounded-2xl shadow-2xl z-[130] overflow-hidden flex flex-col max-h-72"
                            >
                              {/* Search input */}
                              <div className="p-2 border-b border-workshop-border bg-workshop-bg/50 flex items-center gap-2">
                                <Search className="w-4 h-4 text-workshop-muted shrink-0 ml-1.5" />
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Type parts name or category..."
                                  value={addPartSearchQuery}
                                  onChange={(e) => setAddPartSearchQuery(e.target.value)}
                                  className="w-full bg-transparent border-none text-sm text-workshop-text focus:outline-none placeholder:text-workshop-muted/60 py-1"
                                />
                                {addPartSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setAddPartSearchQuery("")}
                                    className="p-1 hover:bg-workshop-surface rounded-md transition-colors"
                                  >
                                    <X className="w-3 h-3 text-workshop-muted hover:text-workshop-text" />
                                  </button>
                                )}
                              </div>

                              {/* Custom list of parts matching query */}
                              <div className="overflow-y-auto max-h-56 p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-workshop-border">
                                {filteredPartsForAdd.length > 0 ? (
                                  filteredPartsForAdd.map((p) => {
                                    const isOutOfStock = p.stockQuantity <= 0;
                                    const isLowStock = !isOutOfStock && p.stockQuantity < 10;
                                    
                                    return (
                                      <button
                                        type="button"
                                        key={p.id}
                                        disabled={isOutOfStock}
                                        onClick={() => {
                                          addPartToRecord(p.id!);
                                        }}
                                        className={cn(
                                          "w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group/item",
                                          isOutOfStock 
                                            ? "opacity-4 relative shadow-none cursor-not-allowed bg-transparent" 
                                            : "hover:bg-workshop-surface/60 active:scale-[0.98]"
                                        )}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-xs text-workshop-text uppercase group-hover/item:text-workshop-accent transition-colors">
                                              {p.name}
                                            </span>
                                            {p.category && (
                                              <span className="text-[9px] bg-workshop-surface text-workshop-muted px-1.5 py-0.5 rounded-md font-mono tracking-wider uppercase">
                                                {p.category}
                                              </span>
                                            )}
                                          </div>
                                          
                                          <div className="flex items-center gap-3 mt-1.5">
                                            {/* Stock levels and status badges */}
                                            {isOutOfStock ? (
                                              <span className="flex items-center gap-1.5 text-[10px] font-black text-status-urgent uppercase tracking-widest">
                                                <span className="w-1.5 h-1.5 bg-status-urgent rounded-full animate-pulse" />
                                                Out of Stock
                                              </span>
                                            ) : isLowStock ? (
                                              <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                                Low Stock: {p.stockQuantity} rem.
                                              </span>
                                            ) : (
                                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-workshop-secondary uppercase tracking-widest opacity-80">
                                                <span className="w-1.5 h-1.5 bg-workshop-accent rounded-full" />
                                                In Stock: {p.stockQuantity}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="text-right pl-3 shrink-0">
                                          <span className="text-xs font-black text-workshop-accent bg-workshop-accent/5 px-2 py-1 rounded-lg border border-workshop-accent/15">
                                            {formatCurrency(p.price)}
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="text-center py-4 text-xs text-workshop-muted italic">
                                    No parts match "{addPartSearchQuery}"
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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
                          value={newRecord.laborCost === 0 ? "" : (newRecord.laborCost || "")}
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
                      disabled={loading || !newRecord.vehicleId || !newRecord.date || !newRecord.expectedDeliveryDate || !newRecord.description || isNewRecordMileageInvalid}
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

      {/* Edit Record Fullscreen Sheet */}
      <AnimatePresence>
        {editingRecord && (
          <Portal>
            <motion.div
              initial={{ x: "100%", opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              style={{ willChange: "transform, opacity" }}
              className="fixed inset-0 z-[100] bg-workshop-bg flex flex-col h-screen w-full overflow-hidden font-sans text-workshop-text"
            >
              {/* Redesigned Premium Clean Top Bar Header */}
              <div className="relative overflow-hidden flex justify-between items-center pl-2 pr-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 bg-workshop-bg border-b border-workshop-border/30 shrink-0 select-none">
                {/* Beautiful Faded Text Silhouette Watermark */}
                <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 pointer-events-none select-none text-[100px] sm:text-[160px] md:text-[196px] font-black text-white/[0.015] tracking-[0.13em] uppercase font-sans whitespace-nowrap z-0">
                  RECORD
                </div>

                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="relative z-10 flex items-center justify-center p-2 rounded-2xl text-workshop-muted hover:text-workshop-text transition-all duration-200 outline-none active:scale-95 group"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-workshop-accent" />
                </button>

                <div className="relative z-10 flex-1 pl-1 flex flex-col justify-center">
                  <span 
                    style={{ fontFamily: "'Google Sans', 'Inter', sans-serif" }}
                    className="text-base font-black text-workshop-accent uppercase tracking-tight leading-none"
                  >
                    {(() => {
                      const vehicle = vehicleMap.get(editingRecord.vehicleId);
                      return vehicle ? `${vehicle.make} ${vehicle.model}` : "";
                    })()}
                  </span>
                </div>

                <div className="relative z-10 flex flex-col items-end gap-1.5 select-none text-right">
                  {/* Service Intake Date */}
                  <div className="text-xs font-bold text-status-success font-sans flex items-center gap-1">
                    <ArrowDown className="w-4 h-4 text-status-success shrink-0" />
                    <span className="font-sans font-black tracking-normal uppercase">
                      {(() => {
                        const dateVal = editingRecord.date || editingRecord.createdAt;
                        if (!dateVal) return "";
                        try {
                          const d = new Date(dateVal);
                          const day = d.getDate();
                          const month = d.toLocaleDateString("en-US", { month: "short" });
                          const year = d.getFullYear();
                          return `${day} ${month} ${year}`;
                        } catch {
                          return "";
                        }
                      })()}
                    </span>
                  </div>

                  {/* Due Date with Up Arrow */}
                  {editingRecord.expectedDeliveryDate && (() => {
                    try {
                      const dueDate = parseISO(editingRecord.expectedDeliveryDate);
                      const today = startOfDay(new Date());
                      const normalizedDueDate = startOfDay(dueDate);
                      const isPast = isAfter(today, normalizedDueDate);
                      const isToday = isSameDay(normalizedDueDate, today);
                      const isOverdue = isPast && !isToday;

                      // Red if overdue, Yellow/Amber if today or days ahead
                      const textColorClass = isOverdue ? "text-status-urgent" : "text-status-pending";

                      const day = dueDate.getDate();
                      const month = dueDate.toLocaleDateString("en-US", { month: "short" });
                      const year = dueDate.getFullYear();

                      return (
                        <div className={cn("text-xs font-bold font-sans flex items-center gap-1", textColorClass)}>
                          <ArrowUp className="w-4 h-4 shrink-0 font-bold" />
                          <span className="font-sans font-black tracking-normal uppercase">
                            {`${day} ${month} ${year}`}
                          </span>
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              </div>

              <form onSubmit={handleUpdateRecord} className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Scrollable Layout Container */}
                <div className="flex-grow overflow-y-auto px-6 py-6 space-y-6 bg-workshop-surface/10 scrollbar-thin">
                  <div className="max-w-4xl mx-auto w-full space-y-5">
                    
                    {/* REDESIGNED COMPACT VEHICLE DETAILS (Left Aligned, status-colored badges) */}
                    {(() => {
                      const vehicle = vehicleMap.get(editingRecord.vehicleId);
                      const customer = customers.find(c => c.id === editingRecord.customerId);
                      const colorFormatted = vehicle?.color 
                        ? vehicle.color.charAt(0).toUpperCase() + vehicle.color.slice(1) 
                        : "No color specified";
                      return (
                        <div className="text-left space-y-1.5 font-sans">
                          <div className="flex flex-row items-baseline justify-between w-full gap-4">
                            {vehicle?.plateNumber ? (
                              <h1 className="text-[31px] sm:text-[55px] md:text-[67px] font-black text-blue-500 tracking-tight uppercase leading-none font-sans truncate">
                                {vehicle.plateNumber}
                              </h1>
                            ) : (
                              <h1 className="text-[31px] sm:text-[55px] md:text-[67px] font-black text-blue-500 tracking-tight uppercase leading-none font-sans truncate">
                                -
                              </h1>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-base sm:text-lg font-bold uppercase tracking-tight text-workshop-text font-sans">
                            <span className="text-workshop-text font-black">{capitalizeName(customer?.name)}</span>
                            <span className="opacity-40 text-workshop-muted font-normal">|</span>
                            <span className="text-workshop-muted font-semibold font-sans">
                              {colorFormatted}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-base sm:text-lg font-bold uppercase tracking-tight font-sans">
                            <span className={cn(
                              "font-sans font-extrabold whitespace-nowrap",
                              editingRecord.isDeadVehicle
                                ? "text-status-urgent italic font-black text-xs uppercase bg-status-urgent/10 border border-status-urgent/20 px-2 py-0.5 rounded"
                                : editingRecord.isUnknownMileage
                                  ? "text-black bg-white border border-white px-2 py-0.5 rounded font-black text-xs uppercase tracking-wider select-none shadow-md shadow-white/5"
                                  : "text-status-pending"
                            )}>
                              {editingRecord.isDeadVehicle
                                ? "Dead"
                                : editingRecord.isUnknownMileage
                                  ? "Locked"
                                  : `${editingRecord.mileage?.toLocaleString() || 0} KM`}
                            </span>

                            {vehicle?.passwordOrPin && (
                              <>
                                <span className="opacity-40 text-workshop-muted font-normal">|</span>
                                <span className="inline-flex items-center gap-1 text-status-success font-extrabold font-sans">
                                  {vehicle.passwordOrPin.toUpperCase() === "KEY" ? (
                                    <Key className="w-4 h-4 text-status-success shrink-0" />
                                  ) : (
                                    <span className="text-status-success font-bold font-sans text-sm select-none pr-0.5">#</span>
                                  )}
                                  <span className="font-sans">
                                    {vehicle.passwordOrPin.toUpperCase() === "KEY" 
                                      ? "Key" 
                                      : `PIN: ${vehicle.passwordOrPin}`}
                                  </span>
                                </span>
                              </>
                            )}
                          </div>

                          {/* Dial Customer quick action with dropdown */}
                          {customer?.phone && (
                            <div className="pt-1.5 relative inline-block text-left select-none">
                              <div className="flex items-center gap-1">
                                <a
                                  href={`tel:${customer.phone}`}
                                  className="inline-flex items-center gap-1.5 p-1.5 px-3 rounded-lg bg-workshop-surface border border-workshop-border/60 hover:border-workshop-accent/50 text-workshop-accent hover:text-workshop-text hover:bg-workshop-surface/80 transition-all text-xs font-bold uppercase tracking-wider font-sans shadow-sm"
                                >
                                  <Phone className="w-3.5 h-3.5 shrink-0" />
                                  <span>Call {capitalizeName(customer.name).split(" ")[0]}</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setContactMenuOpen(!contactMenuOpen);
                                  }}
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg bg-workshop-surface border border-workshop-border/60 hover:border-workshop-accent/50 text-workshop-accent hover:text-workshop-text hover:bg-workshop-surface/80 transition-all shadow-sm cursor-pointer"
                                  id="contact-actions-dropdown"
                                >
                                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", contactMenuOpen && "rotate-180")} />
                                </button>
                              </div>

                              <AnimatePresence>
                                {contactMenuOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-[110]"
                                      onClick={() => setContactMenuOpen(false)}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute left-0 mt-1.5 w-60 rounded-xl bg-workshop-card border border-workshop-border shadow-xl z-[120] overflow-hidden py-1"
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (!customer) return;
                                          try {
                                            const parts = customer.name.split(" ");
                                            const firstName = parts[0] || "";
                                            const lastName = parts.slice(1).join(" ") || "";
                                            
                                            // Format with CRLF as required by RFC 2426 vCard format spec
                                            const vcardLines = [
                                              "BEGIN:VCARD",
                                              "VERSION:3.0",
                                              `N:${lastName};${firstName};;;`,
                                              `FN:${customer.name}`,
                                              `TEL;TYPE=CELL,VOICE:${customer.phone}`,
                                              "END:VCARD"
                                            ];
                                            const vcardContent = vcardLines.join("\r\n");

                                            const blob = new Blob([vcardContent], { type: "text/vcard;charset=utf-8" });
                                            const vcardUrl = window.URL.createObjectURL(blob);
                                            
                                            const link = document.createElement("a");
                                            link.href = vcardUrl;
                                            link.download = `${customer.name.replace(/\s+/g, "_")}.vcf`;
                                            
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(vcardUrl);
                                          } catch (error) {
                                            console.error("Failed to generate and download vCard:", error);
                                          }
                                          setContactMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-workshop-text hover:bg-workshop-surface/80 transition-all cursor-pointer text-left font-sans"
                                        id="add-to-contacts-option"
                                      >
                                        <User className="w-4 h-4 text-workshop-secondary shrink-0" />
                                        <span>Add {capitalizeName(customer.name).split(" ")[0]} to Contacts</span>
                                      </button>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* TWO-COLUMN GRID CONTENT FOR REMAINING FORM CONTROLS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      
                      {/* Left Column: Operations & Mechanical Parts */}
                      <div className="space-y-6">
                      
                      {/* Section 1: Maintenance Checklist */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-workshop-muted">
                            Checklist
                          </label>
                          <span className="text-[11px] text-workshop-accent font-bold bg-workshop-accent/10 px-2 py-0.5 rounded-full">
                            {parseTasks(editingRecord.description).filter(t => t.completed).length}/{parseTasks(editingRecord.description).length} Done
                          </span>
                        </div>
                        
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                          {parseTasks(editingRecord.description).map((task, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleTask(idx)}
                              className={cn(
                                "w-full flex items-center gap-3.5 p-3 rounded-2xl border transition-all text-left outline-none group/btn",
                                task.completed
                                  ? "bg-status-success/5 border-status-success/20 shadow-inner"
                                  : "bg-workshop-surface/30 border-workshop-border hover:border-workshop-accent/30 hover:bg-workshop-surface/50"
                              )}
                            >
                              <div
                                className={cn(
                                  "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all text-xs font-black",
                                  task.completed
                                    ? "bg-status-success border-status-success text-workshop-bg shadow-md shadow-status-success/20"
                                    : "border-workshop-border bg-workshop-bg group-hover/btn:border-workshop-accent/50"
                                )}
                              >
                                {task.completed && (
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 10 10"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-workshop-bg"
                                  >
                                    <path d="M2 5 L4.5 7 L8.5 2.5" />
                                  </svg>
                                )}
                              </div>
                              <span className="relative text-sm font-semibold tracking-tight text-left flex-1 min-w-0">
                                <span className={cn(
                                  "block",
                                  task.completed ? "text-workshop-muted opacity-50 font-normal" : "text-workshop-text font-semibold"
                                )}>
                                  {task.text}
                                </span>
                              </span>
                            </button>
                          ))}
                          {parseTasks(editingRecord.description).length === 0 && (
                            <div className="text-center py-6 border border-dashed border-workshop-border/80 rounded-2xl bg-workshop-surface/15">
                              <p className="text-xs text-workshop-muted font-bold italic">
                                No specific service tasks outlined for this check-in.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Adjust Parts Used */}
                      <div className="space-y-3">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-workshop-muted block px-1">
                          Replaced Parts and Spares
                        </label>
                        
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setEditPartDropdownOpen(!editPartDropdownOpen)}
                            className="w-full h-11 px-4 bg-workshop-surface/40 hover:bg-workshop-surface/60 border border-workshop-border rounded-xl shadow-sm text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-workshop-accent flex items-center justify-between group text-left"
                          >
                            <span className="text-workshop-muted/80 font-medium truncate">
                              Search or select parts...
                            </span>
                            <ChevronDown className={cn("w-4 h-4 text-workshop-muted transition-transform duration-300 shrink-0", editPartDropdownOpen && "rotate-180")} />
                          </button>

                          {/* Close backdrop click outside */}
                          {editPartDropdownOpen && (
                            <div 
                              className="fixed inset-0 z-[120]" 
                              onClick={() => {
                                setEditPartDropdownOpen(false);
                                setEditPartSearchQuery("");
                              }}
                            />
                          )}

                          {/* Floating Combobox Popover */}
                          <AnimatePresence>
                            {editPartDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.99 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.99 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full mt-2 w-full bg-workshop-card border border-workshop-border rounded-2xl shadow-2xl z-[130] overflow-hidden flex flex-col max-h-72"
                              >
                                {/* Search input */}
                                <div className="p-2 border-b border-workshop-border bg-workshop-bg/50 flex items-center gap-2">
                                  <Search className="w-4 h-4 text-workshop-muted shrink-0 ml-1.5" />
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Type parts name or category..."
                                    value={editPartSearchQuery}
                                    onChange={(e) => setEditPartSearchQuery(e.target.value)}
                                    className="w-full bg-transparent border-none text-sm text-workshop-text focus:outline-none placeholder:text-workshop-muted/60 py-1"
                                  />
                                  {editPartSearchQuery && (
                                    <button
                                      type="button"
                                      onClick={() => setEditPartSearchQuery("")}
                                      className="p-1 hover:bg-workshop-surface rounded-md transition-colors"
                                    >
                                      <X className="w-3 h-3 text-workshop-muted hover:text-workshop-text" />
                                    </button>
                                  )}
                                </div>

                                {/* Custom list of parts matching query */}
                                <div className="overflow-y-auto max-h-56 p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-workshop-border">
                                  {filteredPartsForEdit.length > 0 ? (
                                    filteredPartsForEdit.map((p) => {
                                      const isOutOfStock = p.stockQuantity <= 0;
                                      const isLowStock = !isOutOfStock && p.stockQuantity < 10;
                                      
                                      return (
                                        <button
                                          type="button"
                                          key={p.id}
                                          disabled={isOutOfStock}
                                          onClick={() => {
                                            addPartToEditingRecord(p.id!);
                                          }}
                                          className={cn(
                                            "w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group/item",
                                            isOutOfStock 
                                              ? "opacity-4 relative shadow-none cursor-not-allowed bg-transparent" 
                                              : "hover:bg-workshop-surface/60 active:scale-[0.98]"
                                          )}
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-bold text-xs text-workshop-text uppercase group-hover/item:text-workshop-accent transition-colors">
                                                {p.name}
                                              </span>
                                              {p.category && (
                                                <span className="text-[9px] bg-workshop-surface text-workshop-muted px-1.5 py-0.5 rounded-md font-mono tracking-wider uppercase">
                                                  {p.category}
                                                </span>
                                              )}
                                            </div>
                                            
                                            <div className="flex items-center gap-3 mt-1.5">
                                              {/* Stock levels and status badges */}
                                              {isOutOfStock ? (
                                                <span className="flex items-center gap-1.5 text-[10px] font-black text-status-urgent uppercase tracking-widest">
                                                  <span className="w-1.5 h-1.5 bg-status-urgent rounded-full animate-pulse" />
                                                  Out of Stock
                                                </span>
                                              ) : isLowStock ? (
                                                <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                                  Low Stock: {p.stockQuantity} rem.
                                                </span>
                                              ) : (
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-workshop-secondary uppercase tracking-widest opacity-80">
                                                  <span className="w-1.5 h-1.5 bg-workshop-accent rounded-full" />
                                                  In Stock: {p.stockQuantity}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="text-right pl-3 shrink-0">
                                            <span className="text-xs font-black text-workshop-accent bg-workshop-accent/5 px-2 py-1 rounded-lg border border-workshop-accent/15">
                                              {formatCurrency(p.price)}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="text-center py-4 text-xs text-workshop-muted italic">
                                      No parts match "{editPartSearchQuery}"
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                          {editingRecord.partsUsed && editingRecord.partsUsed.length > 0 ? (
                            editingRecord.partsUsed.map((up, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-workshop-surface/20 rounded-2xl border border-workshop-border/60 hover:bg-workshop-surface/30 transition-all shadow-sm"
                              >
                                <div className="flex-1 min-w-0 pr-3">
                                  <p className="text-xs font-bold text-workshop-text truncate">
                                    {up.name}
                                  </p>
                                  <p className="text-[10px] font-bold text-workshop-muted tracking-wide flex items-center gap-1.5 mt-0.5">
                                    <span className="text-workshop-accent">{formatCurrency(up.unitPrice)}</span>
                                    <span>×</span>
                                    <span>{up.quantity} units</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(editingRecord.partsUsed || [])];
                                      if (updated[idx].quantity > 1) {
                                        updated[idx].quantity -= 1;
                                        setEditingRecord({
                                          ...editingRecord,
                                          partsUsed: updated,
                                        });
                                      } else {
                                        setEditingRecord({
                                          ...editingRecord,
                                          partsUsed: updated.filter((_, i) => i !== idx),
                                        });
                                      }
                                    }}
                                    className="w-7 h-7 bg-workshop-surface border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-status-urgent hover:bg-status-urgent/15 hover:border-status-urgent/30 transition-all text-sm outline-none"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-5 text-center font-black text-xs text-workshop-text">
                                    {up.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(editingRecord.partsUsed || [])];
                                      updated[idx].quantity += 1;
                                      setEditingRecord({
                                        ...editingRecord,
                                        partsUsed: updated,
                                      });
                                    }}
                                    className="w-7 h-7 bg-workshop-surface border border-workshop-border rounded-lg flex items-center justify-center font-bold text-workshop-muted hover:text-workshop-accent hover:bg-workshop-accent/15 hover:border-workshop-accent/30 transition-all text-sm outline-none"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-5 border border-dashed border-workshop-border/60 rounded-2xl bg-workshop-surface/5">
                              <p className="text-xs text-workshop-muted italic">
                                No spare parts assigned to this repair.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 3: Final Remarks */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-workshop-muted px-1 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-workshop-secondary" />
                          Final Remarks & Advice
                        </label>
                        <textarea
                          value={editingRecord.finalRemarks || ""}
                          onChange={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              finalRemarks: e.target.value,
                            })
                          }
                          className="w-full bg-workshop-surface/20 border border-workshop-border focus:border-workshop-accent/50 px-4 py-3 rounded-2xl outline-none h-20 resize-none text-sm focus:ring-1 focus:ring-workshop-accent text-workshop-text transition-all placeholder:text-workshop-muted/60"
                          placeholder="Provide advice, parts warranty info, or technical notes for the customer..."
                        />
                      </div>

                    </div>

                    {/* Right Column: Status Picker, Billing & Estimates, Advice */}
                    <div className="space-y-6">

                      {/* Card B: M3 Segmented Status */}
                      <div className="space-y-3">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-workshop-muted px-1 block">
                          service status
                        </label>
                        <div className="grid grid-cols-3 p-1 bg-workshop-card border border-workshop-border rounded-xl shadow-inner gap-1">
                          {["pending", "in-progress", "completed"].map((statusOption) => {
                            const isSelected = editingRecord.status === statusOption;
                            const config = {
                              "pending": { label: "Pending", bg: "bg-status-urgent text-workshop-bg shadow-sm", ring: "border-status-urgent/30 hover:bg-status-urgent/10", icon: Clock },
                              "in-progress": { label: "Working", bg: "bg-status-pending text-workshop-bg shadow-sm", ring: "border-status-pending/30 hover:bg-status-pending/10", icon: Activity },
                              "completed": { label: "Done", bg: "bg-status-success text-workshop-bg shadow-sm", ring: "border-status-success/30 hover:bg-status-success/10", icon: CheckCircle },
                            }[statusOption as "pending" | "in-progress" | "completed"];

                            return (
                              <button
                                key={statusOption}
                                type="button"
                                onClick={() =>
                                  setEditingRecord({ ...editingRecord, status: statusOption as ServiceRecord["status"] })
                                }
                                className={cn(
                                  "py-2 px-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all outline-none",
                                  isSelected
                                    ? `${config.bg} scale-[1.03] z-10 font-black`
                                    : "text-workshop-muted hover:text-workshop-text bg-transparent"
                                )}
                              >
                                <config.icon className="w-3.5 h-3.5" />
                                <span>{config.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card C: Completion Odometer if complete */}
                      {(editingRecord.status === "completed" ||
                        ((editingRecord.completionMileage || 0) > 0)) && (
                        <div className="p-4 bg-workshop-surface border border-workshop-accent/30 rounded-2xl shadow-inner animate-in duration-300 slide-in-from-top-1 fade-in">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-workshop-accent block mb-1.5 font-black">
                            Completion Odometer Reading (KM)
                          </label>
                          <div className="relative">
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
                              className="w-full bg-workshop-bg border border-workshop-accent/20 px-4 py-2.5 rounded-xl outline-none text-sm font-black focus:ring-1 focus:ring-workshop-accent text-workshop-text"
                              placeholder="Final odometer reading..."
                            />
                            <div className="absolute right-3 top-3 text-[10px] uppercase font-bold text-workshop-accent/60">
                              Odo Finish
                            </div>
                          </div>
                          <p className="text-[10px] text-workshop-muted mt-1 px-1">
                            Required to complete job so service metrics compute mileage.
                          </p>
                        </div>
                      )}

                      {/* Card D: Billing Adjustments & Receipt summary */}
                      <div className="space-y-4 font-sans">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-workshop-muted uppercase tracking-wider block px-1">
                            Labor Fee (INR)
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-3 text-xs font-bold text-workshop-muted">
                              ₹
                            </span>
                            <input
                              type="number"
                              value={editingRecord.laborCost === 0 ? "" : (editingRecord.laborCost || "")}
                              onChange={(e) =>
                                setEditingRecord({
                                  ...editingRecord,
                                  laborCost: Number(e.target.value),
                                })
                              }
                              className="w-full bg-workshop-card border border-workshop-border pl-8 pr-4 py-3 rounded-2xl outline-none text-sm font-black focus:ring-1 focus:ring-workshop-accent text-workshop-text transition-all"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* M3 Invoice Tonal Receipt Container */}
                        <div className="p-5 bg-workshop-card border border-workshop-border/80 text-workshop-text rounded-2xl shadow-md space-y-3.5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-workshop-accent/5 rounded-full -mr-10 -mt-10" />
                          
                          <div className="flex items-center gap-2 border-b border-workshop-border/40 pb-2">
                            <Receipt className="w-4 h-4 text-workshop-accent" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-workshop-muted">
                              Billing Invoice Breakdown
                            </span>
                          </div>

                          <div className="space-y-2 text-xs font-medium">
                            <div className="flex justify-between">
                              <span className="text-workshop-muted">Labor Subtotal:</span>
                              <span className="font-semibold">{formatCurrency(editingRecord.laborCost || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-workshop-muted">Parts Subtotal:</span>
                              <span className="font-semibold">
                                {formatCurrency(
                                  (editingRecord.partsUsed || []).reduce(
                                    (acc, p) => acc + p.unitPrice * p.quantity,
                                    0,
                                  ),
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-dashed border-workshop-border/80 flex justify-between font-black text-lg items-baseline">
                            <span className="text-workshop-accent text-[10px] uppercase tracking-wider">
                              ESTIMATED TOTAL
                            </span>
                            <span className="font-sans font-black text-xl tracking-tight text-workshop-accent">
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
                  </div>
                </div>
              </div>

                {/* Fixed Material Sticky Bottom Action Footer Bar */}
                <div className="px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] bg-workshop-bg border-t border-workshop-border/40 flex items-center justify-end gap-3.5 shrink-0 z-20 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="px-6 py-3 border border-workshop-border hover:border-workshop-muted-foreground/30 rounded-2xl text-xs font-bold text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface active:scale-[0.98] transition-all uppercase tracking-widest outline-none"
                  >
                    DISCARD CHANGES
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-8 py-3 bg-workshop-accent text-workshop-bg rounded-2xl text-xs font-black shadow-lg hover:brightness-115 active:scale-[0.98] transition-all uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-55 outline-none"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Record</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
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
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                onClick={() => setDetailsRecord(null)}
                className="absolute inset-0 bg-workshop-bg/85"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ willChange: "transform, opacity" }}
                className="relative bg-workshop-card w-full max-w-lg rounded-xl p-8 shadow-2xl border border-workshop-border overflow-y-auto max-h-[95vh] will-change-transform"
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
                    <MaterialCalendar
                      value={detailsRecord.expectedDeliveryDate || ""}
                      onChange={(val) =>
                        setDetailsRecord({
                          ...detailsRecord,
                          expectedDeliveryDate: val,
                        })
                      }
                      min={new Date().toISOString().split('T')[0]}
                      className="py-3 text-sm font-bold text-workshop-text focus:ring-1 focus:ring-workshop-accent"
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
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                onClick={() => setRecordToDelete(null)}
                className="absolute inset-0 bg-workshop-bg/95"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ willChange: "transform, opacity" }}
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
