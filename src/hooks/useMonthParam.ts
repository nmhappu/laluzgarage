import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addMonths, format, startOfMonth } from 'date-fns';

const MONTH_PARAM = 'month';

function parseMonth(value: string | null): Date | null {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

/**
 * Month shown by the "This Month" analytics range, kept in the URL (?month=YYYY-MM)
 * so it carries over to the detail pages. Never moves past the current month.
 */
export function useMonthParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(MONTH_PARAM);

  const monthAnchor = useMemo(() => {
    const parsed = parseMonth(raw);
    const current = startOfMonth(new Date());
    return parsed && parsed < current ? parsed : current;
  }, [raw]);

  const isCurrentMonth = monthAnchor >= startOfMonth(new Date());

  const shiftMonth = useCallback(
    (delta: number) => {
      const next = startOfMonth(addMonths(monthAnchor, delta));
      if (next > startOfMonth(new Date())) return;
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next >= startOfMonth(new Date())) params.delete(MONTH_PARAM);
          else params.set(MONTH_PARAM, format(next, 'yyyy-MM'));
          return params;
        },
        { replace: true }
      );
    },
    [monthAnchor, setSearchParams]
  );

  return { monthAnchor, isCurrentMonth, shiftMonth };
}
