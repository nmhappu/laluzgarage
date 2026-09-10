import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(max-width: 767px)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
}

export function useResponsiveSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  // Desktop uses 'q' / 'status'
  // Mobile uses 'qm' / 'status_m'
  const queryKey = isMobile ? 'qm' : 'q';
  const statusKey = isMobile ? 'status_m' : 'status';

  const searchTerm = searchParams.get(queryKey) || '';
  const activeTab = (searchParams.get(statusKey) || 'all') as "all" | "pending" | "in-progress" | "completed" | "cancelled";

  const setSearchTerm = useCallback((val: string) => {
    setSearchParams(prev => {
      if (!val) {
        prev.delete(queryKey);
      } else {
        prev.set(queryKey, val);
      }
      return prev;
    }, { replace: true });
  }, [queryKey, setSearchParams]);

  const setActiveTab = useCallback((val: "all" | "pending" | "in-progress" | "completed" | "cancelled") => {
    setSearchParams(prev => {
      if (val === 'all') {
        prev.delete(statusKey);
      } else {
        prev.set(statusKey, val);
      }
      return prev;
    }, { replace: true });
  }, [statusKey, setSearchParams]);

  return {
    isMobile,
    searchTerm,
    activeTab,
    setSearchTerm,
    setActiveTab,
  };
}
