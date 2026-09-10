import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { navItems } from './types';

interface MobileBottomNavProps {
  isModalOpen: boolean;
}

export function MobileBottomNav({ isModalOpen }: MobileBottomNavProps) {
  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 w-full bg-workshop-bg border-t border-workshop-border px-4 pt-4 pb-12 z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.2)] safe-bottom transition-all duration-300 ease-in-out",
        isModalOpen && "bg-workshop-bg/95"
      )}
    >
      <div className="flex items-center justify-between gap-1 max-w-lg mx-auto overflow-x-auto no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0 transition-all duration-300 flex-1 min-w-[56px] active:scale-90",
                isActive
                  ? item.to === '/vehicles'
                    ? "text-blue-500"
                    : "text-workshop-accent"
                  : "text-workshop-muted"
              )
            }
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
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-widest font-bold transition-all mt-1",
                    isActive ? "opacity-100" : "opacity-40"
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
