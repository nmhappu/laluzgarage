import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, type Transition } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import {
  navItems,
  getTabAccentColor,
  getActiveTabPillClass,
  type NavItemConfig,
} from './types';

interface MobileBottomNavProps {
  isModalOpen?: boolean;
}

/**
 * Standard Material 3 Motion Curves for fluid, continuous tab expansion
 */
const EXPAND_TRANSITION: Transition = {
  duration: 0.3,
  ease: [0.2, 0, 0, 1],
};

const FADE_TRANSITION: Transition = {
  duration: 0.22,
  ease: 'easeOut',
};

const TAP_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

interface NavTabItemProps {
  key?: string;
  item: NavItemConfig;
  isActive: boolean;
  showBadge: boolean;
  pendingCount?: number;
}

/**
 * Memoized Tab Item to eliminate redundant renders across route and badge changes
 */
const NavTabItem = memo(function NavTabItem({
  item,
  isActive,
  showBadge,
  pendingCount = 0,
}: NavTabItemProps) {
  const [measuredTextWidth, setMeasuredTextWidth] = useState<number>(0);
  const textRef = useRef<HTMLSpanElement>(null);

  // Measure rendered text width without layout thrashing via requestAnimationFrame
  const measureWidth = useCallback(() => {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      if (textRef.current) {
        setMeasuredTextWidth(Math.ceil(textRef.current.scrollWidth));
      }
    });
  }, []);

  useEffect(() => {
    measureWidth();

    // Use ResizeObserver for batched, jitter-free display scaling and zoom detection
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && textRef.current) {
      resizeObserver = new ResizeObserver(() => {
        measureWidth();
      });
      resizeObserver.observe(document.documentElement);
    } else {
      window.addEventListener('resize', measureWidth, { passive: true });
    }

    if ('fonts' in document) {
      document.fonts.ready.then(measureWidth);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', measureWidth);
      }
    };
  }, [measureWidth]);

  const accentColor = useMemo(() => getTabAccentColor(item.to), [item.to]);
  const pillClass = useMemo(() => getActiveTabPillClass(item.to), [item.to]);

  // Fallback estimation if not measured yet (scales comfortably with font size)
  const textWidth = measuredTextWidth || Math.max(item.label.length * 9, 45);

  // Touch target: 48px circle (h-12 w-12) + measured label width + 16px right padding
  const activeWidth = 48 + textWidth + 16;
  const targetWidth = isActive ? activeWidth : 48;

  return (
    <motion.div
      whileTap={{ scale: 0.93 }}
      transition={TAP_TRANSITION}
      className="shrink-0 relative flex items-center justify-center"
    >
      <NavLink
        to={item.to}
        className="relative select-none shrink-0 group focus:outline-none focus:ring-0"
      >
        <motion.div
          animate={{ width: targetWidth }}
          transition={{ width: EXPAND_TRANSITION }}
          style={{ willChange: 'width' }}
          className="relative flex items-center h-12 rounded-full overflow-hidden border-0 border-none outline-none"
        >
          {/* Instant touch-down circular ripple highlight disk */}
          {!isActive && (
            <span
              aria-hidden="true"
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-workshop-muted/20 opacity-0 group-active:opacity-100 scale-75 group-active:scale-100 transition-all duration-150 pointer-events-none"
            />
          )}

          {/* Active Pill Background: 100% borderless fluid container */}
          <motion.div
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={FADE_TRANSITION}
            className={cn(
              "absolute inset-0 rounded-full z-0 border-0 border-none outline-none ring-0 pointer-events-none",
              pillClass
            )}
          />

          {/* Centered Icon Container (Comfortable 48px M3 touch target) */}
          <div className="w-12 h-12 flex items-center justify-center shrink-0 relative z-10">
            <span
              className={cn(
                "material-symbols-outlined transition-colors text-[26px] select-none",
                isActive
                  ? accentColor
                  : "text-workshop-muted group-hover:text-workshop-text"
              )}
              style={{
                fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {item.m3Icon}
            </span>

            {/* Pending Services Notification Badge */}
            {showBadge && (
              <span className="absolute top-1.5 right-1.5 z-20 min-w-[18px] h-[18px] px-1 rounded-full bg-status-urgent text-white text-[10px] font-numeric font-black flex items-center justify-center shadow-xs select-none pointer-events-none">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </div>

          {/* Expanding Label: Dynamically measured for font size and screen zoom */}
          <motion.div
            animate={{
              opacity: isActive ? 1 : 0,
              x: isActive ? 0 : -8,
            }}
            transition={{
              duration: 0.24,
              ease: [0.2, 0, 0, 1],
            }}
            className="relative z-10 overflow-hidden flex items-center whitespace-nowrap select-none shrink-0 pr-4"
          >
            <span
              ref={textRef}
              className={cn(
                "text-sm font-semibold tracking-tight font-google-sans select-none",
                accentColor
              )}
            >
              {item.label}
            </span>
          </motion.div>
        </motion.div>
      </NavLink>
    </motion.div>
  );
});

export function MobileBottomNav({ isModalOpen }: MobileBottomNavProps) {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Active path memoization to avoid redundant path checking on sub-renders
  const currentPath = location.pathname;

  // Real-time listener for active service jobs to display the status badge
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'serviceRecords'),
        where('status', 'in', ['pending', 'in-progress'])
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingCount(snapshot.docs.length);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Failed to attach pending records listener:', e);
    }
  }, []);

  return (
    <div
      className={cn(
        "md:hidden fixed bottom-[calc(0.85rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 flex items-center justify-center px-3 pointer-events-none transition-opacity duration-200",
        isModalOpen && "opacity-0"
      )}
    >
      {/* Main Floating Capsule Dock (GPU accelerated, isolated layout containment) */}
      <nav
        aria-label="Mobile Navigation"
        style={{ contain: 'layout style' }}
        className={cn(
          "pointer-events-auto flex items-center gap-2 p-2 rounded-full shrink-0",
          "bg-bottomnav/95 backdrop-blur-xl transform-gpu",
          "border-0 border-none outline-none ring-0",
          "shadow-[0_12px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.55)]",
          "transition-colors max-w-[calc(100vw-1.5rem)]"
        )}
      >
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.to);

          const showBadge = item.to === '/services' && pendingCount > 0;

          return (
            <NavTabItem
              key={item.to}
              item={item}
              isActive={isActive}
              showBadge={showBadge}
              pendingCount={showBadge ? pendingCount : undefined}
            />
          );
        })}
      </nav>
    </div>
  );
}
