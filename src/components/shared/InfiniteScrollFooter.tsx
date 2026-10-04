import React from 'react';
import { Loader2 } from 'lucide-react';

export interface InfiniteScrollFooterProps {
  sentinelRef: React.Ref<HTMLDivElement>;
  hasMore: boolean;
  isLoadingMore: boolean;
  remainingCount: number;
  onLoadMore: () => void;
  itemName?: string;
}

export function InfiniteScrollFooter({
  sentinelRef,
  hasMore,
  isLoadingMore,
  remainingCount,
  onLoadMore,
  itemName = 'records',
}: InfiniteScrollFooterProps) {
  return (
    <>
      <div ref={sentinelRef} className="h-4 w-full" />
      {hasMore && (
        <div className="flex justify-center pt-2 pb-6">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-workshop-muted text-xs font-bold uppercase tracking-wider py-2">
              <Loader2 className="w-3.5 h-3.5 text-workshop-accent animate-spin shrink-0" />
              <span>Loading {itemName}...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLoadMore}
              className="px-4 py-2 rounded-xl bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 text-workshop-text hover:text-workshop-accent transition-all text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 shadow-sm"
            >
              Load more {itemName} ({remainingCount} remaining)
            </button>
          )}
        </div>
      )}
    </>
  );
}
