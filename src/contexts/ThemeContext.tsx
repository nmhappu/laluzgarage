import React, { createContext, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

import { STORAGE_KEYS } from '../lib/constants';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (eventOrElement?: React.MouseEvent | MouseEvent | HTMLElement | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return (saved as Theme) || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);

    // Synchronize native system status/navigation bar colors (Android 15 / 16 & iOS) theme-color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", theme === 'dark' ? '#0B0D11' : '#FFFFFF');
  }, [theme]);

  const toggleTheme = (eventOrElement?: React.MouseEvent | MouseEvent | HTMLElement | null) => {
    const newTheme = theme === 'light' ? 'dark' : 'light';

    // Support for circular reveal animation using View Transitions API
    const isShiftKey = (eventOrElement as React.MouseEvent)?.shiftKey || (eventOrElement as MouseEvent)?.shiftKey;
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    // Calculate the exact origin coordinate (x, y) centered on the theme toggle icon/button
    let x: number | undefined;
    let y: number | undefined;

    try {
      if (eventOrElement instanceof HTMLElement) {
        const rect = eventOrElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        }
      } else if (eventOrElement && 'currentTarget' in eventOrElement && eventOrElement.currentTarget instanceof HTMLElement) {
        const rect = eventOrElement.currentTarget.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        }
      } else if (eventOrElement && 'target' in eventOrElement && eventOrElement.target instanceof HTMLElement) {
        const btn = eventOrElement.target.closest('button');
        const targetEl = btn || eventOrElement.target;
        const rect = targetEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        }
      }

      // If coordinates not found directly from event/element, query for the active/visible toggle button in DOM
      if (x === undefined || y === undefined) {
        const toggleButtons = document.querySelectorAll<HTMLElement>('[data-theme-toggle], #theme-toggle-btn, [aria-label="Toggle theme"]');
        for (const btn of toggleButtons) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
            break;
          }
        }
      }

      // Fallback to client coordinates if provided and valid
      if ((x === undefined || y === undefined) && eventOrElement && typeof (eventOrElement as MouseEvent).clientX === 'number') {
        const mouseX = (eventOrElement as MouseEvent).clientX;
        const mouseY = (eventOrElement as MouseEvent).clientY;
        if (mouseX > 0 || mouseY > 0) {
          x = mouseX;
          y = mouseY;
        }
      }
    } catch {
      // Ignore geometry query errors
    }

    // Default fallback to center of viewport
    if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
      x = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
      y = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
    }

    if (!document.startViewTransition || isShiftKey || prefersReducedMotion) {
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
      setTheme(newTheme);
      return;
    }

    try {
      const transition = document.startViewTransition(() => {
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
        flushSync(() => {
          setTheme(newTheme);
        });
      });

      transition.ready.then(() => {
        const radius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        );

        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 400,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      }).catch(() => {
        // Animation fallback handled gracefully
      });
    } catch {
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
      setTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
