import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
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

  const setSearchTerm = (val: string) => {
    setSearchParams(prev => {
      if (!val) {
        prev.delete(queryKey);
      } else {
        prev.set(queryKey, val);
      }
      return prev;
    }, { replace: true });
  };

  const setActiveTab = (val: "all" | "pending" | "in-progress" | "completed" | "cancelled") => {
    setSearchParams(prev => {
      if (val === 'all') {
        prev.delete(statusKey);
      } else {
        prev.set(statusKey, val);
      }
      return prev;
    }, { replace: true });
  };

  return {
    isMobile,
    searchTerm,
    activeTab,
    setSearchTerm,
    setActiveTab,
  };
}
