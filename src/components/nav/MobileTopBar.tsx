import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
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
  onLogoutClick,
}: MobileTopBarProps) {
  const location = useLocation();
  const { user, profile } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [showStickySearch, setShowStickySearch] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user?.photoURL]);

  const rawPhoto = user?.photoURL || (profile as any)?.photoURL;
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

  useEffect(() => {
    setShowStickySearch(false);
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

          {/* Account Profile Picture Avatar */}
          <NavLink
            to="/settings"
            className={cn(
              "ml-2 relative rounded-full p-0.5 ring-2 transition-all active:scale-95 flex items-center justify-center focus:outline-none",
              roleRingClass
            )}
            title={`Profile & Settings (${roleLabel})`}
            aria-label={`Profile & Settings (${roleLabel})`}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold transition-colors",
                roleFallbackStyle.bg,
                roleFallbackStyle.text
              )}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile?.name || user?.displayName || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="font-bold uppercase text-[11px]">
                  {initialLetter}
                </span>
              )}
            </div>
          </NavLink>
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
    </nav>
  );
}
