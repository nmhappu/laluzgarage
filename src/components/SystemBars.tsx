import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../contexts/ThemeContext';

import { registerPlugin } from '@capacitor/core';

interface SystemBarsPluginInterface {
  setSystemBarsStyle(options: { isDark: boolean }): Promise<void>;
}

const NativeSystemBars = registerPlugin<SystemBarsPluginInterface>('SystemBars');

export function SystemBars() {
  const { theme } = useTheme();

  useEffect(() => {
    const isDark = theme === 'dark';

    // Dynamically manage HTML meta theme-color for PWA/Chrome context
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", isDark ? '#0B0D11' : '#FFFFFF');

    if (Capacitor.isNativePlatform()) {
      const setupBars = async () => {
        try {
          // Synchronize both status bar and navigation bar icon contrast and disable scrims
          await NativeSystemBars.setSystemBarsStyle({ isDark });
        } catch {
          // Graceful fallback to standard StatusBar plugin if needed
          try {
            await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
            await StatusBar.setBackgroundColor({ color: '#00000000' });
          } catch (fallbackErr) {
            console.debug('Fallback status bar setup error:', fallbackErr);
          }
        }
      };

      setupBars();
    }
  }, [theme]);

  return null;
}
