import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Settings, Search, SlidersHorizontal, LogOut, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ThemeToggle';
import {
  getActiveTabLabel,
  getActiveTabM3Icon,
  getActiveTabColor,
  SERVICE_STATUS_FILTERS,
} from './types';

interface MobileTopBarProps {
  isModalOpen: boolean;
  isScrolled: boolean;
  mobileQuery: string;
  onMobileQueryChange: (val: string) => void;
  mobileStatus: string;
  onMobileStatusChange: (val: string) => void;
  onLogoutClick: () => void;
}

export function MobileTopBar({
  isModalOpen,
  isScrolled,
  mobileQuery,
  onMobileQueryChange,
  mobileStatus,
  onMobileStatusChange,
  onLogoutClick,
}: MobileTopBarProps) {
  const location = useLocation();
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  useEffect(() => {
    setShowStickySearch(false);
    setFilterMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-50 flex flex-col transition-all duration-200 ease-out",
        isScrolled
          ? "bg-workshop-bg/85 backdrop-blur-md border-b border-workshop-border/40 shadow-sm"
          : "bg-workshop-bg border-b border-workshop-border/20",
        isModalOpen && "bg-workshop-bg/95"
      )}
    >
      <div className="safe-top" />
      <div className="h-16 flex items-center justify-between px-5">
        {/* Logo & Current Page Icon */}
        <NavLink to="/" className="flex items-center gap-2.5 h-full">
          <span className="text-workshop-text text-base font-logo font-bold tracking-tight">
            LaluZ Garage
          </span>
          <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={getActiveTabM3Icon(location.pathname)}
                initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
                transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                className={cn(
                  "material-symbols-outlined text-xl absolute select-none",
                  getActiveTabColor(location.pathname)
                )}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {getActiveTabM3Icon(location.pathname)}
              </motion.span>
            </AnimatePresence>
          </div>
        </NavLink>

        {/* Persistent Header Actions */}
        <div className="flex items-center gap-1">
          {['/vehicles', '/inventory', '/services'].some((path) =>
            location.pathname.startsWith(path)
          ) && (
            <button
              onClick={() => setShowStickySearch(true)}
              className="p-2 text-workshop-muted hover:text-workshop-text transition-colors rounded-lg"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
          {location.pathname.startsWith('/services') && (
            <button
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              className={cn(
                "p-2 text-workshop-muted hover:text-workshop-text transition-colors rounded-lg",
                filterMenuOpen && "text-workshop-accent"
              )}
              title="Filter Logs"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          )}
          {location.pathname === '/' && <ThemeToggle className="w-8 h-8 rounded-lg" />}
          <NavLink
            to="/settings"
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-workshop-muted hover:text-workshop-text transition-colors rounded-lg"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </NavLink>
          <button
            id="mobile-nav-logout-btn"
            onClick={onLogoutClick}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-workshop-muted hover:text-status-urgent active:scale-95 transition-all rounded-lg"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expanded Sticky Search Bar */}
      <AnimatePresence>
        {showStickySearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-x-0 top-0 bg-workshop-surface flex flex-col z-50 border-b border-workshop-border shadow-md"
          >
            <div className="safe-top" />
            <div className="h-16 flex items-center justify-between px-6">
              <div className="flex items-center gap-2 flex-1 mr-4">
                <Search className="w-5 h-5 text-workshop-muted shrink-0" />
                <input
                  type="text"
                  value={mobileQuery}
                  onChange={(e) => onMobileQueryChange(e.target.value)}
                  placeholder={getActiveTabLabel(location.pathname).toLowerCase()}
                  className="w-full bg-transparent border-none outline-none text-sm text-workshop-text placeholder:text-workshop-muted/50 font-medium py-2 uppercase"
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  onMobileQueryChange('');
                  setShowStickySearch(false);
                }}
                className="p-2 text-workshop-muted hover:text-workshop-text transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Filter Dropdown */}
      <AnimatePresence>
        {filterMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-transparent z-40"
              onClick={() => setFilterMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-6 topbar-menu-offset bg-workshop-card border border-workshop-border rounded-xl shadow-xl z-50 overflow-hidden py-1.5 min-w-[160px]"
            >
              {SERVICE_STATUS_FILTERS.map((status) => {
                const isActive = mobileStatus === status.id;
                return (
                  <button
                    key={status.id}
                    onClick={() => {
                      onMobileStatusChange(status.id);
                      setFilterMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-left transition-colors",
                      isActive
                        ? "text-workshop-accent bg-workshop-surface/80"
                        : "text-workshop-muted hover:text-workshop-text hover:bg-workshop-surface/40"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", status.color)} />
                    <span className="truncate">{status.label}</span>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
