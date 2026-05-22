import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../contexts/ThemeContext';

const BAR_THEMES = {
  dark: {
    status: '#0B0D11', // Seamless background matching
    nav: '#0B0D11'    // Seamless background matching
  },
  light: {
    status: '#FFFFFF', // Seamless white background
    nav: '#FFFFFF'    // Seamless white background
  }
};

export function SystemBars() {
  const { theme } = useTheme();

  useEffect(() => {
    const isDark = theme === 'dark';
    const themeConfig = isDark ? BAR_THEMES.dark : BAR_THEMES.light;

    // Dynamically manage HTML meta theme-color for Android 15/16 chrome/pwa/webview
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", themeConfig.nav);

    if (Capacitor.isNativePlatform()) {
      const setupBars = async () => {
        try {
          // Status Bar setup (Top Bar)
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
          await StatusBar.setBackgroundColor({ color: themeConfig.status });
          
          // Navigation Bar setup (Bottom Bar)
          await NavigationBar.setColor({ 
            color: themeConfig.nav, 
            darkButtons: !isDark 
          });
        } catch (err) {
          console.error('Error configuring system bars:', err);
        }
      };

      setupBars();
    }
  }, [theme]);

  return null;
}
