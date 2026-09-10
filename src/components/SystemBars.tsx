import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../contexts/ThemeContext';

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
          // Draw WebView under the Status Bar (fully transparent overlay)
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
          await StatusBar.setBackgroundColor({ color: '#00000000' });
        } catch (err) {
          console.error('Error configuring transparent system bars:', err);
        }
      };

      setupBars();
    }
  }, [theme]);

  return null;
}
