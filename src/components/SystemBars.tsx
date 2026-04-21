import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';
import { Capacitor } from '@capacitor/core';

export function SystemBars() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const setupBars = async () => {
        try {
          // Status Bar setup (Top Bar)
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#12141C' }); // workshop-surface
          
          // Navigation Bar setup (Bottom Bar)
          // Set color to #181B24 which is workshop-card (bottom nav color)
          await NavigationBar.setColor({ color: '#181B24', darkButtons: false });
        } catch (err) {
          console.error('Error configuring system bars:', err);
        }
      };

      setupBars();
    }
  }, []);

  return null;
}
