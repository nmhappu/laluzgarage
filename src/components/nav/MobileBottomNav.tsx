import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, type Transition } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import {
  navItems,
  TAB_ACTIVE_WIDTHS,
  getTabAccentColor,
  getActiveTabPillClass,
} from './types';

interface MobileBottomNavProps {
  isModalOpen: boolean;
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

export function MobileBottomNav({ isModalOpen }: MobileBottomNavProps) {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Real-time listener for active service jobs to display the status badge
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'serviceRecords'),
        where('status', 'in', ['pending', 'in-progress'])
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setPendingCount(snapshot.size);
        },
        (err) => {
          console.warn('Pending services count listener error:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Failed to attach pending records listener:', e);
    }
  }, []);

  return (
    <div
      className={cn(
        "md:hidden fixed bottom-[calc(0.85rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 flex items-center justify-center px-3 pointer-events-none transition-[opacity,transform] duration-300 ease-in-out",
        isModalOpen && "opacity-0 translate-y-8 pointer-events-none"
      )}
    >
      {/* Main Floating Capsule Dock */}
      <nav
        aria-label="Mobile Navigation"
        className={cn(
          "pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-full shrink-0",
          "bg-workshop-card/90 backdrop-blur-xl",
          "border-0 border-none outline-none ring-0",
          "shadow-[0_12px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.55)]",
          "transition-colors"
        )}
      >
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

          const showBadge = item.to === '/services' && pendingCount > 0;
          const targetWidth = isActive ? (TAB_ACTIVE_WIDTHS[item.to] ?? 120) : 40;
          const accentColor = getTabAccentColor(item.to);
          const pillClass = getActiveTabPillClass(item.to);

          return (
            <motion.div
              key={item.to}
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
                  className="relative flex items-center h-10 rounded-full overflow-hidden border-0 border-none outline-none"
                >
                  {/* Instant touch-down circular ripple highlight disk */}
                  {!isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-workshop-muted/20 opacity-0 group-active:opacity-100 scale-75 group-active:scale-100 transition-all duration-150 pointer-events-none"
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

                  {/* Centered Icon Container (Fixed 40px circle) */}
                  <div className="w-10 h-10 flex items-center justify-center shrink-0 relative z-10">
                    <span
                      className={cn(
                        "material-symbols-outlined transition-colors text-[22px] select-none",
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
                      <span className="absolute top-1 right-1 z-20 min-w-[17px] h-[17px] px-1 rounded-full bg-status-urgent text-white text-[10px] font-numeric font-black flex items-center justify-center shadow-xs select-none pointer-events-none">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </div>

                  {/* Expanding Label with Continuous Numeric Width */}
                  <motion.div
                    animate={{
                      opacity: isActive ? 1 : 0,
                      x: isActive ? 0 : -8,
                    }}
                    transition={{
                      duration: 0.24,
                      ease: [0.2, 0, 0, 1],
                    }}
                    className="relative z-10 overflow-hidden flex items-center whitespace-nowrap select-none shrink-0 pr-3.5"
                  >
                    <span
                      className={cn(
                        "text-[13px] font-semibold tracking-tight font-google-sans",
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
        })}
      </nav>
    </div>
  );
}
