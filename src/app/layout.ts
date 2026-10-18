import { useSyncExternalStore } from 'react';

/**
 * Window classes from the tablet spec (Material 3 breakpoints):
 * - compact  < 600: the phone layout with the floating toolbar
 * - medium   600–839: collapsed 96px rail, one pane
 * - expanded 840–1199: collapsed rail, two panes
 * - large    ≥ 1200: expanded 220px rail with the extended FAB, two panes
 */
export type WindowClass = 'compact' | 'medium' | 'expanded' | 'large';

function classOf(width: number): WindowClass {
  if (width < 600) return 'compact';
  if (width < 840) return 'medium';
  if (width < 1200) return 'expanded';
  return 'large';
}

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

export function useWindowClass(): WindowClass {
  return useSyncExternalStore(subscribe, () => classOf(window.innerWidth), () => 'large');
}

export interface Layout {
  windowClass: WindowClass;
  /** Floating toolbar (phones) instead of a rail. */
  isCompact: boolean;
  /** Any rail. */
  hasRail: boolean;
  /** The 220px rail with labels and the extended FAB. */
  railExpanded: boolean;
  /** List and detail side by side (Vehicles, Inventory, Settings, Dashboard columns). */
  twoPane: boolean;
  /** Services as three status columns. */
  board: boolean;
  /** The side sheet shares the screen with the content (large); otherwise it is modal over a scrim. */
  coplanarSheet: boolean;
}

const LAYOUTS = Object.fromEntries(
  (['compact', 'medium', 'expanded', 'large'] as const).map((windowClass): [WindowClass, Layout] => [
    windowClass,
    {
      windowClass,
      isCompact: windowClass === 'compact',
      hasRail: windowClass !== 'compact',
      railExpanded: windowClass === 'large',
      twoPane: windowClass === 'expanded' || windowClass === 'large',
      board: windowClass === 'large',
      coplanarSheet: windowClass === 'large',
    },
  ])
) as Record<WindowClass, Layout>;

/** One shared object per window class, so memoized screens skip renders while the class holds. */
export function useLayout(): Layout {
  return LAYOUTS[useWindowClass()];
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
