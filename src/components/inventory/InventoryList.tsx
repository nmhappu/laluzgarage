import { Plus, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Part } from '../../types';
import { PartCard } from './PartCard';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

export interface InventoryListProps {
  parts: Part[];
  loading: boolean;
  onAddClick?: () => void;
  onPartClick: (part: Part) => void;
}

export function InventoryList({
  parts,
  loading,
  onAddClick,
  onPartClick,
}: InventoryListProps) {
  const { 
    visibleItems: visibleParts, 
    sentinelRef, 
    hasMore, 
    isLoadingMore, 
    remainingCount, 
    loadMore 
  } = useInfiniteScroll(parts, {
    batchSize: 20,
    resetDependency: parts.length,
  });

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-workshop-text tracking-tight uppercase">
            Parts Inventory
          </h1>
          <p className="text-workshop-muted text-sm">
            Track and manage shop supplies and spare parts.
          </p>
        </div>
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="flex items-center justify-center gap-2 bg-workshop-accent text-workshop-bg px-5 py-2.5 rounded shadow-lg shadow-workshop-accent/10 font-black uppercase text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ADD PART</span>
          </button>
        )}
      </header>

      <div className="-mx-4 md:-mx-8 lg:-mx-10 overflow-hidden">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.01,
                delayChildren: 0.05,
              },
            },
          }}
          className="divide-y divide-workshop-border/30 accelerate-gpu will-change-transform-opacity"
        >
          <AnimatePresence>
            {visibleParts.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                onClick={() => onPartClick(part)}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {hasMore && (
          <div 
            ref={sentinelRef} 
            className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-workshop-muted"
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
                Load more parts ({remainingCount} remaining)
              </button>
            )}
          </div>
        )}

        {parts.length === 0 && !loading && (
          <div className="py-24 text-center">
            <Tag className="w-12 h-12 text-workshop-muted/20 mx-auto mb-4" />
            <p className="text-workshop-muted text-sm font-bold uppercase tracking-widest">
              No matching assets in inventory
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
