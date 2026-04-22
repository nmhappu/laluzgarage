import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/services', icon: ClipboardList, label: 'Services' },
];

export function Navigation() {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-workshop-surface text-workshop-muted h-screen sticky top-0 shrink-0 border-r border-workshop-border">
        <div className="p-8">
          <NavLink to="/" className="flex items-center justify-between group hover:no-underline">
            <h1 className="text-workshop-text text-xl font-logo tracking-tighter flex items-center gap-2 transition-colors group-hover:text-workshop-accent">
              LaluZ Garage
            </h1>
          </NavLink>
          <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-[0.3em]">Workshop Manager</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all",
                isActive 
                  ? "bg-workshop-accent text-workshop-bg shadow-lg shadow-workshop-accent/20" 
                  : "text-workshop-muted hover:bg-workshop-card hover:text-workshop-text"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

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
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-[10px] font-bold text-workshop-muted hover:text-rose-500 transition-colors uppercase tracking-widest"
          >
            <LogOut className="w-3 h-3" />
            End session
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-workshop-surface border-b border-workshop-border shadow-lg flex flex-col">
        <div className="safe-top" />
        <div className="h-16 flex items-center justify-between px-6">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="text-workshop-text text-lg font-logo tracking-tighter">LaluZ Garage</span>
          </NavLink>
          
          <button 
            onClick={logout}
            className="flex items-center justify-center p-2 text-workshop-muted hover:text-rose-500 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 pointer-events-none" />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-workshop-card border-t border-workshop-border px-4 pt-4 pb-12 z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.2)] safe-bottom">
        <div className="flex items-center justify-between gap-1 max-w-lg mx-auto overflow-x-auto no-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-0 transition-all duration-300 flex-1 min-w-[56px]",
                isActive ? "text-workshop-accent" : "text-workshop-muted"
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "h-10 w-16 flex items-center justify-center rounded-full transition-all duration-300",
                    isActive ? "bg-workshop-accent/10 shadow-[0_4px_12px_rgba(16,185,129,0.1)]" : "bg-transparent"
                  )}>
                    <item.icon className={cn("w-6 h-6 transition-all duration-300", isActive ? "scale-110" : "scale-100")} />
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase tracking-widest font-black transition-all",
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
    </>
  );
}
