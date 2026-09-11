import { useState, useEffect, useCallback, useDeferredValue, type FormEvent } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useResponsiveSearch } from "../hooks/useResponsiveSearch";
import { useServiceHistory } from "../hooks/useServiceHistory";
import { motion, AnimatePresence } from "motion/react";
import { Search, X } from "lucide-react";
import type { ServiceRecord, Vehicle, Customer } from "../types";
import { getUserRole } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useBackHandler } from "../contexts/UIContext";
import { WhatsAppPopup } from "./WhatsAppPopup";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { ServiceRecordCard } from "./services/ServiceRecordCard";
import { EditRecordSheet } from "./services/EditRecordSheet";
import { EditDetailsModal } from "./services/EditDetailsModal";
import { DeleteRecordModal } from "./services/DeleteRecordModal";
import { DeliveryBillModal, type CompletedJobPayload } from "./services/DeliveryBillModal";
import { ServiceHistoryTabs } from "./services/ServiceHistoryTabs";

const contentVariants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function ServiceHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = getUserRole(profile);
  const isAdmin = role === "admin";
  const isTechnician = role === "technician" || role === "admin";
  const isAssistant = role === "assistant";

  const [searchParams, setSearchParams] = useSearchParams();
  const { searchTerm: stickySearchLogs, setSearchTerm, activeTab, setActiveTab } = useResponsiveSearch();
  const deferredSearch = useDeferredValue(stickySearchLogs);

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

  // Use the encapsulated service history hook
  const {
    records,
    vehicles,
    customers,
    parts,
    loading,
    isUpdating,
    vehicleMap,
    customerMap,
    tabs,
    filteredRecords,
    searchMatchingRecordsCount,
    isSearching,
    fetchData,
    confirmDelete,
    handleUpdateRecord,
    handleUpdateDetails,
  } = useServiceHistory(activeTab, deferredSearch);

  // Editing & Dialog states
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<ServiceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<ServiceRecord | null>(null);
  const [completedJobPopup, setCompletedJobPopup] = useState<CompletedJobPayload | null>(null);
  const [whatsAppRedirect, setWhatsAppRedirect] = useState<{
    name: string;
    phone: string;
    url: string;
    record?: ServiceRecord | null;
    vehicle?: Vehicle | null;
  } | null>(null);

  // Deep-linking via search params & location state
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

  // Prioritized Back Handlers for ServiceHistory overlays
  useBackHandler(() => {
    setWhatsAppRedirect(null);
    return true;
  }, Boolean(whatsAppRedirect), 90);

  useBackHandler(() => {
    setCompletedJobPopup(null);
    return true;
  }, Boolean(completedJobPopup), 85);

  useBackHandler(() => {
    setRecordToDelete(null);
    return true;
  }, Boolean(recordToDelete), 80);

  useBackHandler(() => {
    setDetailsRecord(null);
    return true;
  }, Boolean(detailsRecord), 60);

  useBackHandler(() => {
    closeEditingRecord();
    return true;
  }, Boolean(editingRecord), 50);

  const handleCardClick = useCallback((record: ServiceRecord) => {
    setEditingRecord({ ...record });
  }, []);

  const handleCardUpdateDetails = useCallback((record: ServiceRecord) => {
    setDetailsRecord({ ...record });
  }, []);

  const handleCardDelete = useCallback((record: ServiceRecord) => {
    setRecordToDelete(record);
  }, []);

  const onDeleteConfirm = async () => {
    if (!recordToDelete) return;
    try {
      await confirmDelete(recordToDelete);
      setRecordToDelete(null);
    } catch {
      // Handled in hook
    }
  };

  const onUpdateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      const completedPayload = await handleUpdateRecord(editingRecord);
      closeEditingRecord();
      if (completedPayload) {
        setCompletedJobPopup(completedPayload);
      }
    } catch {
      // Handled in hook
    }
  };

  const onDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!detailsRecord) return;
    try {
      await handleUpdateDetails(detailsRecord);
      setDetailsRecord(null);
    } catch {
      // Handled in hook
    }
  };

  const {
    visibleItems: visibleRecords,
    sentinelRef,
    hasMore,
    isLoadingMore,
    remainingCount,
    loadMore,
  } = useInfiniteScroll(filteredRecords, {
    batchSize: 20,
    resetDependency: `${activeTab}-${deferredSearch}`,
  });

  return (
    <div className="space-y-6 pb-24 md:pb-0">

      {/* Status Tabs Controls */}
      <ServiceHistoryTabs
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Active Search Summary */}
      {isSearching && !loading && filteredRecords.length > 0 && (
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-workshop-surface/60 border border-workshop-border/40 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-workshop-muted min-w-0">
            <Search className="w-3.5 h-3.5 text-workshop-accent shrink-0" />
            <span className="truncate">
              Results for <strong className="text-workshop-text font-bold">"{deferredSearch}"</strong> ({filteredRecords.length} {filteredRecords.length === 1 ? "match" : "matches"}{activeTab !== "all" ? ` in ${activeTab}` : ""})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="text-workshop-muted hover:text-workshop-text text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ml-2 px-2 py-1 rounded-lg hover:bg-workshop-card/80 transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

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
                    <div className="h-4 w-48 skeleton-element-m3" />
                    <div className="h-3 w-32 skeleton-element-m3" />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : filteredRecords.length === 0 ? (
            isSearching && searchMatchingRecordsCount > 0 ? (
              <motion.div
                key="empty-cross-tab-search-state"
                variants={contentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="text-center py-12 px-4 bg-workshop-surface/30 border border-workshop-border border-dashed rounded-xl space-y-3"
              >
                <div className="w-10 h-10 rounded-full bg-workshop-surface border border-workshop-border flex items-center justify-center mx-auto text-workshop-muted">
                  <Search className="w-5 h-5 text-workshop-accent" />
                </div>
                <div className="space-y-1">
                  <p className="text-workshop-text font-bold text-sm">
                    No <span className="capitalize">{activeTab}</span> logs match "{deferredSearch}"
                  </p>
                  <p className="text-workshop-muted text-xs">
                    Found {searchMatchingRecordsCount} matching {searchMatchingRecordsCount === 1 ? "record" : "records"} in other status tabs.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className="px-4 py-2 rounded-xl bg-workshop-accent text-workshop-bg font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    View all {searchMatchingRecordsCount} {searchMatchingRecordsCount === 1 ? "result" : "results"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="px-4 py-2 rounded-xl bg-workshop-surface border border-workshop-border text-workshop-muted hover:text-workshop-text font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                  >
                    Clear search
                  </button>
                </div>
              </motion.div>
            ) : isSearching ? (
              <motion.div
                key="empty-search-state"
                variants={contentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="text-center py-16 px-4 bg-workshop-surface/20 border border-workshop-border border-dashed rounded-xl space-y-3"
              >
                <div className="w-10 h-10 rounded-full bg-workshop-surface border border-workshop-border flex items-center justify-center mx-auto text-workshop-muted">
                  <Search className="w-5 h-5 opacity-40" />
                </div>
                <div className="space-y-1">
                  <p className="text-workshop-text font-bold text-sm">
                    No logs match "{deferredSearch}"
                  </p>
                  <p className="text-workshop-muted text-xs max-w-sm mx-auto">
                    Try searching by customer name, phone number, vehicle plate, model, advisor, problem, or spare parts.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="px-4 py-2 rounded-xl bg-workshop-surface border border-workshop-border text-workshop-text hover:border-workshop-accent/50 hover:text-workshop-accent font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    Clear search
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                variants={contentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="text-center py-16 bg-workshop-surface/20 border border-workshop-border border-dashed rounded-xl"
              >
                <p className="text-workshop-muted text-sm font-medium">
                  No logs match your filter criteria.
                </p>
              </motion.div>
            )
          ) : (
            <motion.div
              key="records-list"
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              className="space-y-3 font-sans"
            >
              {visibleRecords.map((r) => {
                const v = vehicleMap.get(r.vehicleId);
                const c = customerMap.get(r.customerId);

                return (
                  <ServiceRecordCard
                    key={r.id}
                    record={r}
                    v={v}
                    customer={c}
                    onClick={handleCardClick}
                    onUpdateDetails={handleCardUpdateDetails}
                    onDelete={handleCardDelete}
                    canDelete={isAdmin}
                    canEdit={isTechnician}
                    onWhatsAppClick={(record, cust, veh) => {
                      setWhatsAppRedirect({
                        name: cust?.name || "Customer",
                        phone: cust?.phone || "",
                        url: "",
                        record,
                        vehicle: veh,
                      });
                    }}
                  />
                );
              })}

              {/* Infinite Scroll Sentinel */}
              <div ref={sentinelRef} className="h-4 w-full" />

              {hasMore && (
                <div className="flex justify-center pt-2 pb-6">
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2 text-workshop-muted text-xs font-bold uppercase tracking-wider py-2">
                      <div className="w-3 h-3 border-2 border-workshop-accent border-t-transparent rounded-full animate-spin" />
                      Loading records...
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

      {/* Edit Record Fullscreen Sheet */}
      <EditRecordSheet
        editingRecord={editingRecord}
        setEditingRecord={setEditingRecord}
        onClose={closeEditingRecord}
        onSubmit={onUpdateSubmit}
        isUpdating={isUpdating}
        vehicleMap={vehicleMap}
        customers={customers}
        parts={parts}
        readOnly={isAssistant}
        onWhatsAppClick={(record, customer, vehicle) => {
          setWhatsAppRedirect({
            name: customer?.name || "Customer",
            phone: customer?.phone || "",
            url: "",
            record,
            vehicle: vehicle || null,
          });
        }}
      />

      {/* Edit Details Quick Modal */}
      <EditDetailsModal
        detailsRecord={detailsRecord}
        setDetailsRecord={setDetailsRecord}
        onClose={() => setDetailsRecord(null)}
        onSubmit={onDetailsSubmit}
        isUpdating={isUpdating}
      />

      {/* Delete Record Confirmation Modal */}
      <DeleteRecordModal
        recordToDelete={recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirmDelete={onDeleteConfirm}
      />

      {/* Delivery Bill WhatsApp Completion Modal */}
      {completedJobPopup && (
        <DeliveryBillModal
          completedJob={completedJobPopup}
          onClose={() => {
            setCompletedJobPopup(null);
            fetchData();
          }}
        />
      )}

      {/* WhatsApp Preset Routing Modal */}
      {whatsAppRedirect && (
        <WhatsAppPopup
          isOpen={true}
          onClose={() => setWhatsAppRedirect(null)}
          customerName={whatsAppRedirect.name}
          customerPhone={whatsAppRedirect.phone}
          url={whatsAppRedirect.url}
          record={whatsAppRedirect.record}
          vehicle={whatsAppRedirect.vehicle}
        />
      )}
    </div>
  );
}
