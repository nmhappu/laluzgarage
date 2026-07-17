import { useState, useEffect } from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, LogOut, AlertTriangle, History, Settings, Search, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { Portal } from './Portal';
import { SettingsModal } from './SettingsModal';

const navItems = [
  { to: '/', icon: LayoutDashboard, m3Icon: 'grid_view', label: 'Dashboard' },
  { to: '/vehicles', icon: History, m3Icon: 'directions_car', label: 'Vehicle' },
  { to: '/inventory', icon: Package, m3Icon: 'inventory_2', label: 'Inventory' },
  { to: '/services', icon: ClipboardList, m3Icon: 'build', label: 'Services' },
];

export function Navigation() {
  const { user, profile, logout } = useAuth();
  const { isModalOpen } = useUI();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const stickyQuery = searchParams.get('q') || '';
  const setStickyQuery = (val: string) => {
    setSearchParams(prev => {
      if (!val) {
        prev.delete('q');
      } else {
        prev.set('q', val);
      }
      return prev;
    }, { replace: true });
  };

  const stickyStatus = searchParams.get('status') || 'all';
  const setStickyStatus = (val: string) => {
    setSearchParams(prev => {
      if (val === 'all') {
        prev.delete('status');
      } else {
        prev.set('status', val);
      }
      return prev;
    }, { replace: true });
  };

  useEffect(() => {
    setShowStickySearch(false);
    setFilterMenuOpen(false);
  }, [location.pathname]);

  const getPageTitle = () => {
    return 'LaluZ Garage';
  };

  const pageTitle = getPageTitle();

  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    let scrollContainer: Element | null = null;
    
    const handleScroll = () => {
      if (scrollContainer) {
        setScrollTop(scrollContainer.scrollTop);
      }
    };

    const bindScroll = () => {
      scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        setScrollTop(scrollContainer.scrollTop);
        return true;
      }
      return false;
    };

    if (!bindScroll()) {
      const interval = setInterval(() => {
        if (bindScroll()) {
          clearInterval(interval);
        }
      }, 100);
      return () => {
        clearInterval(interval);
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', handleScroll);
        }
      };
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const getActiveTabLabel = (pathname: string) => {
    if (pathname === '/') return 'Dashboard';
    if (pathname.startsWith('/vehicles')) return 'Vehicle Registry';
    if (pathname.startsWith('/inventory')) return 'Parts Inventory';
    if (pathname.startsWith('/services')) return 'Service History';
    return 'Dashboard';
  };

  const getActiveTabM3Icon = (pathname: string) => {
    if (pathname === '/') return 'grid_view';
    if (pathname.startsWith('/vehicles')) return 'directions_car';
    if (pathname.startsWith('/inventory')) return 'inventory_2';
    if (pathname.startsWith('/services')) return 'build';
    return 'grid_view';
  };

  const getActiveTabColor = (pathname: string) => {
    if (pathname.startsWith('/vehicles')) return 'text-blue-500';
    return 'text-workshop-accent';
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col w-64 bg-workshop-surface text-workshop-muted h-screen sticky top-0 shrink-0 border-r border-workshop-border transition-all duration-300 ease-in-out font-sans",
        isModalOpen && "bg-workshop-surface/95"
      )}>
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
            <button 
              onClick={() => setShowSettings(true)} 
              className="p-2 text-workshop-muted hover:text-workshop-text hover:bg-workshop-card/50 rounded-lg transition-colors ml-2"
              title="Security Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-[0.3em] font-sans">Workshop Manager</p>
        </div>

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
                            ? "bg-blue-600 shadow-blue-500/30"
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-workshop-accent flex items-center justify-center text-[10px] font-bold text-workshop-bg uppercase overflow-hidden">
               {user?.photoURL ? (
                 <img src={user.photoURL} alt={profile?.name || user.displayName || ''} referrerPolicy="no-referrer" />
               ) : (
                 profile?.name?.[0] || user?.displayName?.[0] || user?.email?.[0]
               )}
            </div>
            <div className="space-y-0.5 overflow-hidden">
              <p className="text-xs text-workshop-text font-bold truncate max-w-[120px]">{profile?.name || user?.displayName || user?.email}</p>
              <p className="text-[10px] uppercase text-workshop-muted font-black tracking-widest opacity-60">Active session</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-workshop-border/30">
            {location.pathname === '/' && <ThemeToggle className="w-8 h-8 rounded-lg" />}
            
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 text-[10px] font-bold text-workshop-muted hover:text-status-urgent transition-colors uppercase tracking-widest ml-auto"
            >
              <LogOut className="w-3 h-3" />
              End session
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <nav className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-50 flex flex-col transition-all duration-75 ease-out accelerate-gpu",
        scrollTop > 10 
          ? "bg-workshop-bg/90 backdrop-blur-md border-b border-workshop-border/30 shadow-md shadow-black/5" 
          : "bg-workshop-bg border-b border-transparent",
        isModalOpen && "bg-workshop-bg/95"
      )}>
        <div className="safe-top" />
        <div className="h-16 relative flex items-center justify-between px-6">
          
          {/* 1. ORIGINAL SCROLLABLE HEADER CONTENT (LaluZ Garage, theme, settings, logout) */}
          <div 
            className={cn(
              "absolute inset-x-6 top-0 bottom-0 flex items-center justify-between transition-all duration-75 ease-out accelerate-gpu will-change-transform-opacity",
              scrollTop > 25 
                ? "opacity-0 -translate-y-4 pointer-events-none" 
                : "opacity-100 translate-y-0 pointer-events-auto"
            )}
          >
            <NavLink to="/" className="flex items-center gap-2.5 h-full">
              <span className="text-workshop-text text-lg font-logo font-semibold tracking-tight">
                LaluZ Garage
              </span>
              <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
                <span 
                  className={cn(
                    "material-symbols-outlined text-2xl absolute select-none",
                    getActiveTabColor(location.pathname)
                  )}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {getActiveTabM3Icon(location.pathname)}
                </span>
              </div>
            </NavLink>
 
            <div className="flex items-center gap-2">
              {location.pathname === '/' && <ThemeToggle className="w-9 h-9 rounded-lg" />}
              <button 
                onClick={() => setShowSettings(true)}
                className="flex items-center justify-center p-2 text-workshop-muted hover:text-workshop-text transition-colors"
                title="Security Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center justify-center p-2 text-workshop-muted hover:text-status-urgent transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
 
          {/* 2. PINNED STICKY TITLE (Fades and slides up into place of LaluZ Garage) */}
          <div 
            className={cn(
              "absolute left-6 top-0 bottom-0 flex items-center gap-2.5 transition-all duration-75 ease-out accelerate-gpu will-change-transform-opacity",
              scrollTop > 25 
                ? "opacity-100 translate-y-0 pointer-events-auto" 
                : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            <span className="text-workshop-text text-lg font-black uppercase tracking-tighter">
              {getActiveTabLabel(location.pathname)}
            </span>
            <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
              <span 
                className={cn(
                  "material-symbols-outlined text-2xl absolute select-none",
                  getActiveTabColor(location.pathname)
                )}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {getActiveTabM3Icon(location.pathname)}
              </span>
            </div>
          </div>
 
          {/* 3. PINNED STICKY ACTIONS (Search, Filter) */}
          <div 
            className={cn(
              "absolute right-6 top-0 bottom-0 flex items-center gap-1 transition-all duration-75 ease-out accelerate-gpu will-change-transform-opacity",
              scrollTop > 25 
                ? "opacity-100 translate-y-0 pointer-events-auto" 
                : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            {['/vehicles', '/inventory', '/services'].some(path => location.pathname.startsWith(path)) && (
              <button
                onClick={() => setShowStickySearch(true)}
                className="flex items-center justify-center p-2 text-workshop-muted hover:text-workshop-text transition-colors"
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            {location.pathname.startsWith('/services') && (
              <button
                onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                className={cn(
                  "flex items-center justify-center p-2 text-workshop-muted hover:text-workshop-text transition-colors",
                  filterMenuOpen && "text-workshop-accent"
                )}
                title="Filter Logs"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* 4. EXPANDED STICKY SEARCH BAR */}
          <AnimatePresence>
            {showStickySearch && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute inset-0 bg-workshop-surface flex items-center justify-between px-6 z-50 border-b border-workshop-border"
              >
                <div className="flex items-center gap-2 flex-1 mr-4">
                  <Search className="w-5 h-5 text-workshop-muted shrink-0" />
                  <input
                    type="text"
                    value={stickyQuery}
                    onChange={(e) => setStickyQuery(e.target.value)}
                    placeholder={`Search ${getActiveTabLabel(location.pathname).toLowerCase()}...`}
                    className="w-full bg-transparent border-none outline-none text-sm text-workshop-text placeholder:text-workshop-muted/50 font-medium py-2 uppercase"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => {
                    setStickyQuery('');
                    setShowStickySearch(false);
                  }}
                  className="p-2 text-workshop-muted hover:text-workshop-text transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5. FLOATING FILTER DROPDOWN */}
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
                  className="absolute right-6 top-[68px] bg-workshop-card border border-workshop-border rounded-xl shadow-xl z-50 overflow-hidden py-1.5 min-w-[160px]"
                >
                  {[
                    { id: 'all', label: 'All Logs', color: 'bg-workshop-secondary' },
                    { id: 'pending', label: 'Pending', color: 'bg-status-urgent' },
                    { id: 'in-progress', label: 'In-Progress', color: 'bg-status-pending' },
                    { id: 'completed', label: 'Completed', color: 'bg-workshop-accent' },
                    { id: 'cancelled', label: 'Cancelled', color: 'bg-workshop-muted' },
                  ].map((status) => {
                    const isActive = stickyStatus === status.id;
                    return (
                      <button
                        key={status.id}
                        onClick={() => {
                          setStickyStatus(status.id);
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

        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 w-full bg-workshop-bg border-t border-workshop-border px-4 pt-4 pb-12 z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.2)] safe-bottom transition-all duration-300 ease-in-out",
        isModalOpen && "bg-workshop-bg/95"
      )}>
        <div className="flex items-center justify-between gap-1 max-w-lg mx-auto overflow-x-auto no-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-0 transition-all duration-300 flex-1 min-w-[56px] active:scale-90",
                isActive 
                  ? item.to === '/vehicles'
                    ? "text-blue-500"
                    : "text-workshop-accent"
                  : "text-workshop-muted"
              )}
            >
              {({ isActive }) => (
                <>
                  <div className="relative h-10 w-16 flex items-center justify-center rounded-full">
                    {isActive && (
                      <motion.div
                        layoutId="mobileActivePill"
                        className={cn(
                          "absolute inset-0 rounded-full z-0",
                          item.to === '/vehicles'
                            ? "bg-blue-500/10 shadow-[0_4px_12px_rgba(59,130,246,0.15)]"
                            : "bg-workshop-accent/10 shadow-[0_4px_12px_rgba(16,185,129,0.1)]"
                        )}
                        transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                      />
                    )}
                    <span 
                      className={cn(
                        "material-symbols-outlined relative z-10 transition-all duration-300 text-[24px] select-none", 
                        isActive ? "scale-110" : "scale-100"
                      )}
                      style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.m3Icon}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase tracking-widest font-bold transition-all mt-1",
                    isActive ? "opacity-100" : "opacity-40"
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <Portal>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                onClick={() => setShowLogoutConfirm(false)}
                className="absolute inset-0 bg-workshop-bg/85"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ willChange: "transform, opacity" }}
                className="relative bg-workshop-card w-full max-w-sm rounded-xl p-8 shadow-2xl border border-workshop-border text-center"
              >
                <div className="w-16 h-16 bg-status-urgent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-status-urgent border border-status-urgent/20">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                
                <h2 className="text-xl font-black text-workshop-text uppercase tracking-tight mb-2">End Session?</h2>
                <p className="text-workshop-muted text-sm mb-8 leading-relaxed">
                  Are you sure you want to log out? You will need to sign in again to access the workshop dashboard.
                </p>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-4 py-2.5 bg-workshop-surface text-workshop-muted rounded-xl text-sm font-black uppercase tracking-widest border border-workshop-border hover:text-workshop-text hover:bg-workshop-border transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      logout();
                      setShowLogoutConfirm(false);
                    }}
                    className="flex-1 px-4 py-2.5 bg-status-urgent text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-status-urgent/20 hover:opacity-90 transition-all"
                  >
                    Log Out
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
