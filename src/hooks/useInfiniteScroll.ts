import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface UseInfiniteScrollOptions {
  batchSize?: number;
  resetDependency?: unknown;
}

export function useInfiniteScroll<T>(
  allItems: T[],
  { batchSize = 20, resetDependency }: UseInfiniteScrollOptions = {}
) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null);

  const allItemsRef = useRef(allItems);
  allItemsRef.current = allItems;
  const batchSizeRef = useRef(batchSize);
  batchSizeRef.current = batchSize;

  const totalCount = allItems.length;
  const hasMore = visibleCount < totalCount;
  const remainingCount = Math.max(0, totalCount - visibleCount);

  // Reset visible count when filter/search/tab dependencies change
  useEffect(() => {
    setVisibleCount(batchSize);
    setIsLoadingMore(false);
  }, [resetDependency, batchSize]);

  // Safe loadMore that does not depend on visibleCount in parent closures
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => {
      const next = Math.min(prev + batchSizeRef.current, allItemsRef.current.length);
      return next;
    });
  }, []);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSentinelNode(node);
  }, []);

  useEffect(() => {
    if (!sentinelNode || !hasMore) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !timeoutId) {
          setIsLoadingMore(true);
          // Small debounce (120ms) to ensure smooth transition and avoid burst updates
          timeoutId = setTimeout(() => {
            loadMore();
            setIsLoadingMore(false);
            timeoutId = null;
          }, 120);
        }
      },
      {
        root: null,
        rootMargin: '250px',
        threshold: 0.01,
      }
    );

    observer.observe(sentinelNode);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [sentinelNode, hasMore, loadMore]);

  const visibleItems = useMemo(() => {
    return allItems.slice(0, visibleCount);
  }, [allItems, visibleCount]);

  return {
    visibleItems,
    visibleCount,
    hasMore,
    totalCount,
    remainingCount,
    isLoadingMore,
    loadMore,
    sentinelRef,
  };
}

