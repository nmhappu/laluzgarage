import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Key,
  Phone,
  ChevronDown,
  UserPlus,
  Search,
  X,
  Minus,
  Plus,
  FileText,
  Clock,
  Activity,
  CheckCircle,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { parseISO, startOfDay, isAfter, isSameDay } from "date-fns";
import { Portal } from "../Portal";
import type { ServiceRecord, Vehicle, Customer, Part } from "../../types";
import { formatCurrency, cn } from "../../lib/utils";
import { openCreateContactScreen } from "../../services/contactService";

const capitalizeName = (name?: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export interface EditRecordSheetProps {
  editingRecord: ServiceRecord | null;
  setEditingRecord: React.Dispatch<React.SetStateAction<ServiceRecord | null>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isUpdating: boolean;
  vehicleMap: Map<string, Vehicle>;
  customers: Customer[];
  parts: Part[];
  onWhatsAppClick: (record: ServiceRecord, customer?: Customer, vehicle?: Vehicle) => void;
}

export function EditRecordSheet({
  editingRecord,
  setEditingRecord,
  onClose,
  onSubmit,
  isUpdating,
  vehicleMap,
  customers,
  parts,
  onWhatsAppClick,
}: EditRecordSheetProps) {
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [editPartSearchQuery, setEditPartSearchQuery] = useState("");
  const [editPartDropdownOpen, setEditPartDropdownOpen] = useState(false);

  const filteredPartsForEdit = useMemo(() => {
    if (!editPartSearchQuery.trim()) return parts;
    const q = editPartSearchQuery.toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [parts, editPartSearchQuery]);

  const parseTasks = (description: string) => {
    if (!description) return [];
    return description
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const isCompleted = line.startsWith("[x] ");
        const text = isCompleted
          ? line.substring(4)
          : line.startsWith("[ ] ")
            ? line.substring(4)
            : line;
        return { text, completed: isCompleted };
      });
  };

  const stringifyTasks = (tasks: { text: string; completed: boolean }[]) => {
    return tasks.map((t) => `${t.completed ? "[x]" : "[ ]"} ${t.text}`).join("\n");
  };

  const toggleTask = (index: number) => {
    if (!editingRecord) return;
    const tasks = parseTasks(editingRecord.description);
    if (tasks[index]) {
      tasks[index].completed = !tasks[index].completed;
      setEditingRecord({
        ...editingRecord,
        description: stringifyTasks(tasks),
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
          p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p
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

  return (
    <AnimatePresence>
      {editingRecord && (
        <Portal>
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
            className="viewport-fill z-[100] bg-workshop-bg flex flex-col w-full overflow-hidden font-sans text-workshop-text"
          >
            {/* Redesigned Premium Clean Top Bar Header */}
            <div className="relative overflow-hidden flex justify-between items-center pl-2 pr-6 sheet-header-safe pb-4 bg-workshop-bg border-b border-workshop-border/30 shrink-0 select-none">
              {/* Faded Text Silhouette Watermark */}
              <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 pointer-events-none select-none text-[100px] sm:text-[160px] md:text-[196px] font-black text-white/[0.015] tracking-[0.13em] uppercase font-sans whitespace-nowrap z-0">
                RECORD
              </div>

              <button
                type="button"
                onClick={onClose}
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
                        const d = new Date(dateVal as string);
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
                {editingRecord.expectedDeliveryDate &&
                  (() => {
                    try {
                      const dueDate = parseISO(editingRecord.expectedDeliveryDate);
                      const today = startOfDay(new Date());
                      const normalizedDueDate = startOfDay(dueDate);
                      const isPast = isAfter(today, normalizedDueDate);
                      const isToday = isSameDay(normalizedDueDate, today);
                      const isOverdue = isPast && !isToday;
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

            <form onSubmit={onSubmit} className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Scrollable Layout Container */}
              <div className="flex-grow overflow-y-auto px-6 py-6 space-y-6 bg-workshop-surface/10 scrollbar-thin">
                <div className="max-w-4xl mx-auto w-full space-y-5">
                  {/* Compact Vehicle Details */}
                  {(() => {
                    const vehicle = vehicleMap.get(editingRecord.vehicleId);
                    const customer = customers.find((c) => c.id === editingRecord.customerId);
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
                          <span
                            className={cn(
                              "font-sans font-extrabold whitespace-nowrap",
                              editingRecord.isDeadVehicle
                                ? "text-status-urgent italic font-black text-xs uppercase bg-status-urgent/10 border border-status-urgent/20 px-2 py-0.5 rounded"
                                : editingRecord.isUnknownMileage
                                  ? "text-black bg-white border border-white px-2 py-0.5 rounded font-black text-xs uppercase tracking-wider select-none shadow-md shadow-white/5"
                                  : "text-status-pending"
                            )}
                          >
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
                                  <span className="text-status-success font-bold font-sans text-base select-none pr-0.5">#</span>
                                )}
                                <span className="font-sans text-base sm:text-lg">
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
                                <ChevronDown
                                  className={cn(
                                    "w-4 h-4 transition-transform duration-200",
                                    contactMenuOpen && "rotate-180"
                                  )}
                                />
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
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!customer) return;
                                        setContactMenuOpen(false);

                                        const vehicleInfo = vehicle
                                          ? `${vehicle.make ? vehicle.make + " " : ""}${vehicle.model}${vehicle.plateNumber ? ` (${vehicle.plateNumber})` : ""}`
                                          : undefined;

                                        await openCreateContactScreen({
                                          name: customer.name,
                                          phone: customer.phone,
                                          vehicleInfo,
                                        });
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-workshop-text hover:bg-workshop-surface/80 transition-all cursor-pointer text-left font-sans"
                                      id="add-to-contacts-option"
                                    >
                                      <UserPlus className="w-4 h-4 text-workshop-secondary shrink-0" />
                                      <span>Add {capitalizeName(customer.name).split(" ")[0]} to Contacts</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setContactMenuOpen(false);
                                        onWhatsAppClick(editingRecord, customer, vehicle || undefined);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-workshop-text hover:bg-workshop-surface/80 transition-all cursor-pointer text-left font-sans outline-none border-0"
                                      id="whatsapp-update-option"
                                    >
                                      <img
                                        src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/whatsapp-light.svg"
                                        alt="WhatsApp"
                                        className="w-4 h-4 shrink-0"
                                        referrerPolicy="no-referrer"
                                      />
                                      <span>WhatsApp Options</span>
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

                  {/* Two-Column Form Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Checklist & Parts */}
                    <div className="space-y-6">
                      {/* Maintenance Checklist */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-workshop-muted">
                            Checklist
                          </label>
                          <span className="text-[11px] text-workshop-accent font-bold bg-workshop-accent/10 px-2 py-0.5 rounded-full">
                            {parseTasks(editingRecord.description).filter((t) => t.completed).length}/
                            {parseTasks(editingRecord.description).length} Done
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
                                <span
                                  className={cn(
                                    "block",
                                    task.completed
                                      ? "text-workshop-muted opacity-50 font-normal"
                                      : "text-workshop-text font-semibold"
                                  )}
                                >
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

                      {/* Replaced Parts */}
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
                              Select parts...
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 text-workshop-muted transition-transform duration-300 shrink-0",
                                editPartDropdownOpen && "rotate-180"
                              )}
                            />
                          </button>

                          {editPartDropdownOpen && (
                            <div
                              className="fixed inset-0 z-[120]"
                              onClick={() => {
                                setEditPartDropdownOpen(false);
                                setEditPartSearchQuery("");
                              }}
                            />
                          )}

                          <AnimatePresence>
                            {editPartDropdownOpen && (
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

                      {/* Final Remarks */}
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

                    {/* Right Column: Status, Odometer, Financial Summary */}
                    <div className="space-y-6">
                      {/* Segmented Status */}
                      <div className="space-y-3">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-workshop-muted px-1 block">
                          service status
                        </label>
                        <div className="grid grid-cols-3 p-1 bg-workshop-card border border-workshop-border rounded-xl shadow-inner gap-1">
                          {["pending", "in-progress", "completed"].map((statusOption) => {
                            const isSelected = editingRecord.status === statusOption;
                            const config = {
                              pending: {
                                label: "Pending",
                                bg: "bg-status-urgent text-workshop-bg shadow-sm",
                                icon: Clock,
                              },
                              "in-progress": {
                                label: "Working",
                                bg: "bg-status-pending text-workshop-bg shadow-sm",
                                icon: Activity,
                              },
                              completed: {
                                label: "Done",
                                bg: "bg-status-success text-workshop-bg shadow-sm",
                                icon: CheckCircle,
                              },
                            }[statusOption as "pending" | "in-progress" | "completed"];

                            return (
                              <button
                                key={statusOption}
                                type="button"
                                onClick={() =>
                                  setEditingRecord({
                                    ...editingRecord,
                                    status: statusOption as ServiceRecord["status"],
                                  })
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

                      {/* Completion Odometer */}
                      {(editingRecord.status === "completed" ||
                        (editingRecord.completionMileage || 0) > 0) && (
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

                      {/* Billing Adjustments & Receipt summary */}
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
                              value={editingRecord.laborCost === 0 ? "" : editingRecord.laborCost || ""}
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
                                    0
                                  )
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
                                    0
                                  )
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
              <div className="px-6 pt-5 sheet-footer-safe bg-workshop-bg border-t border-workshop-border/40 flex items-center justify-end gap-3.5 shrink-0 z-20 shadow-lg">
                <button
                  type="button"
                  onClick={onClose}
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
  );
}
