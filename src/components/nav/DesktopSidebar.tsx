import { NavLink, useLocation } from 'react-router-dom';
import { X, LogOut } from 'lucide-react';
import { Search } from '../ui/SearchIcon';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ThemeToggle } from '../ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { getHighQualityAvatarUrl } from '../../lib/avatar';
import { navItems, getActiveTabLabel, getActiveTabM3Icon, getActiveTabColor } from './types';

interface DesktopSidebarProps {
  isModalOpen: boolean;
  desktopQuery: string;
  onDesktopQueryChange: (val: string) => void;
  onLogoutClick: () => void;
}

export function DesktopSidebar({
  isModalOpen,
  desktopQuery,
  onDesktopQueryChange,
  onLogoutClick,
}: DesktopSidebarProps) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const pageTitle = 'LaluZ Garage';

  const rawPhoto = user?.photoURL || (profile as any)?.photoURL;
  const avatarUrl = getHighQualityAvatarUrl(rawPhoto, 256);
  const initialLetter = (profile?.name?.[0] || user?.displayName?.[0] || user?.email?.[0] || 'A').toUpperCase();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col w-64 bg-workshop-surface text-workshop-muted h-screen sticky top-0 shrink-0 border-r border-workshop-border transition-all duration-300 ease-in-out font-sans",
        isModalOpen && "bg-workshop-surface/95"
      )}
    >
      <div className="p-8 h-32 font-sans">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3 group hover:no-underline font-sans flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.h1
                key={pageTitle}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1.0] }}
                className="text-workshop-text text-xl font-sans font-semibold tracking-tight transition-colors group-hover:text-workshop-accent truncate"
              >
                {pageTitle}
              </motion.h1>
            </AnimatePresence>
            <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={getActiveTabM3Icon(location.pathname)}
                  initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
                  transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                  className={cn(
                    "material-symbols-outlined text-2xl absolute select-none",
                    getActiveTabColor(location.pathname)
                  )}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {getActiveTabM3Icon(location.pathname)}
                </motion.span>
              </AnimatePresence>
            </div>
          </NavLink>
          <NavLink
            to="/settings"
            className="p-0.5 ring-2 ring-workshop-border/80 hover:ring-workshop-accent/70 rounded-full transition-all ml-2 flex items-center justify-center focus:outline-none active:scale-95 shrink-0"
            title="Profile & Settings"
            aria-label="Profile & Settings"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-workshop-surface flex items-center justify-center text-xs font-bold text-workshop-accent">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile?.name || user?.displayName || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="font-bold uppercase text-[10px] text-workshop-text">
                  {initialLetter}
                </span>
              )}
            </div>
          </NavLink>
        </div>
        <p className="text-workshop-muted text-[10px] font-bold mt-2 uppercase tracking-[0.3em] font-sans">Workshop Manager</p>
      </div>

      {/* Search input in desktop sidebar */}
      {['/vehicles', '/inventory', '/services'].some(path => location.pathname.startsWith(path)) && (
        <div className="px-6 mb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-workshop-muted w-4 h-4" />
            <input
              type="text"
              value={desktopQuery}
              onChange={(e) => onDesktopQueryChange(e.target.value)}
              placeholder={getActiveTabLabel(location.pathname).toLowerCase()}
              className="w-full bg-workshop-card border border-workshop-border pl-9 pr-8 py-2 rounded-xl text-xs font-semibold text-workshop-text placeholder:text-workshop-muted/50 focus:outline-none focus:ring-1 focus:ring-workshop-accent/50 uppercase"
            />
            {desktopQuery && (
              <button
                onClick={() => onDesktopQueryChange('')}
                className="absolute right-3 text-workshop-muted hover:text-workshop-text flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <motion.nav
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05
            }
          }
        }}
        className="flex-1 px-4 py-4 space-y-1 font-sans"
      >
        {navItems.map((item) => (
          <motion.div
            key={item.to}
            variants={{
              hidden: { opacity: 0, x: -10 },
              show: { opacity: 1, x: 0 }
            }}
          >
            <NavLink
              to={item.to}
              className={({ isActive }) => cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all group overflow-hidden z-10 font-sans",
                isActive
                  ? "text-workshop-bg"
                  : "text-workshop-muted hover:bg-workshop-card/50 hover:text-workshop-text"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="desktopActiveTabBackdrop"
                      className={cn(
                        "absolute inset-0 shadow-lg z-[-1]",
                        item.to === '/vehicles'
                          ? "bg-secondary shadow-secondary/30"
                          : "bg-workshop-accent shadow-workshop-accent/20"
                      )}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span
                    className="material-symbols-outlined transition-transform group-active:scale-90 relative z-10 text-[20px] select-none"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.m3Icon}
                  </span>
                  <span className="relative z-10 font-sans">{item.label}</span>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      <div className="p-6 bg-workshop-bg flex flex-col gap-4 border-t border-workshop-border">
        <NavLink to="/settings" className="flex items-center gap-3 group hover:no-underline" title="Profile & Settings">
          <div className="w-8 h-8 rounded-full bg-workshop-accent/20 ring-1 ring-workshop-border group-hover:ring-workshop-accent/70 transition-all flex items-center justify-center text-[10px] font-bold text-workshop-accent uppercase overflow-hidden shrink-0">
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
          <div className="space-y-0.5 overflow-hidden">
            <p className="text-xs text-workshop-text font-bold truncate max-w-[120px] group-hover:text-workshop-accent transition-colors">
              {profile?.name || user?.displayName || user?.email}
            </p>
            <p className="text-[10px] uppercase text-workshop-muted font-black tracking-widest opacity-60">Active session</p>
          </div>
        </NavLink>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-workshop-border/30">
          {location.pathname === '/' && <ThemeToggle className="w-8 h-8 rounded-lg" />}

          <button
            onClick={onLogoutClick}
            className="flex items-center gap-2 text-[10px] font-bold text-workshop-muted hover:text-status-urgent transition-colors uppercase tracking-widest ml-auto"
          >
            <LogOut className="w-3 h-3" />
            End session
          </button>
        </div>
      </div>
    </aside>
  );
}
