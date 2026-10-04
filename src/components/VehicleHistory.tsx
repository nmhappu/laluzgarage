import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, PlusCircle } from 'lucide-react';
import { useVehicleHistory } from '../hooks/useVehicleHistory';
import { VehicleCard } from './vehicle/VehicleCard';
import { VehicleFormModal } from './vehicle/VehicleFormModal';
import { DeleteVehicleModal } from './vehicle/DeleteVehicleModal';
import { VehicleLedgerDrawer } from './vehicle/VehicleLedgerDrawer';
import { WhatsAppPopup } from './shared/WhatsAppPopup';
import { useResponsiveSearch } from '../hooks/useResponsiveSearch';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useAuth } from '../contexts/AuthContext';
import { getUserRole } from '../types';
import { EmptyState } from './shared/EmptyState';
import { InfiniteScrollFooter } from './shared/InfiniteScrollFooter';

export function VehicleHistory() {
  const {
    customers,
    serviceRecords,
    filteredVehicles,
    loading,
    showAddModal,
    setShowAddModal,
    showEditModal,
    setShowEditModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    selectedVehicleForLedger,
    setSelectedVehicleForLedger,
    newVehicle,
    setNewVehicle,
    editingVehicle,
    setEditingVehicle,
    vehicleToDelete,
    setVehicleToDelete,
    handleAddVehicle,
    handleEditVehicle,
    handleDeleteVehicle
  } = useVehicleHistory();

  const { searchTerm } = useResponsiveSearch();
  const { 
    visibleItems: visibleVehicles, 
    sentinelRef, 
    hasMore, 
    isLoadingMore, 
    remainingCount, 
    loadMore 
  } = useInfiniteScroll(filteredVehicles, {
    batchSize: 20,
    resetDependency: searchTerm,
  });

  const [whatsAppRedirect, setWhatsAppRedirect] = useState<{ name: string; phone: string; url: string } | null>(null);
  const { profile } = useAuth();
  const role = getUserRole(profile);
  const isAdmin = role === "admin";
  const isTechnician = role === "technician" || role === "admin";

  return (
    <div className="space-y-6 pb-24 md:pb-0 font-sans">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-workshop-text tracking-tight uppercase font-sans">Vehicle Registry</h1>
          <p className="text-workshop-muted text-sm font-medium font-sans">Manage workshop vehicles.</p>
        </div>
        {isTechnician && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-workshop-accent text-workshop-bg px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-workshop-accent/25 shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Vehicle</span>
          </button>
        )}
      </header>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeletons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="space-y-4 accelerate-gpu will-change-transform-opacity"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="skeleton-card-m3 p-5 min-h-[140px] flex flex-col sm:flex-row sm:items-center justify-between gap-6"
              >
                {/* Left section: Icon and Titles */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 skeleton-element-m3 shrink-0" />
                  <div className="space-y-2.5">
                    <div className="h-4 w-36 sm:w-48 skeleton-element-m3" />
                    <div className="h-3 w-20 sm:w-28 skeleton-element-m3" />
                  </div>
                </div>

                {/* Middle section: Owner, PIN, and Jobs Done info placeholders */}
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2.5 flex-1 max-w-md sm:justify-center">
                  <div className="space-y-2 min-w-[100px]">
                    <div className="h-2 w-10 skeleton-element-m3" />
                    <div className="h-3.5 w-20 skeleton-element-m3" />
                    <div className="h-2 w-14 skeleton-element-m3" />
                  </div>
                  <div className="space-y-2 min-w-[100px]">
                    <div className="h-2 w-12 skeleton-element-m3" />
                    <div className="h-3.5 w-24 skeleton-element-m3" />
                  </div>
                  <div className="space-y-2 min-w-[100px]">
                    <div className="h-2 w-14 skeleton-element-m3" />
                    <div className="h-3.5 w-16 skeleton-element-m3" />
                  </div>
                </div>

                {/* Right section: Action button placeholders */}
                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  <div className="w-8 h-8 skeleton-element-m3 rounded-lg" />
                  <div className="w-8 h-8 skeleton-element-m3 rounded-lg" />
                  <div className="h-10 w-28 skeleton-element-m3" style={{ borderRadius: '0.75rem' }} />
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="vehicle-list"
            initial="enter"
            animate="center"
            exit="exit"
            variants={{
              enter: { opacity: 0 },
              center: { opacity: 1, transition: { staggerChildren: 0.03 } },
              exit: { opacity: 0 }
            }}
            className="space-y-4 font-sans accelerate-gpu will-change-transform-opacity"
          >
            {visibleVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onSelect={(v) => setSelectedVehicleForLedger(v)}
                onEdit={(v) => {
                  setEditingVehicle(v);
                  setShowEditModal(true);
                }}
                onDelete={(v) => {
                  setVehicleToDelete(v);
                  setShowDeleteConfirm(true);
                }}
                canDelete={isAdmin}
                canEdit={isTechnician}
                onWhatsApp={(info) => setWhatsAppRedirect(info)}
              />
            ))}
            <InfiniteScrollFooter
              sentinelRef={sentinelRef}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              remainingCount={remainingCount}
              onLoadMore={loadMore}
              itemName="vehicles"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && filteredVehicles.length === 0 && (
        <EmptyState
          icon={Car}
          title="No Vehicles Registered"
          description="No vehicle files found matching your search term. Register a vehicle to initiate tracking."
          className="mt-12"
        />
      )}

      {/* Add Vehicle Fullscreen Modal */}
      <AnimatePresence>
        {showAddModal && (
          <VehicleFormModal
            isOpen={showAddModal}
            mode="add"
            onClose={() => setShowAddModal(false)}
            customers={customers}
            vehicleData={newVehicle}
            setVehicleData={setNewVehicle}
            onSubmit={handleAddVehicle}
          />
        )}
      </AnimatePresence>

      {/* Edit Vehicle Fullscreen Modal */}
      <AnimatePresence>
        {showEditModal && editingVehicle && (
          <VehicleFormModal
            isOpen={showEditModal}
            mode="edit"
            onClose={() => setShowEditModal(false)}
            customers={customers}
            vehicleData={editingVehicle}
            setVehicleData={setEditingVehicle}
            onSubmit={handleEditVehicle}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && vehicleToDelete && (
          <DeleteVehicleModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            vehicleToDelete={vehicleToDelete}
            onConfirm={handleDeleteVehicle}
          />
        )}
      </AnimatePresence>

      {/* Vehicle Service Ledger / History Grid Modal */}
      <AnimatePresence>
        {selectedVehicleForLedger && (
          <VehicleLedgerDrawer
            isOpen={!!selectedVehicleForLedger}
            onClose={() => setSelectedVehicleForLedger(null)}
            selectedVehicleForLedger={selectedVehicleForLedger}
            serviceRecords={serviceRecords}
            customers={customers}
          />
        )}
      </AnimatePresence>

      <WhatsAppPopup
        isOpen={whatsAppRedirect !== null}
        onClose={() => setWhatsAppRedirect(null)}
        customerName={whatsAppRedirect?.name || ''}
        customerPhone={whatsAppRedirect?.phone || ''}
        url={whatsAppRedirect?.url || ''}
      />
    </div>
  );
}
