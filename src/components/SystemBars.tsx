import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../contexts/ThemeContext';

const BAR_THEMES = {
  dark: {
    status: '#12141C',
    nav: '#181B24'
  },
  light: {
    status: '#F8FAFC',
    nav: '#FFFFFF'
  }
};

export function SystemBars() {
  const { theme } = useTheme();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const setupBars = async () => {
        try {
          const isDark = theme === 'dark';
          const themeConfig = isDark ? BAR_THEMES.dark : BAR_THEMES.light;
          
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
