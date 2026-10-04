import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { getHighQualityAvatarUrl } from '../../lib/avatar';
import { getUserRole } from '../../types';
import { Search } from '../ui/SearchIcon';
import { LzLightningIcon } from '../ui/LzLightningIcon';
import { X } from 'lucide-react';
import {
  navItems,
  getRoleRingClass,
  getRoleFallbackStyle,
  getRoleLabel,
  getActiveTabPillClass,
  getTabAccentColor,
  getActiveTabLabel,
  type NavItemConfig,
} from './types';

interface DesktopSidebarProps {
  isModalOpen: boolean;
  desktopQuery: string;
  onDesktopQueryChange: (val: string) => void;
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
  desktopQuery,
  onDesktopQueryChange,
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

  // Search popover state for compact (80px) rail mode
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Global '/' keyboard shortcut to trigger search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        if (!isExpanded) {
          setIsSearchOpen(true);
        } else {
          searchInputRef.current?.focus();
        }
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, isSearchOpen]);

  // Click outside to close search popover in compact mode
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isSearchOpen &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSearchOpen]);

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

      {/* 3. SEARCH CONTAINER: Fluid Morphing Search Bar */}
      <div className="px-3 mb-2 shrink-0 relative overflow-visible h-10" ref={searchContainerRef}>
        <motion.div
          animate={{
            width: isExpanded ? 216 : 56,
          }}
          transition={M3_TRANSITION}
          className={cn(
            "h-10 relative flex items-center rounded-xl bg-workshop-card/80 border border-workshop-border overflow-hidden",
            !isExpanded && desktopQuery && "border-workshop-accent/50 bg-workshop-accent/10"
          )}
        >
          {/* Search Trigger Button */}
          <button
            type="button"
            onClick={() => {
              if (!isExpanded) {
                setIsSearchOpen((prev) => !prev);
              } else {
                searchInputRef.current?.focus();
              }
            }}
            className={cn(
              "w-14 h-10 flex items-center justify-center shrink-0 cursor-pointer focus:outline-none transition-colors",
              desktopQuery ? "text-workshop-accent" : "text-workshop-muted hover:text-workshop-text"
            )}
            title={desktopQuery ? `Active filter: "${desktopQuery}" (Press /)` : "Search (/)"}
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
            {desktopQuery && !isExpanded && (
              <span className="absolute top-2 right-3.5 w-2 h-2 rounded-full bg-workshop-accent animate-pulse" />
            )}
          </button>

          {/* Inline Input for Expanded Mode */}
          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? 150 : 0,
            }}
            transition={{
              duration: isExpanded ? 0.22 : 0.12,
              ease: M3_EASE,
            }}
            className="flex-1 flex items-center h-full overflow-hidden pr-2"
          >
            <input
              ref={searchInputRef}
              type="text"
              value={desktopQuery}
              onChange={(e) => onDesktopQueryChange(e.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent border-none pl-0 pr-6 py-1 text-xs font-semibold text-workshop-text placeholder:text-workshop-muted/60 focus:outline-none uppercase"
            />
            {desktopQuery && isExpanded && (
              <button
                type="button"
                onClick={() => onDesktopQueryChange('')}
                className="absolute right-2 text-workshop-muted hover:text-workshop-text p-1 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        </motion.div>

        {/* Collapsed Search Popover Flyout */}
        <AnimatePresence>
          {isSearchOpen && !isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: M3_EASE }}
              className="absolute left-[calc(100%+8px)] top-0 z-50 w-72 p-2 rounded-2xl bg-workshop-surface border border-workshop-border shadow-2xl backdrop-blur-xl"
            >
              <div className="relative flex items-center">
                <Search className="absolute left-3 text-workshop-muted w-4 h-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={desktopQuery}
                  onChange={(e) => onDesktopQueryChange(e.target.value)}
                  placeholder={`Search ${getActiveTabLabel(location.pathname).toLowerCase()}...`}
                  className="w-full bg-workshop-card border border-workshop-border pl-9 pr-8 py-2 rounded-xl text-xs font-semibold text-workshop-text placeholder:text-workshop-muted/50 focus:outline-none focus:ring-1 focus:ring-workshop-accent uppercase"
                />
                {desktopQuery && (
                  <button
                    type="button"
                    onClick={() => onDesktopQueryChange('')}
                    className="absolute right-2.5 text-workshop-muted hover:text-workshop-text p-1 cursor-pointer"
                    title="Clear query"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {desktopQuery && (
                <div className="mt-2 px-2 flex items-center justify-between text-[10px] text-workshop-muted">
                  <span>Filtering view</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDesktopQueryChange('');
                      setIsSearchOpen(false);
                    }}
                    className="hover:text-status-urgent cursor-pointer font-bold uppercase tracking-wider"
                  >
                    Reset
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. DESTINATIONS: Material 3 Navigation Rail Items with Dynamic Spacing & Rearrangement */}
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

      {/* 5. TRAILING SECTION: Theme Toggle, Profile Avatar, and Logout */}
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
