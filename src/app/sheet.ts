import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export interface SheetSelection {
  job: string | null;
  vehicle: string | null;
  part: string | null;
}

/** Which job, vehicle or part is open in the side sheet (the route says so), for the selected card. */
export function useSheetSelection(): SheetSelection {
  const { pathname } = useLocation();
  return useMemo(() => {
    const [a, b, c] = pathname.split('/').filter(Boolean);
    const id = b && !c ? b : null;
    return { job: a === 'jobs' ? id : null, vehicle: a === 'vehicles' ? id : null, part: a === 'inventory' ? id : null };
  }, [pathname]);
}
