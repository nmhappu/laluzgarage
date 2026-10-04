import { useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { useTheme } from '../contexts/ThemeContext';

interface AppSystemBarsPluginInterface {
  setSystemBarsStyle(options: { isDark: boolean }): Promise<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>;
}

const AppSystemBars = registerPlugin<AppSystemBarsPluginInterface>('AppSystemBars');

export function SystemBars() {
  const { theme } = useTheme();
  const isFirstMount = useRef(true);

  useEffect(() => {
    const isDark = theme === 'dark';

    // Dynamically manage HTML meta theme-color for PWA/Chrome context
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", isDark ? '#07080A' : '#FFFFFF');

    if (Capacitor.isNativePlatform()) {
      const setupBars = async () => {
        try {
          const insets = await AppSystemBars.setSystemBarsStyle({ isDark });
          if (insets) {
            if (typeof insets.top === 'number') {
              document.documentElement.style.setProperty('--safe-area-inset-top', `${insets.top}px`);
            }
            if (typeof insets.bottom === 'number') {
              document.documentElement.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`);
            }
            if (typeof insets.left === 'number') {
              document.documentElement.style.setProperty('--safe-area-inset-left', `${insets.left}px`);
            }
            if (typeof insets.right === 'number') {
              document.documentElement.style.setProperty('--safe-area-inset-right', `${insets.right}px`);
            }
          }
        } catch (err) {
          console.debug('AppSystemBars setup error:', err);
        }
      };

      // On initial mount execute immediately; on theme toggle delay until circular view transition completes
      const delay = isFirstMount.current ? 0 : ('startViewTransition' in document ? 750 : 0);
      isFirstMount.current = false;

      const timer = setTimeout(setupBars, delay);
      return () => clearTimeout(timer);
    }
  }, [theme]);

  return null;
}

