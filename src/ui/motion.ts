import { useEffect, useRef, useState } from 'react';

const decelerate = (t: number) => {
  // cubic-bezier(0.05, 0.7, 0.1, 1) approximated by a strong ease-out.
  return 1 - Math.pow(1 - t, 4);
};

/** [value], counting up (or down) to each new value over 600ms instead of jumping. */
export function useCountUp(value: number, duration = 600): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const shownRef = useRef(value);
  shownRef.current = shown;
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    from.current = shownRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(from.current + (value - from.current) * decelerate(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}
