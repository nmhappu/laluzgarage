import { useState, useEffect, useCallback, useDeferredValue, type FormEvent } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useResponsiveSearch } from "../hooks/useResponsiveSearch";
import { useServiceHistory } from "../hooks/useServiceHistory";
import { motion, AnimatePresence } from "motion/react";
import { Search, X } from "lucide-react";
import type { ServiceRecord, Vehicle } from "../types";
import { getUserRole } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useBackHandler } from "../contexts/UIContext";
import { WhatsAppPopup } from "./shared/WhatsAppPopup";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { ServiceRecordCard } from "./services/ServiceRecordCard";
import { EditRecordSheet } from "./services/EditRecordSheet";
import { EditDetailsModal } from "./services/EditDetailsModal";
import { DeleteRecordModal } from "./services/DeleteRecordModal";
import { DeliveryBillModal, type CompletedJobPayload } from "./services/DeliveryBillModal";
import { ServiceHistoryTabs } from "./services/ServiceHistoryTabs";
import { EmptyState } from "./shared/EmptyState";
import { InfiniteScrollFooter } from "./shared/InfiniteScrollFooter";
import { cn } from "../lib/utils";

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
  const { searchTerm: stickySearchLogs, setSearchTerm, activeTab, setActiveTab, sortOrder, setSortOrder } = useResponsiveSearch();
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
  } = useServiceHistory(activeTab, deferredSearch, sortOrder);

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
    resetDependency: `${activeTab}-${deferredSearch}-${sortOrder}`,
  });

  return (
    <div className="w-full h-full flex flex-col md:flex-row min-h-0 overflow-hidden relative">
      {/* Master List Pane:
          Mobile: Centered phone layout with dedicated margins (max-w-xl mx-auto w-full)
          Desktop: Adaptive full-width left pane alongside side sheet, scrolling independently
      */}
      <div
        className={cn(
          "flex-1 h-full min-h-0 min-w-0 overflow-y-auto scroll-smooth main-content-scroll",
          "px-4 md:pt-6.5 md:pb-8 md:pl-8 lg:pl-10",
          editingRecord ? "md:pr-6" : "md:pr-8 lg:pr-10"
        )}
      >
        <div className="w-full max-w-xl mx-auto md:max-w-none md:mx-0 space-y-6">
          {/* Status Tabs Controls */}
          <ServiceHistoryTabs
            tabs={tabs}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            sortOrder={sortOrder}
            onToggleSort={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
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
                  <EmptyState
                    key="empty-cross-tab-search-state"
                    variants={contentVariants}
                    icon={Search}
                    iconClassName="text-workshop-accent"
                    className="py-12 bg-workshop-surface/30"
                    title={`No ${activeTab} logs match "${deferredSearch}"`}
                    description={`Found ${searchMatchingRecordsCount} matching ${searchMatchingRecordsCount === 1 ? "record" : "records"} in other status tabs.`}
                    action={
                      <>
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
                      </>
                    }
                  />
                ) : isSearching ? (
                  <EmptyState
                    key="empty-search-state"
                    variants={contentVariants}
                    icon={Search}
                    title={`No logs match "${deferredSearch}"`}
                    description="Try searching by customer name, phone number, vehicle plate, model, advisor, problem, or spare parts."
                    action={
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="px-4 py-2 rounded-xl bg-workshop-surface border border-workshop-border text-workshop-text hover:border-workshop-accent/50 hover:text-workshop-accent font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        Clear search
                      </button>
                    }
                  />
                ) : (
                  <EmptyState
                    key="empty-state"
                    variants={contentVariants}
                    icon={Search}
                    title="No logs found"
                    description="No logs match your filter criteria."
                  />
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
                        isSelected={editingRecord?.id === r.id}
                      />
                    );
                  })}

                  <InfiniteScrollFooter
                    sentinelRef={sentinelRef}
                    hasMore={hasMore}
                    isLoadingMore={isLoadingMore}
                    remainingCount={remainingCount}
                    onLoadMore={loadMore}
                    itemName="records"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Edit Record Sheet (Side Sheet on desktop, Bottom Sheet on mobile via Portal) */}
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
