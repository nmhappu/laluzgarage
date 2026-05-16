import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../contexts/ThemeContext';

export function SystemBars() {
  const { theme } = useTheme();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const setupBars = async () => {
        try {
          const isDark = theme === 'dark';
          
          // Status Bar setup (Top Bar)
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
          await StatusBar.setBackgroundColor({ color: isDark ? '#12141C' : '#F1F5F9' });
          
          // Navigation Bar setup (Bottom Bar)
          await NavigationBar.setColor({ 
            color: isDark ? '#181B24' : '#FFFFFF', 
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
