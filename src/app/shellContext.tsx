import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Account } from '../ui/chrome';

export interface ShellContextValue {
  account: Account;
  /** Expands / collapses the phone toolbar from a tab's scroll. */
  setToolbarExpanded: (expanded: boolean) => void;
  openAddPart: () => void;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used inside the app shell');
  return ctx;
}

/**
 * The in-app back arrow: the previous entry when the app put one there, else [fallback] (a deep
 * link or a reload has nothing to go back to).
 */
export function useBack(fallback: string): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}

/**
 * Collapses the floating toolbar after a sustained scroll down and expands it after a sustained
 * scroll up (32px of travel either way), and always at the top (rememberToolbarScrollConnection).
 */
export function useToolbarScroll(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  const { setToolbarExpanded } = useShell();
  const last = useRef(0);
  const travelled = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    last.current = el.scrollTop;
    const onScroll = () => {
      const y = el.scrollTop;
      const dy = y - last.current;
      last.current = y;
      if (y <= 0) {
        travelled.current = 0;
        setToolbarExpanded(true);
        return;
      }
      if (travelled.current !== 0 && travelled.current > 0 !== dy > 0) travelled.current = 0;
      travelled.current += dy;
      if (travelled.current > 32) {
        setToolbarExpanded(false);
        travelled.current = 0;
      } else if (travelled.current < -32) {
        setToolbarExpanded(true);
        travelled.current = 0;
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [ref, active, setToolbarExpanded]);
}
