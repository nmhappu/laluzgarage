import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { X, ArrowDown, ArrowUp, Check } from 'lucide-react';
import { Search } from '../ui/SearchIcon';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useBackHandler } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { getHighQualityAvatarUrl } from '../../lib/avatar';
import { MorphText } from '../ui/MorphText';
import { getUserRole } from '../../types';
import {
  getNavTitle,
  getActiveTabLabel,
  getActiveTabM3Icon,
  getActiveTabColor,
  getRoleRingClass,
  getRoleFallbackStyle,
  getRoleLabel,
} from './types';

interface MobileTopBarProps {
  isModalOpen: boolean;
  isScrolled: boolean;
  mobileQuery: string;
  onMobileQueryChange: (val: string) => void;
  onLogoutClick?: () => void;
}

export function MobileTopBar({
  isModalOpen,
  isScrolled,
  mobileQuery,
  onMobileQueryChange,
}: MobileTopBarProps) {
  const location = useLocation();
  const { user, profile } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [showStickySearch, setShowStickySearch] = useState(false);

  const isServices = location.pathname.startsWith('/services');
  const isSettings = location.pathname.startsWith('/settings');
  const showProfileButton = !isServices && !isSettings;

  const [searchParams, setSearchParams] = useSearchParams();
  const sortOrder = (searchParams.get('sort') || 'newest') as 'newest' | 'oldest';
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const setSortOrder = (order: 'newest' | 'oldest') => {
    setSearchParams((prev) => {
      if (order === 'newest') {
        prev.delete('sort');
      } else {
        prev.set('sort', order);
      }
      return prev;
    }, { replace: true });
  };

  useEffect(() => {
    setImageError(false);
  }, [user?.photoURL]);

  const rawPhoto = user?.photoURL || profile?.photoURL;
  const avatarUrl = !imageError ? getHighQualityAvatarUrl(rawPhoto, 256) : null;
  const initialLetter = (profile?.name?.[0] || user?.displayName?.[0] || user?.email?.[0] || 'A').toUpperCase();

  const role = getUserRole(profile);
  const roleRingClass = getRoleRingClass(role);
  const roleFallbackStyle = getRoleFallbackStyle(role);
  const roleLabel = getRoleLabel(role);

  // Close sticky search bar on back button
  useBackHandler(() => {
    setShowStickySearch(false);
    onMobileQueryChange('');
    return true;
  }, showStickySearch, 60);

  // Close sort dropdown on back button
  useBackHandler(() => {
    setShowSortDropdown(false);
    return true;
  }, showSortDropdown, 65);

  useEffect(() => {
    setShowStickySearch(false);
    setShowSortDropdown(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    if (showSortDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSortDropdown]);

  return (
    <nav
      style={{ top: 0, transform: 'translateZ(0)' }}
      className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-50 flex flex-col transition-[background-color,border-color,backdrop-filter,box-shadow] duration-200 ease-out",
        isScrolled
          ? "bg-workshop-bg/85 backdrop-blur-md border-b border-workshop-border/40 shadow-sm"
          : "bg-workshop-bg border-b border-workshop-border/20",
        isModalOpen && "bg-workshop-bg/95"
      )}
    >
      <div className="safe-top" />
      <div className="h-16 flex items-center justify-between px-5">
        {/* Logo & Current Page Icon */}
        <NavLink to="/" className="flex items-center gap-2.5 h-full min-w-0">
          <MorphText className="text-workshop-text text-base font-logo font-bold tracking-tight">
            {getNavTitle(location.pathname)}
          </MorphText>
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
        <div className="flex items-center gap-1.5 relative">
          {/* Sort Button (in /services, shown in place of profile picture) */}
          <AnimatePresence mode="popLayout">
            {isServices && (
              <motion.div
                key="services-sort"
                ref={sortDropdownRef}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() => setShowSortDropdown((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none active:scale-95 cursor-pointer",
                    "bg-workshop-card/80 hover:bg-workshop-card border border-workshop-border/80 text-workshop-text hover:border-workshop-accent/40 shadow-sm",
                    sortOrder === 'oldest' && "border-workshop-accent/50 text-workshop-accent bg-workshop-accent/10",
                    showSortDropdown && "ring-2 ring-workshop-accent/40 border-workshop-accent"
                  )}
                  title={`Sort: ${sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}`}
                  aria-label="Sort service records"
                  aria-expanded={showSortDropdown}
                >
                  <span className="font-sans font-bold tracking-tight text-workshop-text text-xs">Sort</span>
                  <motion.span
                    animate={{ rotate: sortOrder === 'oldest' ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                    className="flex items-center justify-center text-workshop-accent shrink-0"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </motion.span>
                </button>

                {/* Dropdown Menu for Oldest and Newest */}
                <AnimatePresence>
                  {showSortDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -6 }}
                      transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                      className="absolute right-0 top-full mt-2 w-44 bg-workshop-surface/95 backdrop-blur-md border border-workshop-border rounded-2xl shadow-2xl overflow-hidden z-50 py-1.5 flex flex-col"
                    >
                      <div className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-workshop-muted/70 select-none">
                        Sort Records
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSortOrder('newest');
                          setShowSortDropdown(false);
                        }}
                        className={cn(
                          "w-full px-3.5 py-2.5 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer",
                          sortOrder === 'newest'
                            ? "text-workshop-accent bg-workshop-accent/15"
                            : "text-workshop-text hover:bg-workshop-card/80"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <ArrowDown className="w-3.5 h-3.5 text-workshop-accent shrink-0" />
                          <span>Newest First</span>
                        </span>
                        {sortOrder === 'newest' && (
                          <Check className="w-4 h-4 text-workshop-accent shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSortOrder('oldest');
                          setShowSortDropdown(false);
                        }}
                        className={cn(
                          "w-full px-3.5 py-2.5 text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer",
                          sortOrder === 'oldest'
                            ? "text-workshop-accent bg-workshop-accent/15"
                            : "text-workshop-text hover:bg-workshop-card/80"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <ArrowUp className="w-3.5 h-3.5 text-workshop-accent shrink-0" />
                          <span>Oldest First</span>
                        </span>
                        {sortOrder === 'oldest' && (
                          <Check className="w-4 h-4 text-workshop-accent shrink-0" />
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Action Icon */}
          {['/vehicles', '/inventory', '/services'].some((path) =>
            location.pathname.startsWith(path)
          ) && (
            <button
              type="button"
              onClick={() => setShowStickySearch(true)}
              className="p-2 text-workshop-muted hover:text-workshop-text transition-colors rounded-lg active:scale-95"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          {/* Account Profile Picture Avatar */}
          <AnimatePresence mode="popLayout">
            {showProfileButton && (
              <motion.div
                key="profile-avatar"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="ml-1 shrink-0"
              >
                <NavLink
                  to="/settings"
                  className={cn(
                    "relative rounded-full p-0.5 ring-2 transition-all active:scale-95 flex items-center justify-center focus:outline-none",
                    roleRingClass
                  )}
                  title={roleLabel}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-black shadow-inner",
                      roleFallbackStyle
                    )}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user?.displayName || 'Avatar'}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <span className="font-bold uppercase text-[11px]">
                        {initialLetter}
                      </span>
                    )}
                  </div>
                </NavLink>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Expanded Sticky Search Bar */}
      <AnimatePresence>
        {showStickySearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                  className="w-full bg-transparent border-none outline-none text-base text-workshop-text placeholder:text-workshop-muted/50 font-medium py-2 uppercase"
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
    </nav>
  );
}
