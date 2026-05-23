import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (event?: React.MouseEvent | MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Synchronize native system status/navigation bar colors (Android 15 / 16 & iOS) theme-color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", theme === 'dark' ? '#0B0D11' : '#FFFFFF');
  }, [theme]);

  const toggleTheme = (event?: React.MouseEvent | MouseEvent) => {
    const newTheme = theme === 'light' ? 'dark' : 'light';

    // Support for circular reveal animation using View Transitions API
    const isShiftKey = (event as React.MouseEvent)?.shiftKey || (event as MouseEvent)?.shiftKey;
    if (!document.startViewTransition || isShiftKey) {
      setTheme(newTheme);
      return;
    }

    const { clientX: x, clientY: y } = event || { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };
    
    const transition = document.startViewTransition(() => {
      setTheme(newTheme);
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
          duration: 350,
          easing: 'ease-in-out',
          pseudoElement: theme === 'dark' ? '::view-transition-new(root)' : '::view-transition-new(root)',
        }
      );
    });
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
