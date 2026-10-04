import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Transition } from 'motion/react';
import { Plus } from 'lucide-react';
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
}

/**
 * Memoized Tab Item to eliminate redundant renders across route changes
 */
const NavTabItem = memo(function NavTabItem({
  item,
  isActive,
}: NavTabItemProps) {
  const [measuredTextWidth, setMeasuredTextWidth] = useState<number>(0);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isSm, setIsSm] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 640 : false));

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

    const handleResize = () => {
      setIsSm(window.innerWidth >= 640);
      measureWidth();
    };

    // Use ResizeObserver for batched, jitter-free display scaling and zoom detection
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && textRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(document.documentElement);
    } else {
      window.addEventListener('resize', handleResize, { passive: true });
    }

    if ('fonts' in document) {
      document.fonts.ready.then(measureWidth);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [measureWidth]);

  const accentColor = useMemo(() => getTabAccentColor(item.to), [item.to]);
  const pillClass = useMemo(() => getActiveTabPillClass(item.to), [item.to]);

  const baseDim = isSm ? 48 : 44;
  const activePad = isSm ? 16 : 12;
  const textWidth = measuredTextWidth || Math.max(item.label.length * (isSm ? 8.5 : 7.8), 40);

  const activeWidth = baseDim + textWidth + activePad;
  const targetWidth = isActive ? activeWidth : baseDim;

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
          className={cn(
            "relative flex items-center rounded-full overflow-hidden border-0 border-none outline-none",
            isSm ? "h-12" : "h-11"
          )}
        >
          {/* Instant touch-down circular ripple highlight disk */}
          {!isActive && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-0 m-auto rounded-full bg-workshop-muted/20 opacity-0 group-active:opacity-100 scale-75 group-active:scale-100 transition-all duration-150 pointer-events-none",
                isSm ? "w-12 h-12" : "w-11 h-11"
              )}
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

          {/* Centered Icon Container */}
          <div className={cn(
            "flex items-center justify-center shrink-0 relative z-10",
            isSm ? "w-12 h-12" : "w-11 h-11"
          )}>
            <span
              className={cn(
                "material-symbols-outlined transition-colors select-none",
                isSm ? "text-[26px]" : "text-[24px]",
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
          </div>

          {/* Expanding Label: Dynamically measured for font size and screen zoom */}
          <motion.div
            animate={{
              opacity: isActive ? 1 : 0,
              x: isActive ? 0 : -6,
            }}
            transition={{
              duration: 0.24,
              ease: [0.2, 0, 0, 1],
            }}
            className={cn(
              "relative z-10 overflow-hidden flex items-center whitespace-nowrap select-none shrink-0",
              isSm ? "pr-4" : "pr-3"
            )}
          >
            <span
              ref={textRef}
              className={cn(
                "font-semibold tracking-tight font-google-sans select-none",
                isSm ? "text-sm" : "text-[13px]",
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
  const navigate = useNavigate();

  // Active path memoization to avoid redundant path checking on sub-renders
  const currentPath = location.pathname;
  const isDashboard = currentPath === '/';

  return (
    <div
      className={cn(
        "md:hidden fixed bottom-[calc(0.85rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] left-0 right-0 z-50 flex items-center justify-center px-3 pointer-events-none transition-opacity duration-200",
        isModalOpen && "opacity-0"
      )}
    >
      {/* Floating Action Button (FAB) for Vehicle Intake positioned above the dock on the right side */}
      <AnimatePresence>
        {isDashboard && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="absolute right-4 sm:right-6 bottom-[calc(100%+0.75rem)] sm:bottom-[calc(100%+1rem)] pointer-events-auto z-10"
          >
            <button
              type="button"
              onClick={() => navigate('/intake')}
              title="Vehicle Intake"
              aria-label="Vehicle Intake"
              className="w-14 h-14 rounded-2xl bg-workshop-accent text-workshop-bg shadow-lg shadow-workshop-accent/25 hover:shadow-xl hover:shadow-workshop-accent/35 flex items-center justify-center cursor-pointer border-0 outline-none focus-visible:ring-2 focus-visible:ring-workshop-accent transition-shadow"
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Capsule Dock (GPU accelerated, isolated layout containment) */}
      <nav
        aria-label="Mobile Navigation"
        style={{ contain: 'layout style' }}
        className={cn(
          "pointer-events-auto flex items-center gap-1 sm:gap-2 rounded-full shrink-0 flex-nowrap",
          "bg-bottomnav/95 backdrop-blur-xl transform-gpu",
          "border-0 border-none outline-none ring-0",
          "shadow-[0_12px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.55)]",
          "transition-colors max-w-[calc(100vw-1rem)]",
          "py-1.5 sm:py-2 pl-2.5 sm:pl-3.5 pr-4 sm:pr-5"
        )}
      >
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.to);

          return (
            <NavTabItem
              key={item.to}
              item={item}
              isActive={isActive}
            />
          );
        })}
      </nav>
    </div>
  );
}
