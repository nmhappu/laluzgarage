import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, PlusCircle } from 'lucide-react';
import { useVehicleHistory } from '../hooks/useVehicleHistory';
import { VehicleCard } from './vehicle/VehicleCard';
import { AddVehicleModal } from './vehicle/AddVehicleModal';
import { EditVehicleModal } from './vehicle/EditVehicleModal';
import { DeleteVehicleModal } from './vehicle/DeleteVehicleModal';
import { VehicleLedgerDrawer } from './vehicle/VehicleLedgerDrawer';
import { WhatsAppPopup } from './WhatsAppPopup';
import { useResponsiveSearch } from '../hooks/useResponsiveSearch';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

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

  return (
    <div className="space-y-6 pb-24 md:pb-0 font-sans">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-workshop-text tracking-tight uppercase font-sans">Vehicle Registry</h1>
          <p className="text-workshop-muted text-sm font-medium font-sans">Manage workshop vehicles.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-workshop-accent text-workshop-bg px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-workshop-accent/25 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register Vehicle</span>
        </button>
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
                onWhatsApp={(info) => setWhatsAppRedirect(info)}
              />
            ))}
            {hasMore && (
              <div 
                ref={sentinelRef} 
                className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-workshop-muted"
              >
                {isLoadingMore ? (
                  <div className="flex items-center gap-2 font-bold tracking-widest uppercase text-workshop-accent">
                    <div className="w-4 h-4 border-2 border-workshop-accent border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Loading vehicles...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={loadMore}
                    className="px-4 py-2 rounded-xl bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 text-workshop-text hover:text-workshop-accent transition-all text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 shadow-sm"
                  >
                    Load more vehicles ({remainingCount} remaining)
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && filteredVehicles.length === 0 && (
        <div className="text-center py-20 bg-workshop-card/30 border border-workshop-border border-dashed rounded-xl max-w-xl mx-auto p-10 mt-12">
          <Car className="w-12 h-12 text-workshop-muted mx-auto opacity-20 mb-4" />
          <h3 className="text-workshop-text font-black uppercase tracking-tight mb-1">No Vehicles Registered</h3>
          <p className="text-workshop-muted text-sm max-w-xs mx-auto leading-relaxed">No vehicle files found matching your search term. Register a vehicle to initiate tracking.</p>
        </div>
      )}

      {/* Add Vehicle Fullscreen Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddVehicleModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            customers={customers}
            newVehicle={newVehicle}
            setNewVehicle={setNewVehicle}
            onSubmit={handleAddVehicle}
          />
        )}
      </AnimatePresence>

      {/* Edit Vehicle Fullscreen Modal */}
      <AnimatePresence>
        {showEditModal && editingVehicle && (
          <EditVehicleModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            editingVehicle={editingVehicle}
            setEditingVehicle={setEditingVehicle}
            customers={customers}
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
