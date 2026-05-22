import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, Users, LogOut, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { Portal } from './Portal';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/services', icon: ClipboardList, label: 'Services' },
];

export function Navigation() {
  const { user, logout } = useAuth();
  const { isModalOpen } = useUI();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const item = navItems.find(item => item.to === location.pathname);
    if (!item || location.pathname === '/') return 'LaluZ Garage';
    return item.label;
  };

  const pageTitle = getPageTitle();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col w-64 bg-workshop-surface text-workshop-muted h-screen sticky top-0 shrink-0 border-r border-workshop-border transition-all duration-300 ease-in-out",
        isModalOpen && "backdrop-blur-md bg-workshop-surface/90"
      )}>
        <div className="p-8 h-32">
          <NavLink to="/" className="flex items-center justify-between group hover:no-underline">
            <AnimatePresence mode="wait">
              <motion.h1 
                key={pageTitle}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1.0] }}
                className="text-workshop-text text-xl font-logo font-semibold tracking-tight transition-colors group-hover:text-workshop-accent"
              >
                {pageTitle}
              </motion.h1>
            </AnimatePresence>
          </NavLink>
          <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-[0.3em]">Workshop Manager</p>
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
          className="flex-1 px-4 py-4 space-y-1"
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
                  "relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all group overflow-hidden z-10",
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
                        className="absolute inset-0 bg-workshop-accent shadow-lg shadow-workshop-accent/20 z-[-1]"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                    <item.icon className="w-4 h-4 transition-transform group-active:scale-90 relative z-10" />
                    <span className="relative z-10">{item.label}</span>
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
                 <img src={user.photoURL} alt={user.displayName || ''} referrerPolicy="no-referrer" />
               ) : (
                 user?.displayName?.[0] || user?.email?.[0]
               )}
            </div>
            <div className="space-y-0.5 overflow-hidden">
              <p className="text-xs text-workshop-text font-bold truncate max-w-[120px]">{user?.displayName || user?.email}</p>
              <p className="text-[10px] uppercase text-workshop-muted font-black tracking-widest opacity-60">Active session</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-workshop-border/30">
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 text-[10px] font-bold text-workshop-muted hover:text-status-urgent transition-colors uppercase tracking-widest"
            >
              <LogOut className="w-3 h-3" />
              End session
            </button>

            {location.pathname === '/' && <ThemeToggle className="w-8 h-8 rounded-lg" />}
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <nav className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-50 bg-workshop-surface border-b border-workshop-border shadow-lg flex flex-col transition-all duration-300 ease-in-out",
        isModalOpen && "backdrop-blur-md bg-workshop-surface/90"
      )}>
        <div className="safe-top" />
        <div className="h-16 flex items-center justify-between px-6">
          <NavLink to="/" className="flex items-center gap-2 h-full items-center">
            <AnimatePresence mode="wait">
              <motion.span 
                key={pageTitle}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1.0] }}
                className="text-workshop-text text-lg font-logo font-semibold tracking-tight"
              >
                {pageTitle}
              </motion.span>
            </AnimatePresence>
          </NavLink>
          
          <div className="flex items-center gap-2">
            {location.pathname === '/' && <ThemeToggle className="w-9 h-9 rounded-lg" />}
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center justify-center p-2 text-workshop-muted hover:text-status-urgent transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 pointer-events-none" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 w-full bg-workshop-bg border-t border-workshop-border px-4 pt-4 pb-12 z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.2)] safe-bottom transition-all duration-300 ease-in-out",
        isModalOpen && "backdrop-blur-md bg-workshop-bg/90"
      )}>
        <div className="flex items-center justify-between gap-1 max-w-lg mx-auto overflow-x-auto no-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-0 transition-all duration-300 flex-1 min-w-[56px] active:scale-90",
                isActive ? "text-workshop-accent" : "text-workshop-muted"
              )}
            >
              {({ isActive }) => (
                <>
                  <div className="relative h-10 w-16 flex items-center justify-center rounded-full">
                    {isActive && (
                      <motion.div
                        layoutId="mobileActivePill"
                        className="absolute inset-0 bg-workshop-accent/10 shadow-[0_4px_12px_rgba(16,185,129,0.1)] rounded-full z-0"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn("w-6 h-6 relative z-10 transition-all duration-300", isActive ? "scale-110" : "scale-100")} />
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
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                onClick={() => setShowLogoutConfirm(false)}
                className="absolute inset-0 bg-workshop-bg/60 backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 10 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
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
    </>
  );
}
