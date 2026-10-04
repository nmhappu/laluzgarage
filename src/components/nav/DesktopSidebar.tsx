import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { getHighQualityAvatarUrl } from '../../lib/avatar';
import { getUserRole } from '../../types';
import { LzLightningIcon } from '../ui/LzLightningIcon';
import {
  navItems,
  getRoleRingClass,
  getRoleFallbackStyle,
  getRoleLabel,
  getActiveTabPillClass,
  getTabAccentColor,
  type NavItemConfig,
} from './types';

interface DesktopSidebarProps {
  isModalOpen: boolean;
  onLogoutClick: () => void;
}

const STORAGE_KEY = 'm3_nav_rail_expanded';

// Material Design 3 Standard Motion Curve
const M3_EASE = [0.2, 0, 0, 1] as const;
const M3_TRANSITION = {
  duration: 0.28,
  ease: M3_EASE,
};

/**
 * Material Design 3 Navigation Rail for Desktop View
 * Reference: external-items/mbs2h57x-GM3_Expressive_Nav-Rail_Overview_01_IA_v02.mp4
 *
 * Exact Movement & Spacing from the Reference Video:
 * 1. Horizontal Anchor: Menu, FAB icon, and destination icons maintain identical
 *    X coordinate (X = 40px center line in 80px rail and 240px rail with px-3).
 * 2. Vertical Spacing & Rearrangement:
 *    - In Collapsed mode: destinations have taller spacing (gap-4 + stacked label).
 *    - In Expanded mode: destinations contract vertically into a tight list (gap-1.5, height 48px).
 *    - During expansion: items smoothly glide UPWARDS into their compact row positions.
 *    - During collapse: items smoothly glide DOWNWARDS into their spaced-out positions,
 *      horizontal titles hide rapidly (120ms), and stacked labels fade in underneath.
 * 3. Continuous Capsule Morphing:
 *    - Active indicator capsule widens from 56x32dp to 216x48dp as a continuous rounded-full capsule.
 */
export function DesktopSidebar({
  isModalOpen,
  onLogoutClick,
}: DesktopSidebarProps) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Collapsed (80px standard M3 rail) vs Expanded (240px wide rail)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleBrandClick = () => {
    if (!isExpanded) {
      toggleExpanded();
    } else {
      navigate('/');
    }
  };

  const rawPhoto = user?.photoURL || profile?.photoURL;
  const avatarUrl = getHighQualityAvatarUrl(rawPhoto, 256);
  const initialLetter = (profile?.name?.[0] || user?.displayName?.[0] || user?.email?.[0] || 'A').toUpperCase();

  const role = getUserRole(profile);
  const roleRingClass = getRoleRingClass(role);
  const roleFallbackStyle = getRoleFallbackStyle(role);
  const roleLabel = getRoleLabel(role);

  const currentPath = location.pathname;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 240 : 80 }}
      transition={M3_TRANSITION}
      style={{ willChange: 'width' }}
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 shrink-0 z-40 bg-workshop-surface text-workshop-muted border-r border-workshop-border select-none font-sans overflow-hidden",
        isModalOpen && "bg-workshop-surface/95"
      )}
      aria-label="Material 3 Navigation Rail"
    >
      {/* 1. TOP HEADER: Stationary Lightning Icon + Fluid Brand Title + Collapse Button */}
      <div className="h-16 flex items-center shrink-0 px-3 relative overflow-hidden">
        {/* Stationary Lightning Icon Anchor (X = 40px center line, NEVER moves or changes) */}
        <div className="w-14 h-12 flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={handleBrandClick}
            className="w-12 h-12 rounded-full flex items-center justify-center text-workshop-muted hover:text-workshop-text hover:bg-workshop-card/80 active:scale-95 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-workshop-accent group"
            title={isExpanded ? "LaluZ Garage" : "Expand navigation rail"}
            aria-label={isExpanded ? "LaluZ Garage" : "Expand navigation rail"}
          >
            <LzLightningIcon className="h-7 w-auto shrink-0 drop-shadow-[0_0_8px_rgba(120,223,34,0.4)] transition-transform group-hover:scale-105" />
          </button>
        </div>

        {/* Brand Name: Smoothly slides and fades alongside the lightning icon without displacing it */}
        <motion.div
          initial={false}
          animate={{
            opacity: isExpanded ? 1 : 0,
            width: isExpanded ? 130 : 0,
            x: isExpanded ? 0 : -8,
          }}
          transition={{
            duration: isExpanded ? 0.22 : 0.12,
            ease: M3_EASE,
          }}
          className="overflow-hidden whitespace-nowrap min-w-0 -ml-2.5"
        >
          <NavLink
            to="/"
            className="block font-bold text-[15px] text-workshop-text hover:text-workshop-accent tracking-tight truncate transition-colors select-none"
            title="LaluZ Garage"
          >
            LaluZ Garage
          </NavLink>
        </motion.div>

        {/* Collapse Button: Smoothly slides/fades in on the far right when expanded */}
        <motion.div
          initial={false}
          animate={{
            opacity: isExpanded ? 1 : 0,
            scale: isExpanded ? 1 : 0.8,
            width: isExpanded ? 40 : 0,
          }}
          transition={{
            duration: isExpanded ? 0.2 : 0.1,
            ease: M3_EASE,
          }}
          className="overflow-hidden flex items-center justify-end shrink-0 ml-auto"
        >
          <button
            type="button"
            onClick={toggleExpanded}
            className="w-10 h-10 rounded-full flex items-center justify-center text-workshop-muted hover:text-workshop-text hover:bg-workshop-card/80 active:scale-95 transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-workshop-accent"
            title="Collapse navigation rail"
            aria-label="Collapse navigation rail"
          >
            <span
              className="material-symbols-outlined text-[24px] select-none"
              style={{
                fontVariationSettings: "'FILL' 0",
                transform: 'rotate(180deg)',
              }}
            >
              menu_open
            </span>
          </button>
        </motion.div>
      </div>

      {/* 2. FLOATING ACTION BUTTON (FAB): Primary action for Service Intake */}
      <div className="px-3 pb-3 flex shrink-0 justify-start overflow-hidden h-17">
        <motion.button
          type="button"
          onClick={() => navigate('/intake')}
          animate={{
            width: isExpanded ? 216 : 56,
          }}
          transition={M3_TRANSITION}
          className="h-14 rounded-2xl bg-workshop-accent text-workshop-bg shadow-md hover:shadow-lg shadow-workshop-accent/20 hover:brightness-110 active:scale-95 transition-shadow flex items-center overflow-hidden shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-workshop-accent"
          title="New Service Intake"
          aria-label="New Service Intake"
        >
          {/* Stationary 56px icon anchor */}
          <div className="w-14 h-14 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-[26px] select-none"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              assignment_add
            </span>
          </div>

          {/* Extended label with fluid slide & fade */}
          <motion.span
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? 140 : 0,
              x: isExpanded ? 0 : -8,
            }}
            transition={{
              duration: isExpanded ? 0.22 : 0.12,
              ease: M3_EASE,
            }}
            className="font-bold text-xs uppercase tracking-wider whitespace-nowrap overflow-hidden text-left"
          >
            Service Intake
          </motion.span>
        </motion.button>
      </div>

      {/* 3. DESTINATIONS: Material 3 Navigation Rail Items with Dynamic Spacing & Rearrangement */}
      <motion.nav
        layout
        transition={M3_TRANSITION}
        className={cn(
          "flex-1 overflow-y-auto scroll-smooth py-2 px-3 flex flex-col",
          isExpanded ? "gap-1.5" : "gap-4"
        )}
        aria-label="Primary Destinations"
      >
        {navItems.map((item: NavItemConfig) => {
          const isActive = item.to === '/' ? currentPath === '/' : currentPath.startsWith(item.to);
          const accentColor = getTabAccentColor(item.to);
          const pillClass = getActiveTabPillClass(item.to);

          return (
            <motion.div
              key={item.to}
              layout="position"
              transition={M3_TRANSITION}
              className="w-full flex justify-start shrink-0"
            >
              <NavLink
                to={item.to}
                className={cn(
                  "group relative select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-workshop-accent w-full flex flex-col items-start transition-colors",
                  isActive ? "text-workshop-text" : "text-workshop-muted hover:text-workshop-text"
                )}
                title={item.label}
              >
                {/* Horizontal Capsule (Fluid width 56px -> 216px, fluid height 32px -> 48px) */}
                <motion.div
                  animate={{
                    width: isExpanded ? 216 : 56,
                    height: isExpanded ? 48 : 32,
                  }}
                  transition={M3_TRANSITION}
                  className={cn(
                    "relative flex items-center rounded-full overflow-hidden shrink-0",
                    isActive ? pillClass : "hover:bg-workshop-card/70"
                  )}
                >
                  {/* Fixed 56px Icon Container: Stationary in X coordinate */}
                  <div className="w-14 h-full flex items-center justify-center shrink-0 relative z-10">
                    <span
                      className={cn(
                        "material-symbols-outlined text-[24px] select-none transition-colors",
                        isActive ? accentColor : "text-workshop-muted group-hover:text-workshop-text"
                      )}
                      style={{
                        fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {item.m3Icon}
                    </span>
                  </div>

                  {/* Expanded Title beside Icon (Slides left and hides fast on collapse) */}
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: isExpanded ? 1 : 0,
                      width: isExpanded ? 140 : 0,
                      x: isExpanded ? 0 : -8,
                    }}
                    transition={{
                      duration: isExpanded ? 0.22 : 0.12,
                      ease: M3_EASE,
                    }}
                    className="relative z-10 overflow-hidden whitespace-nowrap flex items-center pr-3 min-w-0"
                  >
                    <span className={cn(
                      "text-xs tracking-tight truncate font-sans",
                      isActive ? "font-bold text-workshop-text" : "font-medium text-workshop-muted group-hover:text-workshop-text"
                    )}>
                      {item.label}
                    </span>
                  </motion.div>
                </motion.div>

                {/* Compact Stacked Label (Visible underneath icon in compact mode, collapses on expand) */}
                <motion.div
                  initial={false}
                  animate={{
                    opacity: isExpanded ? 0 : 1,
                    height: isExpanded ? 0 : 16,
                    marginTop: isExpanded ? 0 : 4,
                  }}
                  transition={{
                    duration: isExpanded ? 0.08 : 0.22,
                    ease: M3_EASE,
                  }}
                  className="w-14 overflow-hidden flex justify-center text-center select-none pointer-events-none"
                >
                  <span className={cn(
                    "text-[11px] tracking-normal text-center truncate max-w-[56px] font-sans",
                    isActive ? "text-workshop-text font-bold" : "text-workshop-muted group-hover:text-workshop-text font-medium"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
              </NavLink>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* 4. TRAILING SECTION: Theme Toggle, Profile Avatar, and Logout */}
      <div className="p-3 bg-workshop-surface border-t border-workshop-border shrink-0 flex flex-col gap-1.5">
        {/* Profile Card / Avatar */}
        <NavLink
          to="/settings"
          className="flex items-center rounded-xl hover:bg-workshop-card/70 group transition-colors focus:outline-none overflow-hidden h-10"
          title={`Profile & Settings (${roleLabel})`}
        >
          <div className="w-14 h-10 flex items-center justify-center shrink-0">
            <div
              className={cn(
                "w-8 h-8 rounded-full ring-2 transition-all flex items-center justify-center text-[10px] font-bold uppercase overflow-hidden shrink-0",
                roleRingClass,
                roleFallbackStyle.bg,
                roleFallbackStyle.text
              )}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile?.name || user?.displayName || ''}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                initialLetter
              )}
            </div>
          </div>

          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? 140 : 0,
              x: isExpanded ? 0 : -8,
            }}
            transition={{
              duration: isExpanded ? 0.22 : 0.12,
              ease: M3_EASE,
            }}
            className="space-y-0.5 overflow-hidden whitespace-nowrap min-w-0 pr-2"
          >
            <p className="text-xs text-workshop-text font-bold truncate group-hover:text-workshop-accent transition-colors">
              {profile?.name || user?.displayName || user?.email}
            </p>
            <p className="text-[9px] uppercase text-workshop-muted font-black tracking-widest opacity-70">
              {roleLabel}
            </p>
          </motion.div>
        </NavLink>

        {/* Theme Toggle row */}
        <div className="flex items-center overflow-hidden h-9">
          <div className="w-14 h-9 flex items-center justify-center shrink-0">
            <ThemeToggle className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-workshop-card/80 transition-all" />
          </div>
          <motion.span
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? 140 : 0,
              x: isExpanded ? 0 : -8,
            }}
            transition={{
              duration: isExpanded ? 0.22 : 0.12,
              ease: M3_EASE,
            }}
            className="text-xs font-semibold text-workshop-muted whitespace-nowrap overflow-hidden pl-1"
          >
            Theme
          </motion.span>
        </div>

        {/* Logout action row */}
        <button
          type="button"
          onClick={onLogoutClick}
          className="flex items-center text-workshop-muted hover:text-status-urgent hover:bg-status-urgent/10 rounded-xl transition-colors cursor-pointer overflow-hidden focus:outline-none h-9"
          title="End session"
          aria-label="End session"
        >
          <div className="w-14 h-9 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-[20px] select-none"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              logout
            </span>
          </div>
          <motion.span
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? 140 : 0,
              x: isExpanded ? 0 : -8,
            }}
            transition={{
              duration: isExpanded ? 0.22 : 0.12,
              ease: M3_EASE,
            }}
            className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap overflow-hidden text-left pl-1"
          >
            End session
          </motion.span>
        </button>
      </div>
    </motion.aside>
  );
}
