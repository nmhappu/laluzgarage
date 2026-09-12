import React, { createContext, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

import { STORAGE_KEYS } from '../lib/constants';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (eventOrElement?: React.MouseEvent | MouseEvent | Element | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return (saved as Theme) || 'dark';
  });
  const isTransitioningRef = React.useRef(false);

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
    metaThemeColor.setAttribute("content", theme === 'dark' ? '#07080A' : '#FFFFFF');
  }, [theme]);

  const toggleTheme = (eventOrElement?: React.MouseEvent | MouseEvent | Element | null) => {
    // Prevent overlapping transitions if user clicks rapidly
    if (isTransitioningRef.current) {
      return;
    }

    const newTheme = theme === 'light' ? 'dark' : 'light';

    // Support for circular reveal animation using View Transitions API
    const isShiftKey = Boolean((eventOrElement as React.MouseEvent)?.shiftKey || (eventOrElement as MouseEvent)?.shiftKey);

    // Calculate the exact origin coordinate (x, y) centered on the theme toggle icon/button
    let x: number | undefined;
    let y: number | undefined;

    try {
      let targetEl: Element | null = null;
      if (eventOrElement instanceof Element) {
        targetEl = eventOrElement;
      } else if (eventOrElement && 'currentTarget' in eventOrElement && eventOrElement.currentTarget instanceof Element) {
        targetEl = eventOrElement.currentTarget;
      } else if (eventOrElement && 'target' in eventOrElement && eventOrElement.target instanceof Element) {
        targetEl = eventOrElement.target.closest('button') || eventOrElement.target;
      }

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        }
      }

      // Fallback to client coordinates if provided and valid
      if ((x === undefined || y === undefined) && eventOrElement) {
        const mouseEvent = eventOrElement as MouseEvent | React.MouseEvent;
        if (typeof mouseEvent.clientX === 'number' && typeof mouseEvent.clientY === 'number') {
          if (mouseEvent.clientX > 0 || mouseEvent.clientY > 0) {
            x = mouseEvent.clientX;
            y = mouseEvent.clientY;
          }
        }
      }

      // If coordinates not found directly, query for the active/visible toggle button in DOM
      if (x === undefined || y === undefined) {
        const toggleButtons = document.querySelectorAll<HTMLElement>('[data-theme-toggle]');
        for (const btn of toggleButtons) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
            break;
          }
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

    const endRadius = Math.ceil(
      Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )
    ) + 10;

    // Set CSS custom properties on documentElement so compositor keyframes start from frame 0
    document.documentElement.style.setProperty('--theme-switch-x', `${Math.round(x)}px`);
    document.documentElement.style.setProperty('--theme-switch-y', `${Math.round(y)}px`);
    document.documentElement.style.setProperty('--theme-switch-radius', `${endRadius}px`);

    if (!document.startViewTransition || isShiftKey) {
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
      setTheme(newTheme);
      return;
    }

    try {
      isTransitioningRef.current = true;
      const transition = document.startViewTransition(() => {
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
        flushSync(() => {
          setTheme(newTheme);
        });
      });

      // Animate via Web Animations API with explicit pixel values so Android WebView
      // doesn't rely on CSS variable inheritance in pseudo-element keyframes
      transition.ready.then(() => {
        try {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${Math.round(x)}px ${Math.round(y)}px)`,
                `circle(${endRadius}px at ${Math.round(x)}px ${Math.round(y)}px)`,
              ],
            },
            {
              duration: 750,
              easing: 'cubic-bezier(0.2, 0, 0, 1)',
              pseudoElement: '::view-transition-new(root)',
              fill: 'forwards',
            }
          );
        } catch {
          // Handled by CSS keyframes fallback
        }
      }).catch(() => {});

      transition.finished.finally(() => {
        isTransitioningRef.current = false;
      });
    } catch {
      isTransitioningRef.current = false;
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
