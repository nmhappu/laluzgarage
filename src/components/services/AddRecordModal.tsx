import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ChevronRight,
  ChevronDown,
  X,
  ScanHeart,
  User,
  RefreshCw,
} from "lucide-react";
import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db, auth, handleFirestoreError } from "../../lib/firebase";
import { Portal } from "../Portal";
import { MaterialCalendar } from "../ui/MaterialCalendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/CustomSelect";
import type { ServiceRecord, Vehicle, Customer, Part } from "../../types";
import { formatCurrency, cn } from "../../lib/utils";

const capitalizeName = (name?: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export interface AddRecordModalProps {
  showAddModal: boolean;
  setShowAddModal: (val: boolean) => void;
  vehicles: Vehicle[];
  customers: Customer[];
  parts: Part[];
  onRecordAdded: () => Promise<void> | void;
}

export function AddRecordModal({
  showAddModal,
  setShowAddModal,
  vehicles,
  customers,
  parts,
  onRecordAdded,
}: AddRecordModalProps) {
  const [lookupStep, setLookupStep] = useState<"search" | "form">("search");
  const [searchType, setSearchType] = useState<"plate" | "phone">("plate");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ customer: Customer; vehicle?: Vehicle }>
  >([]);

  const [addPartSearchQuery, setAddPartSearchQuery] = useState("");
  const [addPartDropdownOpen, setAddPartDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newRecord, setNewRecord] = useState<Partial<ServiceRecord>>({
    vehicleId: "",
    description: "",
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
    personalItems: "",
  });

  const filteredPartsForAdd = useMemo(() => {
    if (!addPartSearchQuery.trim()) return parts;
    const q = addPartSearchQuery.toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [parts, addPartSearchQuery]);

  // Handle Search Input in Lookup
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const q = query.toLowerCase().trim();
    if (searchType === "plate") {
      const matchedVehicles = vehicles.filter((v) =>
        v.plateNumber.toLowerCase().includes(q)
      );
      const results = matchedVehicles.map((v) => {
        const customer = customers.find((c) => c.id === v.customerId) || {
          id: v.customerId,
          name: "Unknown Customer",
          phone: "",
          technicianId: "",
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
        };
        return { customer, vehicle: v };
      });
      setSearchResults(results);
    } else {
      const matchedCustomers = customers.filter(
        (c) => c.phone.includes(q) || c.name.toLowerCase().includes(q)
      );
      const results: Array<{ customer: Customer; vehicle?: Vehicle }> = [];
      matchedCustomers.forEach((c) => {
        const custVehicles = vehicles.filter((v) => v.customerId === c.id);
        if (custVehicles.length > 0) {
          custVehicles.forEach((v) => results.push({ customer: c, vehicle: v }));
        } else {
          results.push({ customer: c });
        }
      });
      setSearchResults(results);
    }
  };

  const handleSelectResult = (customer: Customer, vehicle?: Vehicle) => {
    if (vehicle) {
      setNewRecord((prev) => ({
        ...prev,
        vehicleId: vehicle.id,
      }));
      setLookupStep("form");
    }
  };

  const addPartToRecord = (partId: string) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;

    const existing = newRecord.partsUsed?.find((p) => p.partId === partId);
    if (existing) {
      setNewRecord({
        ...newRecord,
        partsUsed: newRecord.partsUsed?.map((p) =>
          p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p
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

  const isNewRecordMileageInvalid = useMemo(() => {
    if (newRecord.isDeadVehicle || newRecord.isUnknownMileage) return false;
    return !newRecord.mileage || Number(newRecord.mileage) <= 0;
  }, [newRecord.isDeadVehicle, newRecord.isUnknownMileage, newRecord.mileage]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.vehicleId || !newRecord.description) return;

    const vehicle = vehicles.find((v) => v.id === newRecord.vehicleId);
    if (!vehicle) return;

    setIsSubmitting(true);
    try {
      const partsTotal = (newRecord.partsUsed || []).reduce(
        (acc, p) => acc + p.unitPrice * p.quantity,
        0
      );
      const totalCost = Number(newRecord.laborCost) + partsTotal;

      await runTransaction(db, async (transaction) => {
        const uniquePartIds = Array.from(
          new Set((newRecord.partsUsed || []).map((p) => p.partId))
        ) as string[];
        const partReads = uniquePartIds.map((pid) =>
          transaction.get(doc(db, "parts", pid))
        );

        const partDocs = await Promise.all(partReads);
        const partDataMap: Record<string, number> = {};

        partDocs.forEach((pd) => {
          if (pd.exists()) {
            partDataMap[pd.id] = pd.data().stockQuantity;
          }
        });

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
          date:
            newRecord.date ||
            new Date().toISOString().split("T")[0] + "T" + new Date().toISOString().split("T")[1],
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
        expectedDeliveryDate: "",
        date: new Date().toISOString().split("T")[0],
        isDeadVehicle: false,
        isUnknownMileage: false,
        partsUsed: [],
        personalItems: "",
      });
      setLookupStep("search");
      setSearchQuery("");
      setSearchResults([]);
      await onRecordAdded();
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Intake failed: ${errorMessage}`);
      handleFirestoreError(err, "create", "serviceRecords");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
                    type="button"
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
                      type="button"
                      onClick={() => {
                        setSearchType("plate");
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                        searchType === "plate"
                          ? "bg-workshop-card text-workshop-accent shadow-sm"
                          : "text-workshop-muted hover:text-workshop-text"
                      )}
                    >
                      Plate Number
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchType("phone");
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                        searchType === "phone"
                          ? "bg-workshop-card text-workshop-accent shadow-sm"
                          : "text-workshop-muted hover:text-workshop-text"
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
                              ? "Start typing plate"
                              : "By phone or name"
                          }
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
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
                        type="button"
                        key={`${res.customer.id}-${res.vehicle?.id || i}`}
                        onClick={() => handleSelectResult(res.customer, res.vehicle)}
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
                                  <span
                                    style={{ fontFamily: "'Google Sans', sans-serif" }}
                                    className="font-sans font-bold text-sm text-workshop-secondary uppercase tracking-tighter"
                                  >
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
                        onClick={() => setSearchType(i === 0 ? "plate" : "phone")}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer",
                          t.active
                            ? "bg-workshop-accent/10 border-workshop-accent/30 text-workshop-accent"
                            : "bg-workshop-surface border-workshop-border text-workshop-muted opacity-60"
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
                      type="button"
                      onClick={() => setLookupStep("form")}
                      className="w-full py-2 text-workshop-muted text-[10px] font-black uppercase tracking-[0.3em] hover:text-workshop-accent transition-colors"
                    >
                      Skip to manual entry
                    </button>
                    <button
                      type="button"
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
                        Odometer
                      </label>
                      <div className="relative">
                        <input
                          required={!newRecord.isDeadVehicle && !newRecord.isUnknownMileage}
                          type="number"
                          disabled={newRecord.isDeadVehicle || newRecord.isUnknownMileage}
                          value={
                            newRecord.isDeadVehicle || newRecord.isUnknownMileage
                              ? ""
                              : newRecord.mileage || ""
                          }
                          onChange={(e) =>
                            setNewRecord({
                              ...newRecord,
                              mileage: Number(e.target.value),
                            })
                          }
                          className={cn(
                            "w-full bg-workshop-surface border border-workshop-border px-4 py-2.5 rounded-xl outline-none text-workshop-text",
                            (newRecord.isDeadVehicle || newRecord.isUnknownMileage) && "opacity-40"
                          )}
                          placeholder={
                            newRecord.isDeadVehicle
                              ? "DEAD VEHICLE"
                              : newRecord.isUnknownMileage
                                ? "VEHICLE LOCKED"
                                : "0"
                          }
                        />
                      </div>

                      {!newRecord.isDeadVehicle &&
                        !newRecord.isUnknownMileage &&
                        (!newRecord.mileage || Number(newRecord.mileage) <= 0) && (
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
                          Vehicle Locked
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
                        Estimated Delivery Date
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
                        min={new Date().toISOString().split("T")[0]}
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
                        onChange={(val) => setNewRecord({ ...newRecord, date: val })}
                        max={new Date().toISOString().split("T")[0]}
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
                      <span className="text-[9px] lowercase font-normal opacity-60">
                        Each line becomes a checklist item
                      </span>
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
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 text-workshop-muted transition-transform duration-300 shrink-0",
                              addPartDropdownOpen && "rotate-180"
                            )}
                          />
                        </button>

                        {addPartDropdownOpen && (
                          <div
                            className="fixed inset-0 z-[120]"
                            onClick={() => {
                              setAddPartDropdownOpen(false);
                              setAddPartSearchQuery("");
                            }}
                          />
                        )}

                        <AnimatePresence>
                          {addPartDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.99 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.99 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full mt-2 w-full bg-workshop-card border border-workshop-border rounded-2xl shadow-2xl z-[130] overflow-hidden flex flex-col max-h-72"
                            >
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
                                  const updated = [...(newRecord.partsUsed || [])];
                                  if (updated[idx].quantity > 1) {
                                    updated[idx].quantity -= 1;
                                    setNewRecord({
                                      ...newRecord,
                                      partsUsed: updated,
                                    });
                                  } else {
                                    setNewRecord({
                                      ...newRecord,
                                      partsUsed: updated.filter((_, i) => i !== idx),
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
                                  const updated = [...(newRecord.partsUsed || [])];
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
                          value={newRecord.laborCost === 0 ? "" : newRecord.laborCost || ""}
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
                          <span className="text-workshop-muted">Total Labor</span>
                          <span className="text-workshop-text">
                            {formatCurrency(newRecord.laborCost || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                          <span className="text-workshop-muted">Total Parts</span>
                          <span className="text-workshop-text">
                            {formatCurrency(
                              (newRecord.partsUsed || []).reduce(
                                (acc, p) => acc + p.unitPrice * p.quantity,
                                0
                              )
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
                                  0
                                )
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
                      disabled={
                        isSubmitting ||
                        !newRecord.vehicleId ||
                        !newRecord.date ||
                        !newRecord.expectedDeliveryDate ||
                        !newRecord.description ||
                        isNewRecordMileageInvalid
                      }
                      className="flex-1 px-4 py-4 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-workshop-accent/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
                    >
                      {isSubmitting ? (
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
  );
}
