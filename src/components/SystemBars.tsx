import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
// import { NavigationBar } from '@capacitor-community/navigation-bar';
import { Capacitor } from '@capacitor/core';

export function SystemBars() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const setupBars = async () => {
        try {
          // Status Bar setup
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#12141C' });
          
          // Navigation Bar setup - Plugin currently incompatible with local build env
          // await NavigationBar.setColor({ color: '#0B0D11', darkButtons: false });
        } catch (err) {
          console.error('Error configuring system bars:', err);
        }
      };

      setupBars();
    }
  }, []);

  return null;
}
