import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

/** System / Light / Dark, persisted on this device (ThemePreferences.kt). No Material You on the web. */
export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODE_LABEL: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };

const MODE_KEY = 'theme_mode';
const LEGACY_KEY = 'theme';
const SURFACE = { dark: '#07080A', light: '#F1F5F9' };
const REVEAL_MS = 750;

function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'light' || legacy === 'dark') return legacy;
  } catch {
    // Storage blocked: follow the system.
  }
  return 'system';
}

const systemQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  /** Changes the mode; the new theme grows out of [origin] (an element or a point) as a circle. */
  setMode: (mode: ThemeMode, origin?: Element | { x: number; y: number } | null) => void;
  /** Flips whatever is showing now to the other theme (login and Settings top bar). */
  toggle: (origin?: Element | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyToDocument(dark: boolean) {
  const root = document.documentElement;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', dark ? SURFACE.dark : SURFACE.light);
}

function originPoint(origin?: Element | { x: number; y: number } | null): { x: number; y: number } {
  if (origin && 'getBoundingClientRect' in origin) {
    const r = origin.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  } else if (origin && 'x' in origin) {
    return origin;
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [systemDark, setSystemDark] = useState(() => systemQuery().matches);
  const revealing = useRef(false);
  const isDark = mode === 'dark' || (mode === 'system' && systemDark);

  useEffect(() => {
    const mq = systemQuery();
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useLayoutEffect(() => {
    applyToDocument(isDark);
  }, [isDark]);

  const setMode = useCallback(
    (next: ThemeMode, origin?: Element | { x: number; y: number } | null) => {
      try {
        localStorage.setItem(MODE_KEY, next);
      } catch {
        // Not persisted; still applies for this visit.
      }
      const nextDark = next === 'dark' || (next === 'system' && systemQuery().matches);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (nextDark === isDark || !document.startViewTransition || reduced || revealing.current) {
        setModeState(next);
        return;
      }
      const { x, y } = originPoint(origin);
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 10;
      revealing.current = true;
      const transition = document.startViewTransition(() => {
        flushSync(() => setModeState(next));
        applyToDocument(nextDark);
      });
      transition.ready
        .then(() => {
          document.documentElement.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: REVEAL_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)', pseudoElement: '::view-transition-new(root)', fill: 'forwards' }
          );
        })
        .catch(() => undefined);
      transition.finished.finally(() => {
        revealing.current = false;
      });
    },
    [isDark]
  );

  const toggle = useCallback((origin?: Element | null) => setMode(isDark ? 'light' : 'dark', origin), [isDark, setMode]);

  const value = useMemo(() => ({ mode, isDark, setMode, toggle }), [mode, isDark, setMode, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
