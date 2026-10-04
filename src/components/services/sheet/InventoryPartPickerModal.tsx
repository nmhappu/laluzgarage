import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, X, AlertCircle, MapPin, Tag, Check } from 'lucide-react';
import { Portal } from '../../ui/Portal';
import { PartFormModal } from '../../inventory/PartFormModal';
import { inventoryService } from '../../../services/inventoryService';
import { formatCurrency, cn } from '../../../lib/utils';
import { useBackHandler } from '../../../contexts/UIContext';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { useIsMobile } from '../../../hooks/useResponsiveSearch';
import { Timestamp } from 'firebase/firestore';
import type { Part, ServiceRecord } from '../../../types';

export interface InventoryPartPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  partsUsed?: ServiceRecord['partsUsed'];
  onSelectPart: (part: Part) => void;
}

export function InventoryPartPickerModal({
  isOpen,
  onClose,
  parts,
  partsUsed = [],
  onSelectPart,
}: InventoryPartPickerModalProps) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPartData, setNewPartData] = useState<Partial<Part>>({
    name: '',
    category: '',
    stockQuantity: 10,
    price: 0,
    minStockLevel: 5,
    location: '',
  });

  const deferredSearch = useDeferredValue(searchQuery);

  // Hardware back button support
  useBackHandler(() => {
    if (showCreateModal) {
      setShowCreateModal(false);
      return true;
    }
    onClose();
    return true;
  }, isOpen, 75);

  // Escape key listener for fast dismissal on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showCreateModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showCreateModal, onClose]);

  const filteredParts = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    if (!q) return parts;
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q))
    );
  }, [parts, deferredSearch]);

  const {
    visibleItems: visibleParts,
    sentinelRef,
    hasMore,
    isLoadingMore,
    remainingCount,
    loadMore,
  } = useInfiniteScroll(filteredParts, {
    batchSize: 25,
    resetDependency: `${deferredSearch}-${filteredParts.length}`,
  });

  // Track quantities already added to this job
  const inJobQuantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of partsUsed) {
      map.set(item.partId, (map.get(item.partId) || 0) + item.quantity);
    }
    return map;
  }, [partsUsed]);

  const handleSelect = (part: Part) => {
    onSelectPart(part);
    onClose();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartData.name) return;
    try {
      const docRef = await inventoryService.addPart(newPartData);
      const createdPart: Part = {
        id: docRef.id,
        name: newPartData.name,
        category: newPartData.category || '',
        stockQuantity: Number(newPartData.stockQuantity || 0),
        price: Number(newPartData.price || 0),
        minStockLevel: Number(newPartData.minStockLevel || 5),
        location: newPartData.location || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      setShowCreateModal(false);
      setNewPartData({
        name: '',
        category: '',
        stockQuantity: 10,
        price: 0,
        minStockLevel: 5,
        location: '',
      });
      // Automatically add new part to the job and return
      onSelectPart(createdPart);
      onClose();
    } catch (err) {
      console.error('Failed to create part:', err);
    }
  };

  const renderSheetContent = () => (
    <>
      {/* Header Bar */}
      <div className="relative overflow-hidden flex items-center justify-between px-5 sm:px-6 py-3.5 bg-workshop-surface border-b border-workshop-border/40 shrink-0 select-none">
        <div className="flex-1 min-w-0 pr-3">
          <h2 className="text-base sm:text-lg font-black font-google-sans text-workshop-accent uppercase tracking-tight leading-tight truncate">
            Parts Inventory
          </h2>
          <p className="text-[10px] sm:text-[11px] font-bold text-workshop-muted uppercase tracking-wider mt-0.5 truncate">
            Tap any part to add to job card
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-workshop-accent text-workshop-bg rounded-lg text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Create Part</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full text-workshop-muted hover:text-workshop-text hover:bg-workshop-card transition-all duration-150 outline-none active:scale-95 group cursor-pointer"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>
      </div>

      {/* Search Bar Only */}
      <div className="px-5 sm:px-6 py-3 bg-workshop-surface/40 border-b border-workshop-border/30 shrink-0">
        <div className="relative w-full flex items-center">
          <Search className="w-4 h-4 text-workshop-muted absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parts by name, category, or code..."
            className="w-full bg-workshop-bg border border-workshop-border/80 focus:border-workshop-accent pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-workshop-text placeholder:text-workshop-muted/50 focus:ring-1 focus:ring-workshop-accent outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 rounded-md text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inventory Parts List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-2">
        <div className="w-full">
          <div className="divide-y divide-workshop-border/30">
            {visibleParts.map((part) => {
              const isOutOfStock = part.stockQuantity <= 0;
              const isLowStock = !isOutOfStock && part.stockQuantity <= (part.minStockLevel ?? 5);
              const inJobQty = inJobQuantities.get(part.id);

              return (
                <div
                  key={part.id}
                  onClick={() => !isOutOfStock && handleSelect(part)}
                  className={cn(
                    'flex items-center justify-between py-3.5 sm:py-4 px-2 sm:px-3 transition-colors group cv-part-row rounded-xl',
                    isOutOfStock
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-workshop-surface/60 cursor-pointer active:scale-[0.99]'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                    <div className="flex-1 min-w-0">
                      <h3
                        className={cn(
                          'text-xs sm:text-sm font-bold text-workshop-text tracking-tight uppercase transition-colors flex items-center gap-2 flex-wrap',
                          !isOutOfStock && 'group-hover:text-workshop-accent'
                        )}
                      >
                        <span>{part.name}</span>
                        {inJobQty && inJobQty > 0 && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-workshop-accent/15 border border-workshop-accent/30 text-workshop-accent px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>{inJobQty} in job</span>
                          </span>
                        )}
                      </h3>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[9px] text-workshop-muted font-bold uppercase tracking-widest opacity-70">
                          {part.category || 'General'}
                        </span>

                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 text-[8px] bg-status-urgent/10 text-status-urgent px-1.5 py-0.5 rounded border border-status-urgent/20 font-black uppercase tracking-wider">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 font-black uppercase tracking-wider animate-pulse">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Low Stock ({part.stockQuantity})
                          </span>
                        ) : null}

                        {part.location && (
                          <>
                            <span className="w-1 h-1 bg-workshop-border rounded-full" />
                            <span className="text-[9px] text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              {part.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end text-right shrink-0">
                    <p className="text-sm sm:text-base font-black text-workshop-text tracking-tight tabular-nums">
                      {formatCurrency(part.price)}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className={cn(
                          'text-[10px] sm:text-xs font-bold tabular-nums',
                          isOutOfStock
                            ? 'text-status-urgent'
                            : isLowStock
                            ? 'text-amber-500'
                            : 'text-status-success'
                        )}
                      >
                        Stock: {part.stockQuantity}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div
              ref={sentinelRef}
              className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-workshop-muted"
            >
              {isLoadingMore ? (
                <div className="flex items-center gap-2 font-bold tracking-widest uppercase text-workshop-accent">
                  <div className="w-4 h-4 border-2 border-workshop-accent border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Loading parts...</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={loadMore}
                  className="px-4 py-2 rounded-xl bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 text-workshop-text hover:text-workshop-accent transition-all text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 shadow-sm"
                >
                  Load more ({remainingCount} remaining)
                </button>
              )}
            </div>
          )}

          {filteredParts.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <Tag className="w-10 h-10 text-workshop-muted/30 mx-auto" />
              <p className="text-workshop-muted text-xs font-bold uppercase tracking-widest">
                No matching parts in inventory
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-workshop-accent text-workshop-bg rounded-xl text-xs font-black uppercase tracking-wider shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Create "{searchQuery.trim()}"</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        {isMobile ? (
          /* Mobile View: Bottom Sheet modal with backdrop */
          <div key="mobile-picker-container" className="fixed inset-0 z-[120] overflow-hidden">
            <motion.div
              key="mobile-picker-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            <motion.div
              key="mobile-picker-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
              className="fixed inset-x-0 bottom-0 z-[121] h-[92dvh] max-h-[92dvh] bg-workshop-surface border-t border-workshop-border/60 rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden font-sans text-workshop-text"
            >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1.5 bg-workshop-muted/30 rounded-full mx-auto my-2.5 shrink-0" />
              {renderSheetContent()}
            </motion.div>
          </div>
        ) : (
          /* Desktop View: Slide-in Side Sheet with Backdrop */
          <div key="desktop-picker-container" className="fixed inset-0 z-[120] flex justify-end overflow-hidden">
            {/* Scrim Backdrop */}
            <motion.div
              key="desktop-picker-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Slide-in Side Sheet */}
            <motion.div
              key="desktop-picker-sheet"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
              className="relative z-10 w-full max-w-[480px] lg:max-w-[540px] xl:max-w-[580px] h-full bg-workshop-surface border-l border-workshop-border/60 shadow-2xl flex flex-col overflow-hidden font-sans text-workshop-text"
            >
              {renderSheetContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create New Part Modal */}
      {showCreateModal && (
        <PartFormModal
          isOpen={showCreateModal}
          mode="add"
          partData={{
            ...newPartData,
            name: newPartData.name || searchQuery.trim(),
          }}
          onChange={setNewPartData}
          onSubmit={handleCreateSubmit}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </Portal>
  );
}
