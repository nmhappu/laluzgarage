import React, { useState, useMemo, useDeferredValue, useRef } from "react";
import { motion, type Variants } from "motion/react";
import { format, parseISO, isSameYear } from "date-fns";
import { Calendar, Search, RefreshCw, X, ChevronRight } from "lucide-react";
import { useServiceHistory } from "../../hooks/useServiceHistory";
import type { ServiceRecord, Vehicle, Customer } from "../../types";
import { EditRecordSheet } from "../services/EditRecordSheet";
import { WhatsAppPopup } from "../WhatsAppPopup";
import { cn } from "../../lib/utils";

export interface DateWiseHistoryViewProps {
  pageVariants?: Variants;
  searchQuery?: string;
  onClearSearch?: () => void;
  dateFilter?: string | null;
  onClearDateFilter?: () => void;
}

type StatusFilter = "all" | "pending" | "in-progress" | "completed" | "cancelled";

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

// Status configuration for small colouring blip on the left side
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  completed: {
    color: "#10B981",
    label: "Completed",
  },
  "in-progress": {
    color: "#FBBF24",
    label: "In-Progress",
  },
  pending: {
    color: "#F43F5E",
    label: "Pending",
  },
  cancelled: {
    color: "#94A3B8",
    label: "Cancelled",
  },
};

// Helper to clean and extract first N issues from record description
export function extractFirstIssues(description?: string, limit = 2): string[] {
  if (!description) return [];
  return description
    .split("\n")
    .map((line) => line.replace(/^[-*•\s]*(\[[xXvV\s✓✔]*\]|\d+[\.)])?\s*/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, limit);
}

export function DateWiseHistoryView({
  pageVariants,
  searchQuery = "",
  onClearSearch,
  dateFilter = null,
  onClearDateFilter,
}: DateWiseHistoryViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const deferredSearch = useDeferredValue(searchQuery);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleSelectStatus = (status: StatusFilter) => {
    setStatusFilter(status);
    tabRefs.current[status]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  // Use core service history hook
  const {
    records,
    vehicles,
    customers,
    parts,
    loading,
    isUpdating,
    vehicleMap,
    customerMap,
    fetchData,
    handleUpdateRecord,
  } = useServiceHistory("all", "");

  // Modal / Sheet states for editing record
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [whatsAppRedirect, setWhatsAppRedirect] = useState<{
    name: string;
    phone: string;
    url: string;
    record?: ServiceRecord | null;
    vehicle?: Vehicle | null;
  } | null>(null);

  // Filter records by status, specific date, and search query (including date matching)
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // 1. Status filter
      if (statusFilter !== "all" && record.status !== statusFilter) {
        return false;
      }

      // 2. Specific Date filter (via date picker)
      if (dateFilter) {
        const recordDateStr = record.date ? record.date.split("T")[0] : "";
        if (recordDateStr !== dateFilter) {
          return false;
        }
      }

      // 3. Search text query (supports plate, make, model, customer, description, and date string matching)
      if (deferredSearch.trim()) {
        const query = deferredSearch.toLowerCase().trim();
        const vehicle = vehicleMap.get(record.vehicleId);
        const customer = customerMap.get(record.customerId);

        const plate = vehicle?.plateNumber?.toLowerCase() || "";
        const make = vehicle?.make?.toLowerCase() || "";
        const model = vehicle?.model?.toLowerCase() || "";
        const customerName = customer?.name?.toLowerCase() || "";
        const desc = record.description?.toLowerCase() || "";

        // Check if query matches vehicle, customer, or issues/complaints description
        const matchesEntity =
          plate.includes(query) ||
          make.includes(query) ||
          model.includes(query) ||
          `${make} ${model}`.includes(query) ||
          customerName.includes(query) ||
          desc.includes(query);

        // Check if query matches any date format
        let matchesDate = false;
        if (record.date) {
          const rawDate = record.date.toLowerCase();
          if (rawDate.includes(query)) {
            matchesDate = true;
          } else {
            try {
              const d = parseISO(record.date.split("T")[0]);
              if (!isNaN(d.getTime())) {
                const fullFormatted = format(d, "EEE, d MMM yyyy").toLowerCase(); // "sat, 3 oct 2025"
                const shortFormatted = format(d, "EEE, d MMM").toLowerCase(); // "sat, 3 oct"
                const monthLong = format(d, "MMMM").toLowerCase(); // "october"
                const monthShort = format(d, "MMM").toLowerCase(); // "oct"
                const dayOfWeek = format(d, "EEEE").toLowerCase(); // "saturday"
                const dayShort = format(d, "EEE").toLowerCase(); // "sat"
                const dayNum = format(d, "d"); // "3"
                const dayPadded = format(d, "dd"); // "03"
                const yearNum = format(d, "yyyy"); // "2025"

                if (
                  fullFormatted.includes(query) ||
                  shortFormatted.includes(query) ||
                  monthLong.includes(query) ||
                  monthShort.includes(query) ||
                  dayOfWeek.includes(query) ||
                  dayShort.includes(query) ||
                  query === dayNum ||
                  query === dayPadded ||
                  query === yearNum ||
                  `${dayNum} ${monthShort}`.includes(query) ||
                  `${dayNum} ${monthLong}`.includes(query) ||
                  `${monthShort} ${dayNum}`.includes(query)
                ) {
                  matchesDate = true;
                }
              }
            } catch {
              // Ignore date parsing error
            }
          }
        }

        if (!matchesEntity && !matchesDate) return false;
      }

      return true;
    });
  }, [records, statusFilter, dateFilter, deferredSearch, vehicleMap, customerMap]);

  // Group filtered records by date key (yyyy-MM-dd)
  const groupedRecords = useMemo(() => {
    const groups = new Map<string, { dateObj: Date; items: ServiceRecord[] }>();

    filteredRecords.forEach((record) => {
      // Determine standard date string
      let dateKey = "";
      let dateObj = new Date();

      if (record.date) {
        dateKey = record.date.split("T")[0];
        try {
          dateObj = parseISO(dateKey);
          if (isNaN(dateObj.getTime())) {
            dateObj = new Date(record.date);
          }
        } catch {
          dateObj = new Date();
        }
      } else {
        dateKey = "unknown";
      }

      if (!groups.has(dateKey)) {
        groups.set(dateKey, { dateObj, items: [] });
      }
      groups.get(dateKey)!.items.push(record);
    });

    // Convert map to sorted array (newest date first)
    const sortedGroups = Array.from(groups.entries()).sort(([keyA, valA], [keyB, valB]) => {
      if (keyA === "unknown") return 1;
      if (keyB === "unknown") return -1;
      return valB.dateObj.getTime() - valA.dateObj.getTime();
    });

    return sortedGroups;
  }, [filteredRecords]);

  // Format date header string exactly as in reference: "Sat, 3 Oct", "Mon, 5 Oct"
  const formatDateHeader = (dateObj: Date, dateKey: string) => {
    if (dateKey === "unknown") return "Undated Logs";
    try {
      const now = new Date();
      if (isSameYear(dateObj, now)) {
        return format(dateObj, "EEE, d MMM");
      }
      return format(dateObj, "EEE, d MMM yyyy");
    } catch {
      return dateKey;
    }
  };

  const formatDateFilterLabel = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (!isNaN(d.getTime())) {
        return format(d, "EEE, d MMM yyyy");
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const success = await handleUpdateRecord(editingRecord);
    if (success) {
      setEditingRecord(null);
    }
  };

  return (
    <motion.div
      key="date_history"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full space-y-6 pt-2 pb-12 font-sans"
    >
      {/* Search & Filter Header */}
      <div className="space-y-3">
        {/* Top Control Bar: Status Tabs (Groww / Video Style) + Refresh Button */}
        <div className="flex items-center justify-between border-b border-workshop-border/30 gap-2">
          {/* Scrollable Status Tabs */}
          <div className="flex items-center gap-6 sm:gap-7 overflow-x-auto scrollbar-none min-w-0 pr-2">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  type="button"
                  onClick={() => handleSelectStatus(tab.id)}
                  className={cn(
                    "relative pb-3 pt-2 text-sm whitespace-nowrap select-none cursor-pointer transition-colors outline-none",
                    isActive
                      ? "text-workshop-text font-bold"
                      : "text-workshop-muted font-medium hover:text-workshop-text"
                  )}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="statusTabUnderline"
                      className="absolute bottom-0 inset-x-0 h-[2.5px] bg-workshop-text rounded-full"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Refresh Records Button */}
          <div className="shrink-0 mb-1">
            <button
              type="button"
              onClick={fetchData}
              title="Refresh Records"
              className="p-2 rounded-lg hover:bg-workshop-surface text-workshop-muted hover:text-workshop-text transition-colors cursor-pointer"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Active Search & Date Filter Chips */}
        {(dateFilter || searchQuery) && (
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {dateFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-workshop-accent/15 text-workshop-accent border border-workshop-accent/30 text-xs font-medium">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDateFilterLabel(dateFilter)}</span>
                <button
                  type="button"
                  onClick={onClearDateFilter}
                  className="hover:bg-workshop-accent/25 rounded p-0.5 ml-0.5 cursor-pointer"
                  title="Clear date filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-workshop-surface text-workshop-text border border-workshop-border/60 text-xs font-medium">
                <Search className="w-3.5 h-3.5 text-workshop-muted" />
                <span>"{searchQuery}"</span>
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="hover:bg-workshop-surface/80 rounded p-0.5 ml-0.5 cursor-pointer text-workshop-muted hover:text-workshop-text"
                  title="Clear text search"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                onClearSearch?.();
                onClearDateFilter?.();
              }}
              className="text-xs text-workshop-muted hover:text-workshop-text underline underline-offset-2 ml-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && records.length === 0 && (
        <div className="space-y-6 pt-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-28 bg-workshop-surface/60 rounded animate-pulse" />
              <div className="h-20 w-full bg-workshop-surface/30 rounded-2xl animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && groupedRecords.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-workshop-surface/60 border border-workshop-border/40 flex items-center justify-center text-workshop-muted mb-3">
            <Calendar className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="text-base font-semibold text-workshop-text">No service records found</h3>
          <p className="text-xs text-workshop-muted mt-1 max-w-xs">
            {searchQuery || dateFilter || statusFilter !== "all"
              ? "Try adjusting your search query, date, or status filter."
              : "No service history entries are recorded yet."}
          </p>
        </div>
      )}

      {/* Date-Grouped Timeline List */}
      <div className="space-y-7">
        {groupedRecords.map(([dateKey, { dateObj, items }]) => {
          const formattedHeader = formatDateHeader(dateObj, dateKey);

          return (
            <div key={dateKey} className="space-y-3">
              {/* Date Header: "Sat, 3 Oct", "Mon, 5 Oct" etc. */}
              <h2 className="text-[15px] sm:text-base font-semibold text-white [html[data-theme=light]_&]:text-neutral-900 tracking-normal font-sans">
                {formattedHeader}
              </h2>

              {/* Event Cards under this date */}
              <div className="space-y-2.5">
                {items.map((record) => {
                  const vehicle = vehicleMap.get(record.vehicleId);
                  const plateNumber = vehicle?.plateNumber || "No Plate";
                  const vehicleModel = vehicle
                    ? `${vehicle.make} ${vehicle.model}`.trim()
                    : "Vehicle";

                  const statusConfig =
                    STATUS_CONFIG[record.status] || STATUS_CONFIG.pending;
                  const issues = extractFirstIssues(record.description, 2);

                  return (
                    <motion.div
                      key={record.id}
                      whileHover={{ scale: 1.006 }}
                      whileTap={{ scale: 0.994 }}
                      onClick={() => setEditingRecord(record)}
                      className="rounded-2xl px-5 py-4 flex items-start justify-between cursor-pointer bg-[#0A0D14] hover:bg-[#0E121B] [html[data-theme=light]_&]:bg-workshop-card border border-workshop-border/40 hover:border-workshop-border/80 transition-all shadow-sm group relative overflow-hidden select-none"
                    >
                      {/* Left: Blip and Standard Texting */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1 pr-4">
                        {/* Small status colouring blip on left side */}
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 shadow-sm transition-transform group-hover:scale-110"
                          style={{
                            backgroundColor: statusConfig.color,
                            boxShadow: `0 0 8px ${statusConfig.color}80`,
                          }}
                          title={statusConfig.label}
                        />

                        {/* Text Block: Google Sans, standard texting, no styles */}
                        <div className="min-w-0 flex-1">
                          {/* Main Title: Plate Number */}
                          <h3 className="text-[15px] sm:text-base font-normal text-white [html[data-theme=light]_&]:text-neutral-900 leading-tight font-sans truncate">
                            {plateNumber}
                          </h3>

                          {/* Subtitle: Vehicle Model */}
                          <p className="text-[13px] sm:text-sm font-normal text-neutral-400 [html[data-theme=light]_&]:text-neutral-500 leading-tight mt-1 font-sans truncate">
                            {vehicleModel}
                          </p>

                          {/* First 2 Issues */}
                          {issues.length > 0 && (
                            <div className="mt-2.5 space-y-1">
                              {issues.map((issue, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs sm:text-[13px] font-normal text-neutral-300 [html[data-theme=light]_&]:text-neutral-600 leading-tight font-sans"
                                >
                                  <span className="w-1 h-1 rounded-full bg-neutral-500 [html[data-theme=light]_&]:bg-neutral-400 shrink-0" />
                                  <span className="truncate">{issue}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Clean minimal space with subtle hover chevron */}
                      <div className="shrink-0 flex items-center gap-2 pl-2 self-center">
                        <ChevronRight className="w-4 h-4 text-white/40 [html[data-theme=light]_&]:text-neutral-400 group-hover:text-white/80 [html[data-theme=light]_&]:group-hover:text-neutral-700 transition-colors" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Record Sheet / Viewer Drawer */}
      <EditRecordSheet
        editingRecord={editingRecord}
        setEditingRecord={setEditingRecord}
        onClose={() => setEditingRecord(null)}
        onSubmit={handleRecordSubmit}
        isUpdating={isUpdating}
        vehicleMap={vehicleMap}
        customers={customers}
        parts={parts}
        onWhatsAppClick={(rec, cust, veh) => {
          if (!cust?.phone) return;
          setWhatsAppRedirect({
            name: cust.name,
            phone: cust.phone,
            url: `https://wa.me/${cust.phone.replace(/[^0-9]/g, "")}`,
            record: rec,
            vehicle: veh,
          });
        }}
      />

      {/* WhatsApp Modal Trigger */}
      {whatsAppRedirect && (
        <WhatsAppPopup
          isOpen={Boolean(whatsAppRedirect)}
          onClose={() => setWhatsAppRedirect(null)}
          customerName={whatsAppRedirect.name}
          customerPhone={whatsAppRedirect.phone}
          url={whatsAppRedirect.url}
          record={whatsAppRedirect.record}
          vehicle={whatsAppRedirect.vehicle}
        />
      )}
    </motion.div>
  );
}
